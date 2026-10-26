import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/blog/site";

/** Panel, yönetim ve API uçları dışında her şey taranabilir. */
const KAPALI = ["/admin", "/yonetim", "/api", "/abonelik", "/talep"];

/**
 * Yapay zekâ asistanlarının tarayıcıları da açıkça izinli: blog yazılarının
 * ChatGPT, Claude, Perplexity ve Gemini cevaplarında kaynak gösterilebilmesi
 * için sayfaları okuyabilmeleri gerekiyor. Varsayılan kural da onlara izin
 * veriyor; ayrı satırlar, ileride biri kapatılmak istenirse yerini belli etsin.
 */
const YAPAY_ZEKA = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: KAPALI },
      { userAgent: YAPAY_ZEKA, allow: "/", disallow: KAPALI },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
