import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { IYZICO_CSP_SOURCES } from "@/lib/iyzico-origins";
import { authKeyAndHeaders, ipFromHeaders } from "@/lib/supabase/forwarding";

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
function contentSecurityPolicy(
  nonce: string,
  payment: boolean,
  editor: boolean,
  auth: boolean
): string {
  const isDev = process.env.NODE_ENV === "development";
  // Tarayıcı Supabase'e doğrudan gidiyor: oturum yenileme ve ürün görseli
  // yükleme (ImageUploader) istemci tarafında çalışıyor.
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  // Ödeme ekranındaki esneme. Yalnızca /abonelik için geçerli: iyzico'nun formu
  // kendi paketini ve iframe'ini kendi alan adlarından yüklüyor, bunlar
  // `strict-dynamic` kapsamına girmiyor.
  const iyzico = payment ? IYZICO_CSP_SOURCES : "";

  // Post editöründeki esneme: stok fotoğraf aramasının küçük resimleri
  // Pexels'ten geliyor (seçilen fotoğraf kendi kovamıza kopyalanıyor) ve
  // üretilen Reels videosu blob: adresinden önizleniyor.
  const pexels = editor ? "https://images.pexels.com" : "";

  // Giriş ekranındaki esneme: hız sınırı aşılınca çıkan "robot değilim"
  // kutusu (Turnstile) Cloudflare'in çerçevesinde açılıyor. Paketi bizim
  // kodumuz eklediği için `strict-dynamic` onu zaten kapsıyor; çerçevenin
  // kendisine ayrıca izin gerekiyor.
  const turnstile = auth ? "https://challenges.cloudflare.com" : "";

  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // iyzico'nun paketi formu çizerken kendi stillerini satır içi basıyor;
    // nonce'u ona geçiremediğimiz için ödeme ekranında `unsafe-inline`
    // gerekiyor. Yalnızca o tek sayfada, ve o sayfada bizim hiç kullanıcı
    // içeriği çizilmiyor.
    `style-src 'self' ${payment || isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`} ${iyzico}`,
    `style-src-attr 'unsafe-inline'`,
    // blob:/data: kamera ile QR okuma ve üretilen QR görseli için.
    `img-src 'self' blob: data: ${supabase} ${iyzico} ${pexels}`,
    ...(editor ? [`media-src 'self' blob: ${supabase}`] : []),
    `font-src 'self' ${iyzico}`,
    `connect-src 'self' ${supabase}${isDev ? " ws: wss:" : ""} ${iyzico}`,
    // Ödeme formu ve giriş ekranındaki doğrulama kutusu bir iframe içinde
    // açılıyor; onların dışında hiçbir yerde çerçeveye izin yok.
    `frame-src ${payment ? iyzico : auth ? turnstile : "'none'"}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    // 3D Secure akışı formu bankanın/iyzico'nun sayfasına gönderiyor. Bu
    // gönderim iframe'in *içinden* olsa da bazı tarayıcılar üst sayfanın
    // politikasını uyguluyor, o yüzden ödeme ekranında iyzico'ya izin var.
    `form-action 'self' ${iyzico}`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ]
    // Esneme kapalıyken yukarıdaki şablonlar çift boşluk bırakıyor; başlığı
    // temiz tutmak için sıkıştırılıyor.
    .map((directive) => directive.replace(/\s+/g, " ").trim())
    .join("; ");
}

/**
 * Preprod ve iş önizlemeleri: Vercel'in Preview ortamında `PREPROD_KILIDI=1`.
 *
 * Kilitliyken site yalnızca onaylı superuser hesaplarına açık. Giriş sayfası
 * ve onun ihtiyaç duyduğu simgeler dışında her sayfa bu kapıdan geçiyor;
 * herkese açık anasayfa ve ürün sayfaları da. Arama motorlarına da hiç
 * gösterilmiyor.
 *
 * API uçları matcher dışında, yani bu kapıdan geçmiyor; her biri kendi oturum
 * kontrolünü yapıyor ve arkalarındaki veritabanı zaten preprod'un kendi test
 * veritabanı.
 */
const PREPROD_KILITLI = process.env.PREPROD_KILIDI === "1";

/** Kilitliyken de açık kalanlar: giriş ekranı ve sayfanın simgeleri. */
function preprodaAcik(pathname: string): boolean {
  return pathname === "/login" || /\.(png|jpe?g|svg|ico|webp|webmanifest)$/.test(pathname);
}

/** Oturumu olup superuser olmayan biri için: neden giremediğini söyleyen düz bir sayfa. */
function preprodYasak(csp: string): NextResponse {
  const response = new NextResponse(
    `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Test ortamı</title></head>` +
      `<body style="font-family:system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1.5rem;line-height:1.5;color:#1f2937">` +
      `<h1 style="font-size:1.25rem">Bu bir test ortamı</h1>` +
      `<p>Burası yalnızca yönetici hesaplarına açık. Hesabınızı kullanmak için asıl siteye gidin.</p>` +
      `</body></html>`,
    { status: 403, headers: { "content-type": "text/html; charset=utf-8" } }
  );
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

/** Oturum kontrolünün gerektiği yollar. Gerisi için Supabase'e hiç gidilmiyor. */
function needsSession(pathname: string): boolean {
  if (PREPROD_KILITLI && !preprodaAcik(pathname)) return true;
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/yonetim") ||
    // Ödeme ekranı da oturum istiyor: kimin abone olduğunu bilmeden form
    // başlatılamaz.
    pathname.startsWith("/abonelik") ||
    pathname === "/login" ||
    pathname === "/signup"
  );
}

export async function proxy(request: NextRequest) {
  const nonce = makeNonce();
  // CSP'nin iyzico esnemesi yalnızca ödeme ekranında. Yolu burada ölçmek,
  // esnemenin başka bir sayfaya sızmasını imkânsız kılıyor.
  const csp = contentSecurityPolicy(
    nonce,
    request.nextUrl.pathname.startsWith("/abonelik"),
    request.nextUrl.pathname === "/yonetim/post-editoru",
    request.nextUrl.pathname === "/login"
  );

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
    if (PREPROD_KILITLI) response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  // Oturum yenileme de Supabase'in giriş kotasından düşüyor; ziyaretçinin
  // IP'si iletilmezse bütün kullanıcılar Vercel'in adresinden tek kotayı
  // paylaşıyor (bkz. lib/supabase/forwarding.ts). Bu istemci yalnızca
  // getClaims() için; tabloya gitmiyor.
  const { key, headers: forwarded } = authKeyAndHeaders(ipFromHeaders(request.headers));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    {
      global: { headers: forwarded },
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

  if (PREPROD_KILITLI && !preprodaAcik(pathname)) {
    if (!user) {
      const redirectUrl = new URL("/login", request.url);
      if (pathname !== "/") redirectUrl.searchParams.set("next", pathname);
      const redirect = NextResponse.redirect(redirectUrl);
      redirect.headers.set("Content-Security-Policy", csp);
      redirect.headers.set("X-Robots-Tag", "noindex, nofollow");
      return redirect;
    }

    // Rol JWT'de değil, veritabanında. Satır sahibine açık (bkz. 0011), yani
    // kullanıcının kendi oturumuyla okunabiliyor.
    const { data: profil } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.sub)
      .maybeSingle();
    if (profil?.role !== "superuser" || profil.status !== "approved") {
      return preprodYasak(csp);
    }
  }

  // Rol ve onay durumu JWT'de değil veritabanında; onları layout'lardaki
  // AccessGuard kontrol ediyor. Buradaki kapı yalnızca "oturum var mı".
  const isAdminRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/yonetim") ||
    // Ödeme ekranı da oturum arkasında: `/abonelik/tamamlandi` hariç, çünkü
    // ödeme dönüşünde tarayıcı üçüncü taraf bağlamından geliyor ve oturum
    // çerezi gönderilmeyebilir — o uç kimliği token'dan çözüyor.
    (pathname.startsWith("/abonelik") && pathname !== "/abonelik/tamamlandi");
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
  if (PREPROD_KILITLI) response.headers.set("X-Robots-Tag", "noindex, nofollow");
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
