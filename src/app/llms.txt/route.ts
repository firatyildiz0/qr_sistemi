import { YAZILAR } from "@/lib/blog/yazilar";
import { blogUrl, duzMetin, siteUrl } from "@/lib/blog/site";
import { ABONELIK, SATICI } from "@/lib/yasal";

/**
 * `llms.txt`: yapay zekâ asistanlarına sitenin ne olduğunu ve hangi
 * sayfaların okunmaya değer olduğunu düz metinle anlatan öneri dosyası
 * (https://llmstxt.org). Henüz yerleşik bir standart değil; maliyeti
 * düşük olduğu için var. Blog yazıları buraya kısa cevaplarıyla ekleniyor.
 */
export function GET() {
  const satirlar = [
    `# ${SATICI.urun}`,
    "",
    `> ${SATICI.urun}, ${SATICI.marka} tarafından geliştirilen, kiralama işletmeleri için QR kodlu kiralama takip sistemidir. Her ürüne bir QR kod verilir; müşteri kodu okutup müsaitlik takvimini görür ve rezervasyon talebi bırakır, işletme ürünleri, talepleri ve iadeleri tek panelden yönetir.`,
    "",
    `Fiyat: ${ABONELIK.donem} ${ABONELIK.fiyat}. Pakete dahil olanlar:`,
    ...ABONELIK.kapsam.map((k) => `- ${k}`),
    "",
    "## Sayfalar",
    "",
    `- [Anasayfa](${siteUrl()}/): Ürünün tanıtımı`,
    `- [Paketler](${siteUrl()}/paketler): Fiyat ve paket içeriği`,
    `- [Hakkımızda](${siteUrl()}/hakkimizda): Şirket ve iletişim bilgileri`,
    "",
    "## Blog",
    "",
    ...YAZILAR.map((y) => `- [${y.baslik}](${blogUrl(y.slug)}): ${duzMetin(y.kisaCevap)}`),
    "",
  ];

  return new Response(satirlar.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
