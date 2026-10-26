import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import BlogKabugu from "@/components/blog/BlogKabugu";
import { BlokGoster, Satir } from "@/components/blog/YaziIcerigi";
import { IconChevronRight } from "@/components/icons";
import { YAZILAR, yaziBul } from "@/lib/blog/yazilar";
import {
  blogUrl,
  duzMetin,
  jsonLd,
  kurulus,
  okumaSuresi,
  siteUrl,
  tarihYaz,
} from "@/lib/blog/site";
import { SATICI } from "@/lib/yasal";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return YAZILAR.map((y) => ({ slug: y.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const yazi = yaziBul((await params).slug);
  if (!yazi) return {};
  return {
    title: `${yazi.baslik} — ${SATICI.urun} Blog`,
    description: yazi.aciklama,
    keywords: yazi.etiketler,
    authors: [{ name: SATICI.marka, url: siteUrl() }],
    alternates: { canonical: `/blog/${yazi.slug}` },
    openGraph: {
      type: "article",
      title: yazi.baslik,
      description: yazi.aciklama,
      url: `/blog/${yazi.slug}`,
      siteName: SATICI.urun,
      locale: "tr_TR",
      publishedTime: yazi.yayin,
      modifiedTime: yazi.guncelleme,
      authors: [SATICI.marka],
      tags: yazi.etiketler,
    },
  };
}

export default async function BlogYaziPage({ params }: Props) {
  const yazi = yaziBul((await params).slug);
  if (!yazi) notFound();

  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const url = blogUrl(yazi.slug);
  const digerleri = YAZILAR.filter((y) => y.slug !== yazi.slug);

  // İşaretlenen her şey sayfada da görünüyor: kısa cevap üstteki kutuda,
  // sorular en alttaki "Sık sorulanlar" bölümünde.
  const veri = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${url}#yazi`,
        mainEntityOfPage: url,
        url,
        headline: yazi.baslik,
        description: yazi.aciklama,
        abstract: yazi.kisaCevap,
        inLanguage: "tr-TR",
        datePublished: yazi.yayin,
        dateModified: yazi.guncelleme,
        keywords: yazi.etiketler.join(", "),
        articleSection: yazi.bolumler.map((b) => b.baslik),
        author: kurulus(),
        publisher: kurulus(),
        isPartOf: { "@id": `${blogUrl()}#blog` },
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#sss`,
        mainEntity: yazi.sss.map((s) => ({
          "@type": "Question",
          name: s.soru,
          acceptedAnswer: { "@type": "Answer", text: duzMetin(s.cevap) },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Anasayfa", item: siteUrl() },
          { "@type": "ListItem", position: 2, name: "Blog", item: blogUrl() },
          { "@type": "ListItem", position: 3, name: yazi.baslik, item: url },
        ],
      },
    ],
  };

  return (
    <BlogKabugu>
      <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={jsonLd(veri)} />
      <main className="mx-auto w-full max-w-3xl px-6 pb-12 pt-28 sm:pb-16 sm:pt-32">
        <nav aria-label="Konum" className="mb-6 flex items-center gap-1.5 text-sm text-ink-muted">
          <Link href="/" className="link-underline hover:text-accent-hover">
            Anasayfa
          </Link>
          <IconChevronRight className="h-3.5 w-3.5" />
          <Link href="/blog" className="link-underline hover:text-accent-hover">
            Blog
          </Link>
        </nav>

        <article>
          <header className="space-y-4 border-b border-border pb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              {yazi.baslik}
            </h1>
            <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-muted">
              <span>
                Yazan: <span className="font-semibold text-ink">{SATICI.marka}</span>
              </span>
              <span aria-hidden>·</span>
              <span>
                Yayın: <time dateTime={yazi.yayin}>{tarihYaz(yazi.yayin)}</time>
              </span>
              {yazi.guncelleme !== yazi.yayin && (
                <>
                  <span aria-hidden>·</span>
                  <span>
                    Güncelleme: <time dateTime={yazi.guncelleme}>{tarihYaz(yazi.guncelleme)}</time>
                  </span>
                </>
              )}
              <span aria-hidden>·</span>
              <span>{okumaSuresi(yazi)} dk okuma</span>
            </p>

            <section
              aria-labelledby="kisa-cevap"
              className="rounded-2xl border border-accent/30 bg-accent-soft/50 p-5"
            >
              <h2 id="kisa-cevap" className="text-sm font-bold uppercase tracking-wide text-accent-hover">
                Kısa cevap
              </h2>
              <p className="mt-2 leading-relaxed text-ink">{yazi.kisaCevap}</p>
            </section>

            <nav aria-label="İçindekiler" className="text-sm">
              <p className="font-semibold text-ink">İçindekiler</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink-muted">
                {yazi.bolumler.map((b) => (
                  <li key={b.id}>
                    <a href={`#${b.id}`} className="link-underline hover:text-accent-hover">
                      {b.baslik}
                    </a>
                  </li>
                ))}
                <li>
                  <a href="#sik-sorulanlar" className="link-underline hover:text-accent-hover">
                    Sık sorulan sorular
                  </a>
                </li>
              </ol>
            </nav>
          </header>

          <div className="mt-10 space-y-12">
            {yazi.bolumler.map((b) => (
              <section key={b.id} id={b.id} className="scroll-mt-24 space-y-4">
                <h2 className="text-2xl font-bold tracking-tight text-ink">{b.baslik}</h2>
                {b.bloklar.map((blok, i) => (
                  <BlokGoster key={i} blok={blok} />
                ))}
              </section>
            ))}

            <section id="sik-sorulanlar" className="scroll-mt-24 space-y-4">
              <h2 className="text-2xl font-bold tracking-tight text-ink">Sık sorulan sorular</h2>
              <div className="divide-y divide-border rounded-2xl border border-border bg-card">
                {yazi.sss.map((s) => (
                  <div key={s.soru} className="p-5">
                    <h3 className="font-semibold text-ink">{s.soru}</h3>
                    <p className="mt-2 leading-relaxed text-ink-muted">
                      <Satir metin={s.cevap} />
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </article>

        <aside className="mt-12 rounded-2xl bg-ink p-6 text-paper sm:p-8">
          <p className="text-xl font-bold tracking-tight">
            Kiralık ürünlerinizi {SATICI.urun} ile takip edin
          </p>
          <p className="mt-2 text-paper/75">
            Her ürüne QR etiket, müşteriye açık müsaitlik takvimi ve tek panelden rezervasyon takibi.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/signup" className="rounded-full bg-paper px-5 py-3 font-bold text-ink">
              Hemen başla
            </Link>
            <Link href="/paketler" className="rounded-full border border-paper/30 px-5 py-3 font-bold">
              Paketleri incele
            </Link>
          </div>
        </aside>

        {digerleri.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-bold text-ink">Diğer yazılar</h2>
            <ul className="mt-4 space-y-3">
              {digerleri.map((y) => (
                <li key={y.slug}>
                  <Link href={`/blog/${y.slug}`} className="link-underline font-medium text-accent">
                    {y.baslik}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </BlogKabugu>
  );
}
