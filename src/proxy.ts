import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Her sayfa isteği için tek kullanımlık bir nonce.
 *
 * CSP'nin satır içi script'lere izin verme biçimi bu: tarayıcı yalnızca bu
 * değeri taşıyan script'i çalıştırıyor, sayfaya sonradan enjekte edilen bir
 * script değeri bilemediği için çalışmıyor. Değerin tahmin edilemez ve istek
 * başına farklı olması şart — sabit bir nonce hiç nonce olmamasıyla aynı.
 */
function makeNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

/**
 * İçerik güvenliği politikası.
 *
 * `strict-dynamic`: nonce'lu bootstrap script'inin yüklediği paketler de
 * güvenilir sayılıyor. Next'in kod bölme (code splitting) ile ürettiği onlarca
 * paketi tek tek listelemek mümkün olmazdı.
 *
 * `style-src-attr 'unsafe-inline'`: JSX'teki `style={{...}}` nitelikleri CSP
 * açısından satır içi stil sayılıyor ve arayüzün on iki dosyasında kullanılıyor
 * (grafikler, animasyonlar, marka simgesi). Nitelik enjeksiyonu script
 * enjeksiyonundan çok daha dar bir saldırı yüzeyi olduğu için bu esnetme
 * bilinçli; `style-src`'nin kendisi sıkı kalıyor.
 *
 * Geliştirmede gevşetilenler: React hata yığınlarını yeniden kurmak için `eval`
 * kullanıyor, Turbopack sıcak yenilemeyi websocket üzerinden yapıyor ve dev
 * sunucusu stilleri satır içi basıyor. Üçü de üretimde geçerli değil.
 */
function contentSecurityPolicy(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  // Tarayıcı Supabase'e doğrudan gidiyor: oturum yenileme ve ürün görseli
  // yükleme (ImageUploader) istemci tarafında çalışıyor.
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    `style-src-attr 'unsafe-inline'`,
    // blob:/data: kamera ile QR okuma ve üretilen QR görseli için.
    `img-src 'self' blob: data: ${supabase}`,
    `font-src 'self'`,
    `connect-src 'self' ${supabase}${isDev ? " ws: wss:" : ""}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");
}

/** Oturum kontrolünün gerektiği yollar. Gerisi için Supabase'e hiç gidilmiyor. */
function needsSession(pathname: string): boolean {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/yonetim") ||
    pathname === "/login" ||
    pathname === "/signup"
  );
}

export async function proxy(request: NextRequest) {
  const nonce = makeNonce();
  const csp = contentSecurityPolicy(nonce);

  // Nonce hem isteğe hem yanıta yazılıyor: Next render sırasında istek
  // başlığındaki CSP'den nonce'u okuyup kendi script etiketlerine kendisi
  // ekliyor, tarayıcı ise yanıttaki başlığa bakarak doğruluyor.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const { pathname } = request.nextUrl;

  // Herkese açık sayfalarda oturuma bakılmıyor. Eskiden matcher yalnızca panel
  // yollarını kapsadığı için bu ayrım gerekmiyordu; CSP bütün sayfalarda
  // gerektiğinden matcher genişledi, ama Supabase'e gidiş yine yalnızca
  // gerçekten gereken yollarda.
  if (!needsSession(pathname)) {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("Content-Security-Policy", csp);
    return response;
  }

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request: { headers: requestHeaders } });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // getClaims() verifies the token signature locally against a cached JWKS when
  // the project uses asymmetric signing keys, which keeps this proxy off the
  // critical path — it runs on every /admin request. It still goes through
  // getSession(), so an expired token is refreshed exactly as before.
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims ?? null;

  // Rol ve onay durumu JWT'de değil veritabanında; onları layout'lardaki
  // AccessGuard kontrol ediyor. Buradaki kapı yalnızca "oturum var mı".
  const isAdminRoute =
    pathname.startsWith("/admin") || pathname.startsWith("/yonetim");
  // Giriş ve üye ol: oturum açıkken ikisinin de yapacağı bir şey yok.
  const isAuthRoute = pathname === "/login" || pathname === "/signup";

  if (isAdminRoute && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(redirectUrl);
    redirect.headers.set("Content-Security-Policy", csp);
    return redirect;
  }

  // Kök sayfa rolüne göre doğru panele dağıtıyor; burada /admin'e sabitlersek
  // superuser önce satıcı paneline uğrayıp oradan geri sekerdi.
  if (isAuthRoute && user) {
    const redirect = NextResponse.redirect(new URL("/", request.url));
    redirect.headers.set("Content-Security-Policy", csp);
    return redirect;
  }

  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    // CSP her HTML yanıtında olmalı, o yüzden matcher artık bütün sayfaları
    // kapsıyor. Dışarıda bırakılanlar başlığa ihtiyaç duymayan istekler:
    // API uçları, Next'in statik dosyaları, görsel iyileştirici ve favicon.
    // `next/link` ön yüklemeleri de elenmiş — onlar için sayfa render
    // edilmiyor, dolayısıyla nonce da harcanmasın.
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|monitoring).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
