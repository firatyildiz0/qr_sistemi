"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { applyPreferences, readPreferences, savePreferences } from "@/lib/preferences";
import s from "./labs.module.css";

/**
 * Veyro Labs — sitenin hizmet vitrini.
 *
 * Sayfa aşağı kaydırıldıkça anlatıyor: açılış sahnesi, sayılar, dört sözlük
 * yapışkan panel, kiracının gördüğü ekranın adım adım değiştiği akış, öne çıkan
 * üç hizmet ve kalanların listesi.
 *
 * Görsel olarak tek bir dosya yüklenmiyor. Sahneler katmanlı gradyan; içerikte
 * piktogram yerine ürünün kendi arayüzü duruyor — gerçek takvim, gerçek fiyat,
 * gerçek rezervasyon listesi. Vitrinde satılan şey o ekran olduğu için
 * gösterilen de o ekran; ayrıca ürünlerin fotoğrafı satıcıdan satıcıya
 * değişiyor, vitrinin görseli değişmemeli.
 *
 * Kaydırmaya bağlı her şey tek bir `requestAnimationFrame` döngüsünde ve
 * yalnızca `transform`/`opacity` üzerinden yürüyor; sayfa düzeni yeniden
 * hesaplanmıyor. Hareket tercihi kapalıysa (`prefers-reduced-motion` ya da
 * Ayarlar'daki seçim) hepsi son hâllerinde duruyor.
 */

type Durum = "live" | "soon";

type MiniHizmet = {
  ad: string;
  gok: string;
  durum: Durum;
  aciklama: string;
  href: string;
};

const KAPAT = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const ARADEGER = (a: number, b: number, t: number) => a + (b - a) * t;
const YUMUSAT = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** Sözlerin arkasındaki gökyüzü: her söz kendi gün batımına geçiyor. */
const SOZ_TONLARI = [
  "radial-gradient(62% 50% at 18% 22%, #ff2d95 0%, rgba(255,45,149,0) 62%), radial-gradient(66% 54% at 86% 82%, #ffc531 0%, rgba(255,197,49,0) 60%), linear-gradient(150deg, #3a0f4e 0%, #6b1c63 54%, #24092f 100%)",
  "radial-gradient(62% 50% at 82% 20%, #00d9c4 0%, rgba(0,217,196,0) 62%), radial-gradient(66% 54% at 14% 84%, #7b3ff2 0%, rgba(123,63,242,0) 60%), linear-gradient(150deg, #14134a 0%, #145e7e 54%, #0b0a28 100%)",
  "radial-gradient(62% 50% at 20% 80%, #ff7a1a 0%, rgba(255,122,26,0) 62%), radial-gradient(66% 54% at 84% 18%, #ff2d95 0%, rgba(255,45,149,0) 60%), linear-gradient(150deg, #4a1030 0%, #a32e52 54%, #2a0b22 100%)",
  "radial-gradient(62% 50% at 50% 18%, #ffc531 0%, rgba(255,197,49,0) 60%), radial-gradient(70% 56% at 20% 88%, #00d9c4 0%, rgba(0,217,196,0) 62%), linear-gradient(150deg, #16324a 0%, #1e7a6e 52%, #0a1c26 100%)",
];

const SOZLER = [
  { ad: "Yapıştır", metin: "Ürünü panele ekleyin; kodu kendiliğinden üretilsin. Yazdırın, üstüne yapıştırın. Bir kez yapılır." },
  { ad: "Okut", metin: "Kiracı telefonunun kamerasını tutar. Uygulama indirmek, hesap açmak, form doldurmak yok." },
  { ad: "Rezerve et", metin: "Boş günler karşısına çıkar, dolu günler kapalıdır. Çakışan tarih daha kaydedilmeden engellenir." },
  { ad: "Geri al", metin: "İade günü yaklaşınca hatırlatılır. Ürün listeye döner, geçmişi kartında kalır." },
];

/**
 * Okunur bir QR iskeleti.
 *
 * Gerçek bir kod değil — tarandığında bir yere gitmiyor — ama gerçeğinin
 * geometrisini taşıyor: 21×21 ızgara ve üç konum işareti. Gövde deseni sabit
 * bir üreteçten geliyor, çünkü her boyamada değişen bir desen hem dikkat
 * dağıtır hem de sunucu ile istemci çıktısını ayırıp hidrasyonu bozardı.
 */
function qrDeseni(): boolean[][] {
  const n = 21;
  const harita: boolean[][] = Array.from({ length: n }, () => Array<boolean>(n).fill(false));

  const goz = (ox: number, oy: number) => {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const kenar = y === 0 || y === 6 || x === 0 || x === 6;
        const ic = y >= 2 && y <= 4 && x >= 2 && x <= 4;
        harita[oy + y][ox + x] = kenar || ic;
      }
    }
  };
  goz(0, 0);
  goz(n - 7, 0);
  goz(0, n - 7);

  let tohum = 0x2f6e1b;
  const sonraki = () => {
    tohum = (tohum * 1103515245 + 12345) & 0x7fffffff;
    return tohum / 0x7fffffff;
  };
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const gozde = (y < 8 && x < 8) || (y < 8 && x > n - 9) || (y > n - 9 && x < 8);
      if (!gozde) harita[y][x] = sonraki() > 0.52;
    }
  }
  return harita;
}

function Qr({ zemin }: { zemin?: string }) {
  const harita = useMemo(() => qrDeseni(), []);
  const n = harita.length;
  const hucre = 100 / n;

  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      {zemin && <rect width="100" height="100" rx="6" fill={zemin} />}
      <g fill="#14060f">
        {harita.flatMap((satir, y) =>
          satir.map((dolu, x) =>
            dolu ? (
              <rect
                key={`${x}-${y}`}
                x={x * hucre}
                y={y * hucre}
                width={hucre + 0.1}
                height={hucre + 0.1}
                rx={hucre * 0.22}
              />
            ) : null,
          ),
        )}
      </g>
    </svg>
  );
}

/** Gerçek bir ayın günleri: dolu günler kapalı, seçili aralık vurgulu. */
function TakvimIzgarasi({
  bosluk,
  adet,
  dolular,
  secililer,
}: {
  bosluk: number;
  adet: number;
  dolular: number[];
  secililer: number[];
}) {
  return (
    <div className={s.gunler}>
      {Array.from({ length: bosluk }, (_, i) => (
        <b key={`bos-${i}`} className={s.gunBos} />
      ))}
      {Array.from({ length: adet }, (_, i) => {
        const gun = i + 1;
        const sinif = dolular.includes(gun) ? s.gunDolu : secililer.includes(gun) ? s.gunSecili : "";
        return (
          <b key={gun} className={sinif}>
            {gun}
          </b>
        );
      })}
    </div>
  );
}

function Konum({ children }: { children: React.ReactNode }) {
  return (
    <span className={s.yer}>
      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 14.5s5-4.4 5-8a5 5 0 1 0-10 0c0 3.6 5 8 5 8z" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="8" cy="6.4" r="1.8" fill="currentColor" />
      </svg>
      {children}
    </span>
  );
}

function Tik({ renk }: { renk: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8.4 6.3 11.7 13 5" stroke={renk} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Son otuz günün rezervasyon eğilimi — panelin kendi grafiğinin vitrin hâli. */
function RaporGrafigi() {
  const veri = [9, 12, 8, 14, 11, 17, 15, 21, 18, 24, 22, 29, 26, 33, 31, 38];
  const g = 320;
  const y = 108;
  const enB = Math.max(...veri);
  const nx = (i: number) => (i / (veri.length - 1)) * (g - 10) + 5;
  const ny = (d: number) => y - 12 - (d / enB) * (y - 26);
  const yol = veri.map((d, i) => `${i ? "L" : "M"}${nx(i).toFixed(1)} ${ny(d).toFixed(1)}`).join(" ");
  const sonX = nx(veri.length - 1);
  const sonY = ny(veri[veri.length - 1]);

  return (
    <svg viewBox="0 0 320 108" aria-hidden="true">
      <defs>
        <linearGradient id="veyroRaporAlan" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00d9c4" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#00d9c4" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g stroke="currentColor" opacity="0.14" strokeWidth="1">
        <line x1="5" y1={ny(enB)} x2="315" y2={ny(enB)} />
        <line x1="5" y1={ny(enB / 2)} x2="315" y2={ny(enB / 2)} />
      </g>
      <path d={`${yol} L${sonX.toFixed(1)} ${y - 12} L5 ${y - 12} Z`} fill="url(#veyroRaporAlan)" />
      <path d={yol} fill="none" stroke="#00b8a6" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={sonX} cy={sonY} r="9" fill="#ff2d95" opacity="0.22" />
      <circle cx={sonX} cy={sonY} r="4.5" fill="#ff2d95" />
      <text x={sonX - 6} y={sonY - 13} textAnchor="end" fontSize="11" fontWeight="700" fill="currentColor">
        38
      </text>
    </svg>
  );
}

/** Görününce bir kez yükselen sarmalayıcı. */
function Belir({
  children,
  className,
  gecikme = 0,
  as: Etiket = "div",
}: {
  children: React.ReactNode;
  className?: string;
  gecikme?: number;
  as?: "div" | "article";
}) {
  const ref = useRef<HTMLElement>(null);
  const [görünür, setGörünür] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (girisler) => {
        if (girisler[0].isIntersecting) {
          setGörünür(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Etiket
      ref={ref as React.Ref<HTMLDivElement & HTMLElement>}
      className={`${s.rv} ${görünür ? s.rvIn : ""} ${className ?? ""}`}
      style={{ transitionDelay: `${gecikme}ms` }}
    >
      {children}
    </Etiket>
  );
}

/** Görününce hedefine kadar sayan rakam. */
function Sayac({ hedef, son = "" }: { hedef: number; son?: string }) {
  const ref = useRef<HTMLElement>(null);
  const [deger, setDeger] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let çerçeve = 0;
    // Karar gözlemcinin içinde veriliyor: efekt gövdesinde senkron `setState`
    // zincirleme boyama açar, gözlemci geri çağrısı ise dış bir olay.
    const io = new IntersectionObserver(
      (girisler) => {
        if (!girisler[0].isIntersecting) return;
        io.disconnect();
        const az =
          window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
          document.documentElement.dataset.motion === "reduced";
        if (az) {
          setDeger(hedef);
          return;
        }
        const t0 = performance.now();
        const adim = (t: number) => {
          const k = KAPAT((t - t0) / 1200, 0, 1);
          setDeger(Math.round(hedef * YUMUSAT(k)));
          if (k < 1) çerçeve = requestAnimationFrame(adim);
        };
        çerçeve = requestAnimationFrame(adim);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(çerçeve);
    };
  }, [hedef]);

  return (
    <b ref={ref as React.Ref<HTMLElement>}>
      {deger}
      {deger === hedef ? son : ""}
    </b>
  );
}

/**
 * Açık ve koyu tema arasında geçiş.
 *
 * Tercih panelinkiyle aynı çerezde tutuluyor: vitrinde koyuya geçen ziyaretçi
 * hesap açıp panele girdiğinde onu da koyu buluyor. Ayarlar'daki "sistem"
 * seçeneği burada bilerek yok — vitrinde bir düğme, üç durum değil.
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
    <button
      type="button"
      className={`${s.dugme} ${s.tema}`}
      onClick={degistir}
      aria-label="Açık ve koyu tema arasında geçiş yap"
    >
      <svg className={s.ay} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M20 14.2A8.4 8.4 0 0 1 9.8 4 8.5 8.5 0 1 0 20 14.2z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      <svg className={s.gunes} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="2" />
        <path
          d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

function Marka() {
  return (
    <span className={s.marka}>
      {/* Dört modül, dört gün batımı rengi: vitrinin paleti markanın kendisinde
          de duruyor. Panelin tek renkli işaretinden ayrılması bilinçli. */}
      <svg width="25" height="25" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="6" stroke="currentColor" strokeWidth="2" />
        <rect x="6.4" y="6.4" width="4.6" height="4.6" rx="1.5" fill="#ff2d95" />
        <rect x="13" y="6.4" width="4.6" height="4.6" rx="1.5" fill="#ffc531" />
        <rect x="6.4" y="13" width="4.6" height="4.6" rx="1.5" fill="#00d9c4" />
        <rect x="13.6" y="13.6" width="3.4" height="3.4" rx="1.1" fill="#7b3ff2" />
      </svg>
      Veyro <em>Labs</em>
    </span>
  );
}

function Gok({ tur, katRef }: { tur: string; katRef?: React.Ref<HTMLSpanElement>; }) {
  return (
    <span className={`${s.gok} ${tur}`} aria-hidden="true">
      <span className={s.kat} ref={katRef} />
    </span>
  );
}

export default function VeyroLabs({ panelHref, oturumAcik }: { panelHref: string; oturumAcik: boolean }) {
  const sayfaRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const acilisRef = useRef<HTMLElement>(null);
  const acilisKatRef = useRef<HTMLSpanElement>(null);
  const acilisTelRef = useRef<HTMLDivElement>(null);
  const sozRef = useRef<HTMLElement>(null);
  const sozKatRef = useRef<HTMLSpanElement>(null);
  const akisRef = useRef<HTMLDivElement>(null);
  const akisTelRef = useRef<HTMLDivElement>(null);
  const isinRef = useRef<HTMLSpanElement>(null);

  const [sozBant, setSozBant] = useState(0);
  const [akisBant, setAkisBant] = useState(0);
  const [parlak, setParlak] = useState(true);

  const girisCta = oturumAcik ? "Panele gir" : "Ücretsiz başla";
  const girisHref = oturumAcik ? panelHref : "/signup";

  const miniler: MiniHizmet[] = useMemo(
    () => [
      {
        ad: "Ürün ve envanter",
        gok: s.gMor,
        durum: "live",
        href: "/admin/products",
        aciklama: "Hangi ürün kimde, nerede, ne zamandan beri. Geçmişi kendi kartında durur.",
      },
      {
        ad: "İade hatırlatmaları",
        gok: s.gGun,
        durum: "live",
        href: "/admin/notifications",
        aciklama: "İade günü yaklaşanlar her sabah işaretlenir, panelin zilinde birikir.",
      },
      {
        ad: "Barkodla arama",
        gok: s.gDeniz,
        durum: "live",
        href: "/admin/products",
        aciklama: "Elinizdeki barkodlu stoğu baştan etiketlemeyin. Okutun, listede çıksın.",
      },
      {
        ad: "Kiralama sayfası",
        gok: s.gAltin,
        durum: "live",
        href: panelHref,
        aciklama: "Her ürünün kendi adresi. Paylaşın, yayınlayın — QR'sız da çalışır.",
      },
      {
        ad: "Görsel tanıma",
        gok: s.gBatim,
        durum: "soon",
        href: "#basla",
        aciklama: "Etiketi yıpranmış ürünü kameraya gösterin, hangisi olduğunu bulsun.",
      },
      {
        ad: "Depozito",
        gok: s.gNeon,
        durum: "soon",
        href: "#basla",
        aciklama: "Teslimde bloke edilen, iadede kendiliğinden çözülen depozito.",
      },
    ],
    [panelHref],
  );

  /**
   * Film greni.
   *
   * Bir kez üretilip CSS değişkenine yazılıyor: gradyanların üstündeki bu ince
   * gürültü, düz bir renk geçişini bir yüzeye çeviren şey. Sunucuda
   * üretilemediği için burada — üretilemezse gökyüzleri grensiz kalıyor,
   * sayfa yine çalışıyor.
   */
  useEffect(() => {
    const sayfa = sayfaRef.current;
    if (!sayfa) return;
    const n = 180;
    const tuval = document.createElement("canvas");
    tuval.width = n;
    tuval.height = n;
    const ctx = tuval.getContext("2d");
    if (!ctx) return;
    const veri = ctx.createImageData(n, n);
    for (let i = 0; i < veri.data.length; i += 4) {
      const v = 118 + (Math.random() * 74 - 37);
      veri.data[i] = veri.data[i + 1] = veri.data[i + 2] = v;
      veri.data[i + 3] = 30;
    }
    ctx.putImageData(veri, 0, 0);
    sayfa.style.setProperty("--v-gren", `url("${tuval.toDataURL("image/png")}")`);

    // Belirme kuralları ancak JS çalışıyorsa açılıyor: script çalışmazsa
    // gözlemci de çalışmaz ve `.rv` öğeleri sonsuza dek gizli kalırdı.
    sayfa.classList.add(s.hazir);
  }, []);

  const azHareket = useCallback(
    () =>
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.dataset.motion === "reduced",
    [],
  );

  /** Vizördeki tarama ışığı: sahne dursa da canlı görünsün. */
  useEffect(() => {
    const el = isinRef.current;
    if (!el) return;
    if (azHareket()) {
      el.style.opacity = "0";
      return;
    }
    let çerçeve = 0;
    const t0 = performance.now();
    const don = (t: number) => {
      const k = ((t - t0) % 2600) / 2600;
      el.style.top = `${18 + k * 52}%`;
      el.style.opacity = String(Math.sin(k * Math.PI));
      çerçeve = requestAnimationFrame(don);
    };
    çerçeve = requestAnimationFrame(don);
    return () => cancelAnimationFrame(çerçeve);
  }, [azHareket]);

  /**
   * Kaydırmaya bağlı her şey tek döngüde.
   *
   * Ayrı ayrı dinleyiciler her biri kendi `requestAnimationFrame`ini açardı ve
   * aynı karede birden fazla düzen okuması yapılırdı.
   */
  useEffect(() => {
    const az = azHareket();
    let bekliyor = false;

    const kare = () => {
      bekliyor = false;
      const vy = window.innerHeight;

      // Açılış: gökyüzü yaklaşırken telefon ters yöne kayıyor
      const acilis = acilisRef.current;
      if (acilis) {
        const r = acilis.getBoundingClientRect();
        setParlak(r.bottom > 70);
        if (!az && r.bottom > 0) {
          const q = KAPAT(-r.top / Math.max(r.height, 1), 0, 1);
          if (acilisKatRef.current) {
            acilisKatRef.current.style.transform = `translateY(${q * 16}%) scale(${ARADEGER(1, 1.14, q)})`;
          }
          if (acilisTelRef.current) {
            acilisTelRef.current.style.transform = `translateY(${q * -52}px)`;
          }
        }
      }

      // Söz paneli: dört söz sırayla geçiyor, gökyüzü her sözde değişiyor
      const soz = sozRef.current;
      if (soz) {
        const r = soz.getBoundingClientRect();
        const yol = soz.offsetHeight - vy;
        if (yol > 0) {
          const p = KAPAT(-r.top / yol, 0, 1);
          const bant = KAPAT(Math.floor(p * SOZLER.length), 0, SOZLER.length - 1);
          setSozBant(bant);
          const ic = p * SOZLER.length - bant;

          soz.querySelectorAll<HTMLElement>(`.${s.sozSatir}`).forEach((el, i) => {
            const g = i === bant ? KAPAT(Math.min(ic * 6, (1 - ic) * 6), 0, 1) : 0;
            el.style.opacity = az ? (i === bant ? "1" : "0") : String(g);
            el.style.transform = az ? "none" : `translateY(${(1 - g) * 40}px) scale(${ARADEGER(0.96, 1, g)})`;
          });
          soz.querySelectorAll<HTMLElement>(`.${s.sozNokta} b`).forEach((el, i) => {
            el.style.width = `${KAPAT(p * SOZLER.length - i, 0, 1) * 100}%`;
          });
          if (!az && sozKatRef.current) {
            sozKatRef.current.style.transform = `scale(${ARADEGER(1.12, 1.02, p)})`;
          }
        }
      }

      // Telefon akışı: ekran kaydırmayla adım değiştiriyor
      const akis = akisRef.current;
      if (akis) {
        const r = akis.getBoundingClientRect();
        const yol = akis.offsetHeight - vy;
        if (yol > 0) {
          const p = KAPAT(-r.top / yol, 0, 1);
          setAkisBant(p < 0.34 ? 0 : p < 0.68 ? 1 : 2);
          akis.querySelectorAll<HTMLElement>(`.${s.akisNokta} b`).forEach((el, i) => {
            el.style.width = `${KAPAT(p * 3 - i, 0, 1) * 100}%`;
          });
          if (!az && akisTelRef.current) {
            akisTelRef.current.style.transform = `translateY(${ARADEGER(18, -18, p)}px) rotate(${ARADEGER(-1.4, 1.4, p)}deg)`;
          }
        }
      }

      // Sahne katmanları: kaydırma yönünün tersine, yavaşça
      if (!az && sayfaRef.current) {
        sayfaRef.current.querySelectorAll<HTMLElement>("[data-paralaks]").forEach((el) => {
          const kutu = el.parentElement?.getBoundingClientRect();
          if (!kutu || kutu.bottom < -200 || kutu.top > vy + 200) return;
          const t = (kutu.top + kutu.height / 2 - vy / 2) / vy;
          el.style.transform = `translateY(${t * Number(el.dataset.paralaks)}%)`;
        });
      }
    };

    const planla = () => {
      if (bekliyor) return;
      bekliyor = true;
      requestAnimationFrame(kare);
    };

    window.addEventListener("scroll", planla, { passive: true });
    window.addEventListener("resize", planla);
    kare();
    return () => {
      window.removeEventListener("scroll", planla);
      window.removeEventListener("resize", planla);
    };
  }, [azHareket]);

  /**
   * Açılış sırası saf CSS.
   *
   * Durum tutup efektle tetiklemek yerine `animation` kullanılıyor: animasyon
   * JS hiç çalışmasa da oynuyor ve hareket tercihi kapalıyken CSS'in kendi
   * kuralıyla susuyor. Gecikmeyi sıra numarası veriyor.
   */
  const satirStili = (i: number): React.CSSProperties => ({ animationDelay: `${140 + i * 115}ms` });
  const girisStili = (i: number): React.CSSProperties => ({ animationDelay: `${420 + i * 110}ms` });

  return (
    <div className={s.page} ref={sayfaRef}>
      <nav className={`${s.nav} ${parlak ? s.parlak : s.uzerinde}`} ref={navRef}>
        <div className={`${s.wrap} ${s.navIn}`}>
          <Link href="/veyro-labs" aria-label="Veyro Labs">
            <Marka />
          </Link>
          <div className={s.navOrta}>
            <a href="#nasil">Nasıl çalışır</a>
            <a href="#hizmetler">Hizmetler</a>
            <a href="#basla">Başlayın</a>
          </div>
          <div className={s.navSon}>
            <TemaDugmesi />
            <Link className={`${s.dugme} ${s.sicak}`} href={girisHref}>
              {girisCta}
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* ---------------- Açılış ---------------- */}
        <section className={s.acilis} ref={acilisRef}>
          <span className={`${s.gok} ${s.gBatim}`} aria-hidden="true">
            <span className={s.kat} ref={acilisKatRef} />
            <span className={s.cizgi} />
          </span>

          <div className={`${s.wrap} ${s.acilisIn}`}>
            <div>
              <span className={`${s.acilisRozet} ${s.girisKat}`} style={girisStili(0)}>
                <i />
                <span className={s.kod}>Dokuz hizmet · tek hesap</span>
              </span>
              <h1 className={s.afis}>
                <span className={s.satir}>
                  <span className={s.satirIc} style={satirStili(0)}>Her eşyaya</span>
                </span>
                <span className={s.satir}>
                  <span className={s.satirIc} style={satirStili(1)}>bir kod.</span>
                </span>
                <span className={s.satir}>
                  <span className={`${s.vurgu} ${s.satirIc}`} style={satirStili(2)}>
                    Okutan kiralasın.
                  </span>
                </span>
              </h1>
              <p className={`${s.acilisGiris} ${s.girisKat}`} style={girisStili(1)}>
                Bisikletten kamera ekipmanına, matkaptan kayak takımına. Üzerine kod yapıştırabildiğiniz her şey
                kiralanabilir hale gelir — kiracı okutur, boş günleri görür, rezerve eder.
              </p>
              <div className={`${s.acilisEylem} ${s.girisKat}`} style={girisStili(2)}>
                <Link className={`${s.dugme} ${s.beyaz}`} href={girisHref}>
                  {girisCta}
                </Link>
                <a className={`${s.dugme} ${s.hat}`} href="#nasil">
                  Nasıl çalışır
                </a>
              </div>
            </div>

            <div className={`${s.telefon} ${s.girisKat}`} ref={acilisTelRef} style={girisStili(3)}>
              <span className={s.ada} />
              <div className={s.ekran}>
                <div className={s.urunGorsel}>
                  <Gok tur={s.gGun} />
                </div>
                <div className={s.urunBilgi}>
                  <b>Trek Marlin 7 · Dağ Bisikleti</b>
                  <Konum>Kadıköy, İstanbul</Konum>
                  <span className={s.urunFiyat}>
                    <strong>₺350</strong>
                    <span>/ gün · depozito ₺500</span>
                  </span>
                </div>
                <div className={s.takvim}>
                  <div className={s.takvimUst}>
                    <span>Eylül 2026</span>
                    <span className={s.kod} style={{ color: "var(--v-turkuaz-k)" }}>
                      3 gün seçili
                    </span>
                  </div>
                  <div className={s.gunAdlari}>
                    <span>P</span>
                    <span>S</span>
                    <span>Ç</span>
                    <span>P</span>
                    <span>C</span>
                    <span>C</span>
                    <span>P</span>
                  </div>
                  <TakvimIzgarasi bosluk={1} adet={30} dolular={[8, 9, 10, 22, 23]} secililer={[12, 13, 14]} />
                </div>
                <div className={s.ekranAlt}>
                  <span className={s.ekranDugme}>Rezervasyon iste · ₺1.050</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- Sayılar ---------------- */}
        <section className={s.serit}>
          <Gok tur={s.gMor} />
          <Belir className={`${s.wrap} ${s.seritIn}`}>
            <div className={s.olcu}>
              <Sayac hedef={9} />
              <span>Tek hesapla açılan hizmet</span>
            </div>
            <div className={s.olcu}>
              <Sayac hedef={5} son=" DK" />
              <span>İlk etiketiniz hazır olana kadar</span>
            </div>
            <div className={s.olcu}>
              <Sayac hedef={0} />
              <span>Kiracının indirmesi gereken uygulama</span>
            </div>
            <div className={s.olcu}>
              <Sayac hedef={24} son="/7" />
              <span>Kod okutulur, rezervasyon düşer</span>
            </div>
          </Belir>
        </section>

        {/* ---------------- Yapışkan söz paneli ---------------- */}
        <section className={s.soz} ref={sozRef}>
          <div className={s.sozYapis}>
            <span className={`${s.gok} ${s.gNeon}`} aria-hidden="true">
              <span
                className={`${s.kat} ${s.sozKat}`}
                ref={sozKatRef}
                style={{ background: SOZ_TONLARI[sozBant] }}
              />
              <span className={s.cizgi} />
            </span>
            <div className={s.sozIc}>
              <span className={s.kod}>Nasıl çalışır</span>
              <div className={s.sozSahne}>
                {SOZLER.map((soz) => (
                  <div className={s.sozSatir} key={soz.ad}>
                    <h2 className={s.afis}>{soz.ad}</h2>
                    <p>{soz.metin}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className={s.sozNokta}>
              {SOZLER.map((soz) => (
                <i key={soz.ad}>
                  <b />
                </i>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- Kiracının gördüğü ekran ---------------- */}
        <section className={s.bolum} id="nasil" style={{ paddingBlockEnd: 0 }}>
          <div className={s.wrap}>
            <Belir className={s.bolumUst}>
              <span className={s.kod}>Kiracının gördüğü</span>
              <h2 className={s.afis}>Tek ekran, üç adım.</h2>
              <p>
                Kiracı tarafında olan biten bundan ibaret. Aşağı kaydırın, ekran sizinle birlikte ilerlesin.
              </p>
            </Belir>
          </div>

          <div className={s.akis} ref={akisRef}>
            <div className={s.akisYapis}>
              <div className={`${s.wrap} ${s.akisIc}`}>
                <div className={s.telefon} ref={akisTelRef}>
                  <span className={s.ada} />
                  <div className={s.ekran}>
                    {/* 1 — kamera */}
                    <div className={s.ekranKat} style={{ opacity: akisBant === 0 ? 1 : 0 }}>
                      <div className={s.ekranUst}>
                        <span className={s.kod}>Veyro · Tarayıcı</span>
                      </div>
                      <div className={s.vizor}>
                        <div className={s.vizorAlan}>
                          <span className={`${s.kose} ${s.k1}`} />
                          <span className={`${s.kose} ${s.k2}`} />
                          <span className={`${s.kose} ${s.k3}`} />
                          <span className={`${s.kose} ${s.k4}`} />
                          <div className={s.vizorQr}>
                            <Qr />
                          </div>
                        </div>
                        <span className={s.vizorIsin} ref={isinRef} />
                        <span className={s.vizorNot}>Kodu çerçeveye alın</span>
                      </div>
                    </div>

                    {/* 2 — ürün ve takvim */}
                    <div className={s.ekranKat} style={{ opacity: akisBant === 1 ? 1 : 0 }}>
                      <div className={s.urunGorsel}>
                        <Gok tur={s.gDeniz} />
                      </div>
                      <div className={s.urunBilgi}>
                        <b>Canon EOS R6 · Gövde + 24-105</b>
                        <Konum>Beşiktaş, İstanbul</Konum>
                        <span className={s.urunFiyat}>
                          <strong>₺900</strong>
                          <span>/ gün · depozito ₺3.000</span>
                        </span>
                      </div>
                      <div className={s.takvim}>
                        <div className={s.takvimUst}>
                          <span>Ekim 2026</span>
                          <span className={s.kod} style={{ color: "var(--v-turkuaz-k)" }}>
                            2 gün seçili
                          </span>
                        </div>
                        <div className={s.gunAdlari}>
                          <span>P</span>
                          <span>S</span>
                          <span>Ç</span>
                          <span>P</span>
                          <span>C</span>
                          <span>C</span>
                          <span>P</span>
                        </div>
                        <TakvimIzgarasi bosluk={3} adet={31} dolular={[5, 6, 7, 19, 20]} secililer={[12, 13]} />
                      </div>
                      <div className={s.ekranAlt}>
                        <span className={s.ekranDugme}>Rezervasyon iste · ₺1.800</span>
                      </div>
                    </div>

                    {/* 3 — onay */}
                    <div className={s.ekranKat} style={{ opacity: akisBant === 2 ? 1 : 0 }}>
                      <div className={s.ekranUst}>
                        <span className={s.kod}>Veyro · Rezervasyon</span>
                      </div>
                      <div className={s.onay}>
                        <span className={s.onayHalka}>
                          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path
                              d="M5 12.5 10 17.5 19 7"
                              stroke="#04231f"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                        <h4>Rezervasyon alındı</h4>
                        <p>Sahibine bildirildi. Onaylandığında haber vereceğiz.</p>
                        <div className={s.onayFis}>
                          <div>
                            <span>Ürün</span>
                            <span>Canon EOS R6</span>
                          </div>
                          <div>
                            <span>Teslim</span>
                            <span>12 Eki 2026</span>
                          </div>
                          <div>
                            <span>İade</span>
                            <span>14 Eki 2026</span>
                          </div>
                          <div className={s.toplam}>
                            <span>Toplam</span>
                            <span>₺1.800</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={s.akisNokta}>
                  <i>
                    <b />
                  </i>
                  <i>
                    <b />
                  </i>
                  <i>
                    <b />
                  </i>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- Hizmetler ---------------- */}
        <section className={s.bolum} id="hizmetler">
          <div className={s.wrap}>
            <Belir className={s.bolumUst}>
              <span className={s.kod}>Hizmetlerimiz</span>
              <h2 className={s.afis}>Dokuz araç, tek panel.</h2>
              <p>
                Hepsi aynı ürün listesini paylaşır. Birini kullanmaya başlamak için diğerini kurmanız gerekmez.
              </p>
            </Belir>

            <div className={s.satirlar}>
              {/* Rezervasyonlar */}
              <Belir as="article" className={s.hsatir}>
                <div className={s.hgorsel}>
                  <span className={`${s.gok} ${s.gMor}`} aria-hidden="true">
                    <span className={s.kat} data-paralaks="14" />
                  </span>
                  <div className={s.pano}>
                    <div className={s.panoUst}>
                      <b>Bugün</b>
                      <span className={s.rozetMini}>4 aktif</span>
                    </div>
                    <div className={s.satirKayit}>
                      <span className={s.kup} style={{ background: "linear-gradient(140deg,#ff2d95,#ff7a1a)" }} />
                      <span className={s.met}>
                        <b>Trek Marlin 7</b>
                        <span>12–15 Eyl · Ayşe K.</span>
                      </span>
                      <span className={s.sag} style={{ color: "var(--v-turkuaz-k)" }}>
                        Sürüyor
                      </span>
                    </div>
                    <div className={s.satirKayit}>
                      <span className={s.kup} style={{ background: "linear-gradient(140deg,#00d9c4,#0e6e8e)" }} />
                      <span className={s.met}>
                        <b>Canon EOS R6</b>
                        <span>14–16 Eyl · Mert D.</span>
                      </span>
                      <span className={s.sag} style={{ color: "var(--v-altin-k)" }}>
                        Yarın
                      </span>
                    </div>
                    <div className={s.satirKayit}>
                      <span className={s.kup} style={{ background: "linear-gradient(140deg,#7b3ff2,#c22a9b)" }} />
                      <span className={s.met}>
                        <b>Bosch GSB 18V</b>
                        <span>9–11 Eyl · Kaan T.</span>
                      </span>
                      <span className={s.sag} style={{ color: "var(--v-fusya-k)" }}>
                        İade bugün
                      </span>
                    </div>
                  </div>
                </div>
                <div className={s.hmetin}>
                  <span className={s.kod}>01 — Kirala</span>
                  <h3>Rezervasyonlar</h3>
                  <p>
                    Yaklaşan, süren ve biten kiralamalar tek listede. Kim, hangi ürünü, hangi tarihler için almış —
                    hepsi tek bakışta.
                  </p>
                  <div className={s.liste}>
                    <span>
                      <Tik renk="var(--v-fusya-k)" /> Çakışan tarih daha kaydedilmeden engellenir
                    </span>
                    <span>
                      <Tik renk="var(--v-fusya-k)" /> Boş günler takvimde renkle ayrılır
                    </span>
                  </div>
                  <Link className={`${s.dugme} ${s.sicak}`} href="/admin">
                    Hemen dene
                  </Link>
                </div>
              </Belir>

              {/* QR etiketleri */}
              <Belir as="article" className={`${s.hsatir} ${s.ters}`}>
                <div className={s.hgorsel}>
                  <span className={`${s.gok} ${s.gAltin}`} aria-hidden="true">
                    <span className={s.kat} data-paralaks="-12" />
                  </span>
                  <div className={s.etiketKagit}>
                    <span className={s.kutu}>
                      <Qr zemin="#ffffff" />
                    </span>
                    <span className={s.yazi}>
                      <b>Trek Marlin 7</b>
                      <span>Dağ bisikleti · 29&quot;</span>
                      <span>₺350 / gün</span>
                      <span className={s.kod}>Veyro · TRK-7841</span>
                    </span>
                  </div>
                </div>
                <div className={s.hmetin}>
                  <span className={s.kod}>02 — Etiketle</span>
                  <h3>QR etiketleri</h3>
                  <p>
                    Her ürün için baskıya hazır kod. Ürünü eklediğiniz anda hazır olur; indirin, yazdırın, üstüne
                    yapıştırın.
                  </p>
                  <div className={s.liste}>
                    <span>
                      <Tik renk="var(--v-turuncu-k)" /> PNG ya da SVG — istediğiniz boyda basın
                    </span>
                    <span>
                      <Tik renk="var(--v-turuncu-k)" /> Elinizdeki barkodlu stoğu baştan etiketlemeyin
                    </span>
                  </div>
                  <Link className={`${s.dugme} ${s.sicak}`} href="/admin/products">
                    Hemen dene
                  </Link>
                </div>
              </Belir>

              {/* Raporlar */}
              <Belir as="article" className={s.hsatir}>
                <div className={s.hgorsel}>
                  <span className={`${s.gok} ${s.gDeniz}`} aria-hidden="true">
                    <span className={s.kat} data-paralaks="14" />
                  </span>
                  <div className={`${s.pano} ${s.grafikPano}`}>
                    <div className={s.panoUst}>
                      <b>Son 30 gün</b>
                      <span className={`${s.rozetMini} ${s.rozetFusya}`}>+%38</span>
                    </div>
                    <div className={s.grafikCizim}>
                      <RaporGrafigi />
                    </div>
                    <div className={s.grafikAlt}>
                      <span>12 Ağu</span>
                      <span>27 Ağu</span>
                      <span>11 Eyl</span>
                    </div>
                  </div>
                </div>
                <div className={s.hmetin}>
                  <span className={s.kod}>03 — Yönet</span>
                  <h3>Raporlar</h3>
                  <p>
                    Son otuz günün rezervasyon eğilimi, ürün sayınız ve doluluğunuz tek ekranda. Hangi ürün para
                    kazandırıyor, hangisi rafta duruyor.
                  </p>
                  <div className={s.liste}>
                    <span>
                      <Tik renk="var(--v-turkuaz-k)" /> Ürün başına doluluk oranı
                    </span>
                    <span>
                      <Tik renk="var(--v-turkuaz-k)" /> Aylık kazanç dökümü
                    </span>
                  </div>
                  <Link className={`${s.dugme} ${s.sicak}`} href="/admin/dashboard">
                    Hemen dene
                  </Link>
                </div>
              </Belir>
            </div>

            <div className={s.mini}>
              {miniler.map((m, i) => (
                <Belir as="article" key={m.ad} className={s.minik} gecikme={(i % 3) * 80}>
                  <Gok tur={m.gok} />
                  <Link className={s.minikIc} href={m.href}>
                    <h4>{m.ad}</h4>
                    <p>{m.aciklama}</p>
                    <span className={`${s.durum} ${m.durum === "soon" ? s.yolda : ""}`}>
                      <i />
                      {m.durum === "soon" ? "Yolda" : "Yayında"}
                    </span>
                  </Link>
                </Belir>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- Kapanış ---------------- */}
        <section className={s.bolum} id="basla" style={{ paddingBlockStart: 0 }}>
          <div className={s.wrap}>
            <Belir className={s.kapanis}>
              <span className={`${s.gok} ${s.gBatim}`} aria-hidden="true">
                <span className={s.kat} data-paralaks="18" />
                <span className={s.cizgi} />
              </span>
              <div className={s.kapanisIc}>
                <span className={s.kod} style={{ color: "rgba(255,255,255,.7)" }}>
                  Başlayın
                </span>
                <h2 className={s.afis} style={{ marginTop: 14 }}>
                  İlk etiketiniz beş dakikada.
                </h2>
                <p>
                  Hesabınızı açın, ilk ürününüzü ekleyin, kodunu yazdırın. Kurulum yok, indirilecek uygulama yok,
                  kredi kartı istemiyoruz.
                </p>
                <div className={s.kapanisEylem}>
                  <Link className={`${s.dugme} ${s.beyaz}`} href={girisHref}>
                    {girisCta}
                  </Link>
                  {!oturumAcik && (
                    <Link className={`${s.dugme} ${s.hat}`} href="/login">
                      Hesabım var
                    </Link>
                  )}
                </div>
              </div>
            </Belir>
          </div>
        </section>
      </main>

      <footer className={s.footer}>
        <div className={s.wrap}>
          <div className={s.footIn}>
            <div className={s.footMarka}>
              <Marka />
              <p>Fiziksel eşyayı kiralanabilir, takip edilebilir ve iade edilebilir hale getiren araçlar.</p>
            </div>
            <div className={s.footSut}>
              <h4>Hizmetler</h4>
              <Link href={panelHref}>Kiralama</Link>
              <Link href="/admin">Rezervasyonlar</Link>
              <Link href="/admin/products">Ürün ve envanter</Link>
              <Link href="/admin/notifications">İade hatırlatmaları</Link>
            </div>
            <div className={s.footSut}>
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
          <div className={s.footSon}>
            <span>© {new Date().getFullYear()} Veyro</span>
            <span className={s.kod}>Türkiye&apos;de geliştirildi</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
