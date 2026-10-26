import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import BlogKabugu from "@/components/blog/BlogKabugu";
import { YAZILAR } from "@/lib/blog/yazilar";
import { blogUrl, jsonLd, kurulus, okumaSuresi, siteUrl, tarihYaz } from "@/lib/blog/site";
import { SATICI } from "@/lib/yasal";

const BASLIK = `Blog — ${SATICI.urun}`;
const ACIKLAMA =
  "Kiralama işletmeleri için rehberler: QR kodlu takip, çift rezervasyonu önleme, etiketleme ve müsaitlik yönetimi.";

export const metadata: Metadata = {
  title: BASLIK,
  description: ACIKLAMA,
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    title: BASLIK,
    description: ACIKLAMA,
    url: "/blog",
    siteName: SATICI.urun,
    locale: "tr_TR",
  },
};

export default async function BlogPage() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  const veri = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Blog",
        "@id": `${blogUrl()}#blog`,
        url: blogUrl(),
        name: BASLIK,
        description: ACIKLAMA,
        inLanguage: "tr-TR",
        publisher: kurulus(),
        blogPost: YAZILAR.map((y) => ({
          "@type": "BlogPosting",
          headline: y.baslik,
          description: y.aciklama,
          url: blogUrl(y.slug),
          datePublished: y.yayin,
          dateModified: y.guncelleme,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Anasayfa", item: siteUrl() },
          { "@type": "ListItem", position: 2, name: "Blog", item: blogUrl() },
        ],
      },
    ],
  };

  return (
    <BlogKabugu>
      <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={jsonLd(veri)} />
      <main className="mx-auto w-full max-w-4xl px-6 pb-12 pt-28 sm:pb-16 sm:pt-32">
        <header className="space-y-3 border-b border-border pb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">Blog</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Kiralama işletmeleri için rehberler
          </h1>
          <p className="max-w-2xl text-ink-muted">{ACIKLAMA}</p>
        </header>

        <ul className="mt-10 grid gap-5">
          {YAZILAR.map((y) => (
            <li key={y.slug}>
              <article className="group relative rounded-2xl border border-border bg-card p-6 transition-colors hover:border-accent">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
                  <time dateTime={y.yayin}>{tarihYaz(y.yayin)}</time>
                  <span aria-hidden>·</span>
                  <span>{okumaSuresi(y)} dk okuma</span>
                  {y.etiketler.map((e) => (
                    <span key={e} className="pill pill-muted">
                      {e}
                    </span>
                  ))}
                </div>
                <h2 className="mt-3 text-xl font-bold tracking-tight text-ink group-hover:text-accent-hover">
                  <Link href={`/blog/${y.slug}`} className="after:absolute after:inset-0">
                    {y.baslik}
                  </Link>
                </h2>
                <p className="mt-2 leading-relaxed text-ink-muted">{y.aciklama}</p>
              </article>
            </li>
          ))}
        </ul>
      </main>
    </BlogKabugu>
  );
}
