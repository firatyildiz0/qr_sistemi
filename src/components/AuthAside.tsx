import type { CSSProperties } from "react";
import QRCode from "qrcode";
import { IconCalendar } from "@/components/icons";
import Wordmark from "@/components/Wordmark";

/**
 * Giriş ve üye ol sayfalarının ortak sol paneli.
 *
 * Paneldeki animasyon işin kendisini anlatıyor: ürüne yapıştırılan etiket
 * okutulur, açılan sayfada müşteri fiyatı ve dolu günleri görür, aynı bağlantı
 * satıcıda açıldığında rezervasyon formuna döner. Dört adım da tek bir döngüyü
 * paylaşıyor (bkz. `.auth-scene`, globals.css); buradaki iş yalnızca hangi
 * parçanın hangi adımda belireceğini `auth-f1…f4` ile söylemek.
 *
 * Hareket kapalıyken (işletim sistemi tercihi ya da Ayarlar) panel son
 * karesinde durur ve alttaki dört cümlenin yerini tek bir sabit cümle alır.
 */

/** Etiketteki kodun gerçekten götürdüğü yer. */
const QR_TARGET = "https://qrsistemi.vercel.app/";

/** Ürün sayfasındaki müsaitlik şeridinin gösterdiği günler. */
const DAYS = Array.from({ length: 10 }, (_, i) => i + 1);
const FULL_DAYS = [5, 6];
const PARTIAL_DAYS = [3, 4, 7, 8];

/**
 * Etiketteki desen gerçek bir QR kod: okutulduğunda `QR_TARGET` açılır. Modüller
 * sunucuda tek seferde hesaplanıyor, yani her ziyarette aynı kod beliriyor.
 *
 * Okunabilmesi için iki şart var: modüller bitişik çizilmeli (arada boşluk
 * bırakılırsa desen bozulur) ve etrafında sessiz alan kalmalı — `QrLabel`
 * içindeki beyaz iç boşluk bunun için.
 *
 * Hata düzeltme seviyesi bilerek en düşükte: bu adreste kod 25×25 modülde
 * kalıyor, bir üst seviye 29×29'a çıkıp modülleri ekranda okunamayacak kadar
 * küçültüyor.
 *
 * `delay` modüllerin belirme sırası. Sıra dağınık görünsün ama her açılışta
 * aynı kalsın diye rastgelelik yerine koordinatlardan türeyen bir değere göre
 * sıralanıyor.
 */
const { size: QR_SIZE, modules: QR_MODULES } = (() => {
  const { modules } = QRCode.create(QR_TARGET, { errorCorrectionLevel: "L" });
  const size = modules.size;

  const cells = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      cells.push({
        on: Boolean(modules.data[y * size + x]),
        key: (x * 53 + y * 97) % 101,
      });
    }
  }

  const order = cells
    .map((cell, index) => ({ index, key: cell.key }))
    .sort((a, b) => a.key - b.key);

  const delays = new Array<number>(cells.length);
  order.forEach((cell, rank) => {
    delays[cell.index] = Math.round((rank / cells.length) * 1400);
  });

  return {
    size,
    modules: cells.map((cell, index) => ({ on: cell.on, delay: delays[index] })),
  };
})();

const STEPS = [
  <>
    Her ürünün QR&apos;ı panelde hazır: <b>PNG ya da PDF indirip yazdırırsınız</b>.
  </>,
  <>
    Müşteri telefonuyla okutur — <b>uygulama indirmez, hesap açmaz</b>.
  </>,
  <>
    Fiyatı ve dolu günleri <b>kendisi görür</b>; tarih tarih anlatmazsınız.
  </>,
  <>
    Aynı bağlantı sizde açılır ve <b>rezervasyonu oradan kaydedersiniz</b>.
  </>,
];

export default function AuthAside() {
  return (
    <div className="relative flex flex-col justify-center overflow-hidden bg-deep px-8 py-16 text-on-deep lg:w-3/5 lg:px-16">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: "radial-gradient(#F2F1ED 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      <div className="relative z-10 w-full max-w-md">
        {/* Not a link: with the landing page parked, "/" only comes back here. */}
        <span className="font-display text-xl font-extrabold">
          <Wordmark />
        </span>
        <h1 className="mt-8 text-3xl font-bold leading-tight sm:text-4xl">
          Kiralamalarınızı tek bir yerden yönetin
        </h1>
        <p className="mt-4 text-on-deep/70">
          Fiziksel ekipmanlar için tasarlanmış tek bir pratik panelden ürünleri, rezervasyonları
          ve QR kodlarını takip edin.
        </p>

        {/* Dar ekranda panel formun üstünde duruyor; animasyon oraya girseydi
            giriş kutusu katlanın çok altında kalırdı. */}
        <div className="auth-scene mt-10 hidden sm:block">
          <div className="flex flex-col items-center">
            <QrLabel />
            <ProductSheet />
            <OwnerRow />
          </div>

          <div className="mt-7 border-t border-white/10 pt-5">
            <p className="auth-cap-static text-[15px] leading-snug text-on-deep/85">
              Müşteri etiketi okutur; fiyatı ve dolu günleri kendisi görür.
            </p>

            <div className="auth-cap relative h-16">
              {STEPS.map((step, index) => (
                <p
                  key={index}
                  style={{ "--i": index } as CSSProperties}
                  className="absolute inset-0 text-[15px] leading-snug text-on-deep/85"
                >
                  {step}
                </p>
              ))}
            </div>

            <div className="auth-dots mt-2 flex gap-1.5">
              {STEPS.map((_, index) => (
                <i
                  key={index}
                  style={{ "--i": index } as CSSProperties}
                  className="auth-dot h-[3px] w-3.5 rounded-sm bg-on-deep/15"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Ürüne yapıştırılan etiket: modül modül kurulur, sonra taranır. */
function QrLabel() {
  return (
    <div className="auth-qr relative h-45 w-45 rounded-xl bg-white p-4">
      <div
        className="grid h-full w-full"
        style={{
          gridTemplateColumns: `repeat(${QR_SIZE}, 1fr)`,
          gridTemplateRows: `repeat(${QR_SIZE}, 1fr)`,
        }}
        aria-hidden="true"
      >
        {QR_MODULES.map((module, index) =>
          module.on ? (
            <i
              key={index}
              // Kutucuk kenarları tam piksele denk gelmediğinde aralarında saç
              // teli kalınlığında beyaz çizgiler kalıyor ve tarayıcı kodu
              // okuyamıyor; gölge her modülü yarım piksel şişirip kapatıyor.
              className="auth-mod bg-black shadow-[0_0_0_0.5px_#000]"
              style={{ animationDelay: `${module.delay}ms` }}
            />
          ) : (
            <i key={index} />
          )
        )}
      </div>

      {/* Okutma anı: köşe çerçevesi oturur, ışık koddan bir kez geçer. */}
      <span className="auth-bracket absolute -left-1.5 -top-1.5 h-4 w-4 rounded-tl border-l-2 border-t-2 border-accent opacity-0" />
      <span className="auth-bracket absolute -right-1.5 -top-1.5 h-4 w-4 rounded-tr border-r-2 border-t-2 border-accent opacity-0" />
      <span className="auth-bracket absolute -bottom-1.5 -left-1.5 h-4 w-4 rounded-bl border-b-2 border-l-2 border-accent opacity-0" />
      <span className="auth-bracket absolute -bottom-1.5 -right-1.5 h-4 w-4 rounded-br border-b-2 border-r-2 border-accent opacity-0" />
      <span
        className="auth-beam absolute -left-1 -right-1 top-0 h-10 rounded-md border-b-2 border-accent opacity-0"
        style={{
          backgroundImage:
            "linear-gradient(180deg, transparent, color-mix(in oklab, var(--color-accent) 45%, transparent))",
        }}
      />

      <span className="auth-qr-tag eyebrow absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-deep-2 px-2.5 py-0.5 text-[9px] whitespace-nowrap text-on-deep/70">
        Ürün etiketi
      </span>
    </div>
  );
}

/** Okutan müşterinin gördüğü sayfa: fiyat, stok ve müsait günler. */
function ProductSheet() {
  return (
    <div className="auth-f3 mt-6 w-full max-w-[320px] rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-2.5">
        <div>
          <p className="text-[15px] font-bold tracking-tight">Bordo bindallı kaftan</p>
          <p className="mt-0.5 text-[11.5px] text-on-deep/55">1.250 ₺/gün</p>
        </div>
        <span className="pill auth-pill shrink-0">Stokta 2 adet</span>
      </div>

      <div className="mt-3 grid grid-cols-10 gap-[3px]" aria-hidden="true">
        {DAYS.map((day) => (
          <b
            key={day}
            className={`grid aspect-square place-items-center rounded text-[9.5px] font-semibold ${
              FULL_DAYS.includes(day)
                ? "auth-day-full"
                : PARTIAL_DAYS.includes(day)
                  ? "auth-day-part"
                  : "bg-white/5 text-on-deep/50"
            }`}
          >
            {day}
          </b>
        ))}
      </div>
    </div>
  );
}

/** Aynı bağlantı satıcıda açıldığında gelen rezervasyon formu. */
function OwnerRow() {
  return (
    <div className="auth-f4 mt-3 flex w-full max-w-[320px] items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-sm">
      <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-accent/20 text-accent">
        <IconCalendar className="h-[15px] w-[15px]" />
      </span>
      <div>
        <p className="text-[12.5px] font-semibold">Aynı sayfa sizde açılınca</p>
        <p className="text-[11px] text-on-deep/55">Yeni rezervasyon formu gelir</p>
      </div>
    </div>
  );
}
