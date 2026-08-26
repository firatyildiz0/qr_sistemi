"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Artwork, { type Motif, type Tone } from "./Artwork";
import { applyPreferences, readPreferences, savePreferences } from "@/lib/preferences";
import s from "./labs.module.css";

/**
 * Veyro Labs — sitenin ana sayfası.
 *
 * Vitrin mantığı: üstte dönen öne çıkanlar, altında kategorilere ayrılmış
 * hizmet kartları, sonra üç adımlık anlatım ve başlangıç bandı. Hepsi tek
 * hesapla açılan hizmetleri gösteriyor; henüz açılmamış olanların düğmesi yok,
 * "Yolda" diye duruyor — tıklanacak bir yer olmadığı için bağlantı da yok.
 */

type Kategori = "all" | "kirala" | "yonet" | "etiketle";
type Durum = "live" | "soon";

type Hizmet = {
  ad: string;
  ton: Tone;
  motif: Motif;
  kategori: Exclude<Kategori, "all">;
  durum: Durum;
  aciklama: string;
  href?: string;
  cta?: string;
  rozet?: string;
};

const KATEGORILER: { id: Kategori; ad: string }[] = [
  { id: "all", ad: "Tümü" },
  { id: "kirala", ad: "Kirala" },
  { id: "yonet", ad: "Yönet" },
  { id: "etiketle", ad: "Etiketle" },
];

function Ok() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8h9M8.5 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Açık ve koyu tema arasında geçiş.
 *
 * Tercih panelinkiyle aynı çerezde tutuluyor: ana sayfada koyuya geçen ziyaretçi
 * hesap açıp panele girdiğinde onu da koyu buluyor. Ayarlar'daki "sistem"
 * seçeneği burada bilerek yok — vitrinde bir düğme, üç durum değil; sistemi
 * takip etmek isteyen Ayarlar'dan geri seçebiliyor.
 */
function TemaDugmesi() {
  function degistir() {
    const tercihler = readPreferences();
    // Hangi temada olduğumuzu React değil <html> biliyor: değeri ön-boyama
    // script'i yazıyor ve "sistem" tercihinde işletim sistemine bakıyor.
    const suAn = document.documentElement.getAttribute("data-theme");
    const guncel = { ...tercihler, theme: suAn === "dark" ? ("light" as const) : ("dark" as const) };

    savePreferences(guncel);
    applyPreferences(guncel, window.matchMedia("(prefers-color-scheme: dark)").matches);
  }

  return (
    <button type="button" className={s.themeBtn} onClick={degistir} aria-label="Açık ve koyu tema arasında geçiş yap">
      <svg className={s.moon} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M20 14.2A8.4 8.4 0 0 1 9.8 4 8.5 8.5 0 1 0 20 14.2z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
      <svg className={s.sun} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

function Marka() {
  return (
    <span className={s.brand}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="1.5" y="1.5" width="8" height="8" rx="2.4" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="14.5" y="1.5" width="8" height="8" rx="2.4" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="1.5" y="14.5" width="8" height="8" rx="2.4" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="14.5" y="14.5" width="3.8" height="3.8" rx="1.2" fill="var(--l-accent)" />
        <rect x="18.7" y="18.7" width="3.8" height="3.8" rx="1.2" fill="var(--l-accent)" />
      </svg>
      Veyro <span>Labs</span>
    </span>
  );
}

/** Görünür olunca bir kez yükselen sarmalayıcı. */
function Rise({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [görünür, setGörünür] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setGörünür(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`${s.rise} ${görünür ? s.riseIn : ""} ${className ?? ""}`}>
      {children}
    </div>
  );
}

export default function VeyroLabs({ panelHref, oturumAcik }: { panelHref: string; oturumAcik: boolean }) {
  const hizmetler: Hizmet[] = [
    {
      ad: "Kiralama",
      ton: "yosun",
      motif: "qr",
      kategori: "kirala",
      durum: "live",
      rozet: "Ana hizmet",
      aciklama: "Ürüne yapıştırdığınız kodu okutan kişi müsait günleri görür, tarih seçer ve rezervasyonunu bırakır.",
      href: panelHref,
      cta: oturumAcik ? "Panele git" : "Hemen dene",
    },
    {
      ad: "Rezervasyonlar",
      ton: "denizci",
      motif: "takvim",
      kategori: "kirala",
      durum: "live",
      aciklama: "Yaklaşan, süren ve biten kiralamalar tek listede. Çakışan tarih daha kaydedilmeden engellenir.",
      href: "/admin",
      cta: "Hemen dene",
    },
    {
      ad: "Ürün ve envanter",
      ton: "mor",
      motif: "kup",
      kategori: "yonet",
      durum: "live",
      aciklama: "Hangi ürün kimde, nerede, ne zamandan beri. Kiralama geçmişi ürünün kendi kartında durur.",
      href: "/admin/products",
      cta: "Hemen dene",
    },
    {
      ad: "QR etiketleri",
      ton: "kil",
      motif: "etiket",
      kategori: "etiketle",
      durum: "live",
      aciklama: "Her ürün için baskıya hazır kod. PNG ya da SVG indirin, yazdırın, ürünün üstüne yapıştırın.",
      href: "/admin/products",
      cta: "Hemen dene",
    },
    {
      ad: "İade hatırlatmaları",
      ton: "gul",
      motif: "dalga",
      kategori: "yonet",
      durum: "live",
      aciklama: "İade günü yaklaşan kiralamalar her sabah işaretlenir; panelin zil simgesinde birikir.",
      href: "/admin/notifications",
      cta: "Hemen dene",
    },
    {
      ad: "Barkodla arama",
      ton: "turkuaz",
      motif: "kopru",
      kategori: "etiketle",
      durum: "live",
      aciklama: "Elinizdeki barkodlu stoğu baştan etiketlemeyin. Barkodu okutun, ürün listede karşınıza çıksın.",
      href: "/admin/products",
      cta: "Hemen dene",
    },
    {
      ad: "Görsel tanıma",
      ton: "mor",
      motif: "vizor",
      kategori: "etiketle",
      durum: "soon",
      aciklama: "Etiketi yıpranmış ürünü kameraya gösterin, hangisi olduğunu bulsun. Model telefonda çalışır.",
    },
    {
      ad: "Raporlar",
      ton: "denizci",
      motif: "grafik",
      kategori: "yonet",
      durum: "live",
      aciklama: "Son otuz günün rezervasyon eğilimi, ürün sayınız ve doluluğunuz tek ekranda.",
      href: "/admin/dashboard",
      cta: "Hemen dene",
    },
    {
      ad: "Depozito",
      ton: "turkuaz",
      motif: "para",
      kategori: "kirala",
      durum: "soon",
      aciklama: "Teslimde bloke edilen, iadede kendiliğinden çözülen depozito. Hasar varsa kısmi kesinti.",
    },
  ];

  const oneCikanlar = [
    {
      ad: "Kiralama",
      etiket: "Ana hizmet",
      ton: "yosun" as Tone,
      motif: "qr" as Motif,
      sekme: "Okut, tarih seç, rezerve et",
      metin:
        "Ürüne yapıştırdığınız kodu okutan kişi müsait günleri görür, tarih seçer ve rezervasyonunu bırakır. Uygulama indirmesi gerekmez.",
      href: panelHref,
      cta: oturumAcik ? "Panele git" : "Hemen dene",
    },
    {
      ad: "QR etiketleri",
      etiket: "Etiketle",
      ton: "kil" as Tone,
      motif: "etiket" as Motif,
      sekme: "Baskıya hazır kod, her ürüne",
      metin:
        "Eklediğiniz her ürün için kod kendiliğinden üretilir. PNG ya da SVG indirin, yazdırın, ürünün üstünde kalsın.",
      href: "/admin/products",
      cta: "Hemen dene",
    },
    {
      ad: "Rezervasyonlar",
      etiket: "Kirala",
      ton: "denizci" as Tone,
      motif: "takvim" as Motif,
      sekme: "Yaklaşan ve süren kiralamalar",
      metin:
        "Yaklaşan, süren ve biten kiralamalar tek listede. Boş günleri görün, çakışan tarihi daha kaydedilmeden yakalayın.",
      href: "/admin",
      cta: "Hemen dene",
    },
    {
      ad: "Ürün ve envanter",
      etiket: "Yönet",
      ton: "mor" as Tone,
      motif: "kup" as Motif,
      sekme: "Hangi ürün kimde, nerede",
      metin:
        "Ürünlerinizi ayrıntısı ve fiyatıyla kaydedin; kiralama geçmişi, müşteri bilgisi ve iade tarihi ürünün kartında toplansın.",
      href: "/admin/products",
      cta: "Hemen dene",
    },
  ];

  const adimlar = [
    {
      n: "Adım 01",
      ad: "Ürünü ekleyin",
      metin: "Fotoğrafı, açıklaması ve günlük fiyatıyla panele kaydedin.",
      ton: "mor" as Tone,
      motif: "kup" as Motif,
    },
    {
      n: "Adım 02",
      ad: "Kodu yapıştırın",
      metin: "Ürün için üretilen QR kodunu yazdırıp fiziksel ürünün üstüne yapıştırın.",
      ton: "kil" as Tone,
      motif: "qr" as Motif,
    },
    {
      n: "Adım 03",
      ad: "Rezervasyonu alın",
      metin: "Kodu okutan kişi müsait günleri görür ve rezervasyonunu bırakır.",
      ton: "yosun" as Tone,
      motif: "takvim" as Motif,
    },
  ];

  const [kategori, setKategori] = useState<Kategori>("all");
  const [aktif, setAktif] = useState(0);
  const [duraklat, setDuraklat] = useState(false);

  // Karusel kendi kendine ilerliyor; fare üstündeyken ve hareket tercihi
  // kısıtlıyken duruyor.
  useEffect(() => {
    if (duraklat) return;
    if (typeof window !== "undefined") {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (document.documentElement.dataset.motion === "reduced") return;
    }
    const t = setInterval(() => setAktif((i) => (i + 1) % oneCikanlar.length), 7000);
    return () => clearInterval(t);
  }, [duraklat, oneCikanlar.length]);

  const görünenler = hizmetler.filter((h) => kategori === "all" || h.kategori === kategori);

  return (
    <div className={s.page}>
      <nav className={s.nav}>
        <div className={`${s.wrap} ${s.navIn}`}>
          <Link href="/" aria-label="Veyro Labs ana sayfa">
            <Marka />
          </Link>
          <div className={s.navMid}>
            <a href="#hizmetler">Hizmetler</a>
            <a href="#nasil">Nasıl çalışır</a>
            <a href="#basla">Başlayın</a>
          </div>
          <div className={s.navEnd}>
            <TemaDugmesi />
            {!oturumAcik && (
              <Link className={`${s.pill} ${s.pillLine}`} href="/login">
                Giriş yap
              </Link>
            )}
            <Link className={`${s.pill} ${s.pillSolid}`} href={oturumAcik ? panelHref : "/signup"}>
              {oturumAcik ? "Panele gir" : "Ücretsiz başla"}
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* Öne çıkanlar */}
        <section className={s.feature}>
          <div className={s.wrap}>
            <div
              className={s.stage}
              onMouseEnter={() => setDuraklat(true)}
              onMouseLeave={() => setDuraklat(false)}
            >
              {oneCikanlar.map((f, i) => (
                <article key={f.ad} className={`${s.slide} ${i === aktif ? s.slideOn : ""}`} aria-hidden={i !== aktif}>
                  <div className={s.art}>
                    <Artwork tone={f.ton} motif={f.motif} width={1200} height={620} />
                  </div>
                  <div className={s.slideCopy}>
                    <span className={s.slideTag}>{f.etiket}</span>
                    <h2>{f.ad}</h2>
                    <p>{f.metin}</p>
                    <Link className={`${s.pill} ${s.pillWhite}`} href={f.href} tabIndex={i === aktif ? 0 : -1}>
                      {f.cta}
                      <Ok />
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            <div className={s.tabs} role="tablist" aria-label="Öne çıkan hizmetler">
              {oneCikanlar.map((f, i) => (
                <button
                  key={f.ad}
                  type="button"
                  role="tab"
                  aria-selected={i === aktif}
                  className={`${s.tab} ${i === aktif ? s.tabOn : ""}`}
                  onClick={() => setAktif(i)}
                >
                  <i className={s.bar} key={`${i}-${aktif}`} />
                  <b>{f.ad}</b>
                  <span>{f.sekme}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Hizmetler */}
        <section className={s.sec} id="hizmetler">
          <div className={s.wrap}>
            <Rise>
              <div className={s.secTop}>
                <div>
                  <h2>Hizmetlerimiz</h2>
                  <p>
                    Geliştirdiğimiz her aracı burada bulursunuz. Hepsi tek hesapla açılır ve aynı ürün listesini
                    paylaşır.
                  </p>
                </div>
              </div>
              <div className={s.cats} role="group" aria-label="Kategoriler">
                {KATEGORILER.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    className={`${s.cat} ${kategori === k.id ? s.catOn : ""}`}
                    aria-pressed={kategori === k.id}
                    onClick={() => setKategori(k.id)}
                  >
                    {k.ad}
                  </button>
                ))}
              </div>
            </Rise>

            <div className={s.grid}>
              {görünenler.map((h) => (
                <Rise key={h.ad}>
                  <article className={s.exp}>
                    {h.href ? (
                      <Link className={s.thumb} href={h.href} tabIndex={-1} aria-hidden="true">
                        {h.rozet && <span className={s.badge}>{h.rozet}</span>}
                        <span className={s.art}>
                          <Artwork tone={h.ton} motif={h.motif} />
                        </span>
                      </Link>
                    ) : (
                      <span className={s.thumb} aria-hidden="true">
                        <span className={s.art}>
                          <Artwork tone={h.ton} motif={h.motif} />
                        </span>
                      </span>
                    )}
                    <div className={s.expHead}>
                      <h3>{h.ad}</h3>
                      <span className={`${s.state} ${h.durum === "soon" ? s.stateSoon : ""}`}>
                        <i />
                        {h.durum === "live" ? "Yayında" : "Yolda"}
                      </span>
                    </div>
                    <p>{h.aciklama}</p>
                    <div className={s.actions}>
                      {h.href ? (
                        <Link className={`${s.pill} ${s.pillSolid}`} href={h.href}>
                          {h.cta}
                        </Link>
                      ) : (
                        <span className={s.later}>Üzerinde çalışıyoruz.</span>
                      )}
                    </div>
                  </article>
                </Rise>
              ))}
            </div>
          </div>
        </section>

        {/* Nasıl çalışır */}
        <section className={s.sec} id="nasil">
          <div className={s.wrap}>
            <Rise>
              <div className={s.secTop}>
                <div>
                  <h2>Nasıl çalışır</h2>
                  <p>Üç adım. Kiracının uygulama indirmesine, hesap açmasına gerek yok.</p>
                </div>
              </div>
            </Rise>
            <Rise>
              <div className={s.steps}>
                {adimlar.map((a) => (
                  <article key={a.n} className={s.step}>
                    <span className={s.art}>
                      <Artwork tone={a.ton} motif={a.motif} width={600} height={500} />
                    </span>
                    <span className={s.stepN}>{a.n}</span>
                    <h3>{a.ad}</h3>
                    <p>{a.metin}</p>
                  </article>
                ))}
              </div>
            </Rise>
          </div>
        </section>

        {/* Başlangıç */}
        <section className={s.sec} id="basla">
          <div className={s.wrap}>
            <Rise>
              <div className={s.connect}>
                <div className={s.panel}>
                  <h3>İlk etiketiniz beş dakikada hazır</h3>
                  <p>
                    Hesabınızı açın, ilk ürününüzü ekleyin, kodunu yazdırın. Kurulum yok, indirilecek uygulama yok.
                  </p>
                  <div className={s.panelActions}>
                    <Link className={`${s.pill} ${s.pillSolid}`} href={oturumAcik ? panelHref : "/signup"}>
                      {oturumAcik ? "Panele gir" : "Ücretsiz başla"}
                      <Ok />
                    </Link>
                    {!oturumAcik && (
                      <Link className={`${s.pill} ${s.pillLine}`} href="/login">
                        Hesabım var
                      </Link>
                    )}
                  </div>
                </div>
                <div className={`${s.panel} ${s.dark}`}>
                  <span className={s.art}>
                    <Artwork tone="yosun" motif="dalga" width={600} height={400} />
                  </span>
                  <h3>Bir hizmet mi eksik?</h3>
                  <p>Sahada karşılaştığınız işi anlatın; sıradaki hizmetlerin çoğu böyle ortaya çıktı.</p>
                  <Link className={`${s.pill} ${s.pillWhite}`} href="/admin/support">
                    Görüşünüzü yazın
                    <Ok />
                  </Link>
                </div>
              </div>
            </Rise>
          </div>
        </section>
      </main>

      <footer className={s.footer}>
        <div className={`${s.wrap} ${s.foot}`}>
          <div className={s.footBrand}>
            <Marka />
            <p>Fiziksel eşyayı kiralanabilir, takip edilebilir ve iade edilebilir hale getiren araçlar.</p>
          </div>
          <div>
            <h4>Hizmetler</h4>
            <Link href={panelHref}>Kiralama</Link>
            <Link href="/admin">Rezervasyonlar</Link>
            <Link href="/admin/products">Ürün ve envanter</Link>
            <Link href="/admin/notifications">İade hatırlatmaları</Link>
          </div>
          <div>
            <h4>Hesap</h4>
            {oturumAcik ? (
              <Link href={panelHref}>Panelim</Link>
            ) : (
              <>
                <Link href="/login">Giriş yap</Link>
                <Link href="/signup">Kayıt ol</Link>
              </>
            )}
            <Link href="/admin/support">Destek</Link>
          </div>
        </div>
        <div className={`${s.wrap} ${s.footBottom}`}>
          <span>© {new Date().getFullYear()} Veyro</span>
          <span>Türkiye&apos;de geliştirildi</span>
        </div>
      </footer>
    </div>
  );
}
