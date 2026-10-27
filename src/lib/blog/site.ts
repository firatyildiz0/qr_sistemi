import { SATICI } from "@/lib/yasal";
import type { Yazi } from "@/lib/blog/tipler";

/** Sitenin kök adresi, sonda eğik çizgi olmadan. */
export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export const blogUrl = (slug?: string) => `${siteUrl()}/blog${slug ? `/${slug}` : ""}`;

/** "2026-10-26" → "26 Ekim 2026". */
export function tarihYaz(iso: string) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`)
  );
}

/** Satır içi biçimlerden arındırılmış düz metin: JSON-LD ve llms.txt için. */
export function duzMetin(metin: string) {
  return metin.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\[(.+?)\]\((.+?)\)/g, "$1");
}

/** Dakika cinsinden okuma süresi, dakikada ~200 kelimeyle. */
export function okumaSuresi(yazi: Yazi) {
  const metinler = [
    yazi.kisaCevap,
    ...yazi.bolumler.flatMap((b) =>
      b.bloklar.flatMap((blok) => {
        switch (blok.tur) {
          case "paragraf":
            return [blok.metin];
          case "liste":
            return blok.maddeler;
          case "adimlar":
            return blok.adimlar.flatMap((a) => [a.baslik, a.metin]);
          case "tablo":
            return blok.satirlar.flat();
        }
      })
    ),
    ...yazi.sss.flatMap((s) => [s.soru, s.cevap]),
  ];
  const kelime = metinler.join(" ").split(/\s+/).length;
  return Math.max(1, Math.round(kelime / 200));
}

/** Yazarı ve yayıncıyı tanımlayan kuruluş; her sayfada aynı `@id`. */
export function kurulus() {
  return {
    "@type": "Organization",
    "@id": `${siteUrl()}/#kurulus`,
    name: SATICI.marka,
    url: siteUrl(),
    logo: `${siteUrl()}/icon.png`,
    email: SATICI.eposta,
  };
}

/**
 * JSON-LD'yi `<script>` içine güvenle gömer: metindeki `<` kaçırılıyor ki
 * bir yazıdaki "</script>" etiketi kapatmasın.
 */
export function jsonLd(veri: unknown) {
  return { __html: JSON.stringify(veri).replace(/</g, "\\u003c") };
}
