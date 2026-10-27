import type { MetadataRoute } from "next";
import { YAZILAR } from "@/lib/blog/yazilar";
import { blogUrl, siteUrl } from "@/lib/blog/site";
import { YASAL_SAYFALAR } from "@/lib/yasal";

/** Tanıtım, blog ve yasal sayfalar; satıcıların ürün sayfaları burada listelenmiyor. */
export default function sitemap(): MetadataRoute.Sitemap {
  const enYeni = YAZILAR.map((y) => y.guncelleme).sort().at(-1);

  return [
    { url: siteUrl(), changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl()}/paketler`, changeFrequency: "monthly", priority: 0.8 },
    { url: blogUrl(), lastModified: enYeni, changeFrequency: "weekly", priority: 0.8 },
    ...YAZILAR.map((y) => ({
      url: blogUrl(y.slug),
      lastModified: y.guncelleme,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...YASAL_SAYFALAR.map((s) => ({
      url: `${siteUrl()}${s.href}`,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
