import { NextResponse, type NextRequest } from "next/server";
import { editorKullanicisi } from "@/lib/post-editoru/erisim";
import { editorSayfasi } from "@/lib/post-editoru/sayfa";

/**
 * RentQR'ın Instagram postlarını hazırladığı editör. Bir sayfa (page.tsx)
 * değil, rota: editör tam ekran kendi arayüzünü çiziyor, yönetim panelinin
 * çerçevesine girmiyor. Oturum kontrolünü proxy zaten yaptı; rol burada.
 */
export async function GET(req: NextRequest) {
  const me = await editorKullanicisi();
  if (!me) return NextResponse.redirect(new URL("/", req.url));

  // proxy her isteğe yeni bir nonce yazıyor ve CSP'yi ona göre kuruyor
  const nonce = req.headers.get("x-nonce") ?? "";
  return new NextResponse(editorSayfasi(nonce), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
