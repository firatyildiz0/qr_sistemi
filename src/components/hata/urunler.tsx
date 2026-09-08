/**
 * Balonlardan çıkan ürünler.
 *
 * Hepsi elle çizilmiş SVG: indirilecek bir görsel yok, her ölçekte keskin ve
 * temanın karanlığından etkilenmiyorlar — bir tişört koyu temada da mavi kalır.
 *
 * Çizim dili her ürün için aynı ve "3B karikatür" görüntüsü tam olarak bu üç
 * katmandan çıkıyor:
 *
 *  1. Taban, sol üstten sağ alta inen bir degrade — ışığın yönü hep aynı.
 *  2. Sağ alt kenarda koyu bir gölge katmanı (hacim) ve sol üstte beyaz,
 *     yumuşak bir parlama (yüzeyin ışığı yakaladığı yer).
 *  3. Nesnenin kendi renginin koyusuyla çizilmiş ince bir dış çizgi. Siyah
 *     kontur karikatürü ucuzlatır; kendi renginden koyu olan onu yumuşatır.
 *
 * `id`'ler ürün adından türüyor. Aynı ürün ekranda birden çok kez görünürse
 * tanımlar birebir aynı olduğu için çakışma zararsız.
 */

import type { ReactElement } from "react";

type Cizim = () => ReactElement;

export type Urun = {
  anahtar: string;
  ad: string;
  Cizim: Cizim;
};

/** Ortak degradeler: gövde rengi, üstündeki parlama ve altındaki gölge. */
function Degrade({ id, acik, koyu }: { id: string; acik: string; koyu: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0.85" y2="1">
      <stop offset="0" stopColor={acik} />
      <stop offset="1" stopColor={koyu} />
    </linearGradient>
  );
}

/** Sol üstteki yumuşak ışık lekesi. Her gövdenin üstüne aynı biçimde konuyor. */
function Parlama({ d, opacity = 0.34 }: { d: string; opacity?: number | string }) {
  return <path d={d} fill="#ffffff" opacity={opacity} />;
}

function Tisort() {
  return (
    <svg viewBox="0 0 64 64" className="oyun-urun-svg">
      <defs>
        <Degrade id="u-tisort" acik="#7cb8ff" koyu="#2f6fd0" />
      </defs>
      {/* Tek parça: kollar, omuzlar ve gövde. Kol ağızları gövdeden biraz aşağıda
          bitiyor — düz bir omuz çizgisi tişörtü kâğıt uçurtmaya çeviriyor. */}
      <path
        d="M25 12 18 14.5 10.5 24l7 5.5 2.5-2v21.4a2.6 2.6 0 0 0 2.6 2.6h18.8a2.6 2.6 0 0 0 2.6-2.6V27.5l2.5 2 7-5.5L46 14.5 39 12c-2 6.4-12 6.4-14 0z"
        fill="url(#u-tisort)"
        stroke="#1f4e96"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      {/* Yaka: gövdeden koyu, kalın ve yuvarlak — tek başına "tişört" dedirten şey. */}
      <path
        d="M25 12c2 6.4 12 6.4 14 0"
        fill="none"
        stroke="#1f4e96"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path d="M41 26.5v24.4a2.6 2.6 0 0 1-2.6 2.6h-5.4V26.5z" fill="#0f3a78" opacity="0.16" />
      <Parlama d="M23.5 27.5h3.5v25.5h-3.5z" opacity="0.26" />
      <path d="M46.5 15.5 53.5 24l-4.5 3.5z" fill="#0f3a78" opacity="0.22" />
    </svg>
  );
}

function Pantolon() {
  return (
    <svg viewBox="0 0 64 64" className="oyun-urun-svg">
      <defs>
        <Degrade id="u-pantolon" acik="#6f97dd" koyu="#2c4a80" />
      </defs>
      <path
        d="M19 15h26l-1.7 37.6a1.4 1.4 0 0 1-1.4 1.4h-7.3a1.4 1.4 0 0 1-1.4-1.2L32 31.5l-1.2 21.3a1.4 1.4 0 0 1-1.4 1.2h-7.3a1.4 1.4 0 0 1-1.4-1.4z"
        fill="url(#u-pantolon)"
        stroke="#1d3157"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* Kemer bandı gövdeden ayrı bir parça gibi dursun diye kendi gölgesi var. */}
      <rect x="18.4" y="12.6" width="27.2" height="6.2" rx="1.6" fill="#38578f" stroke="#1d3157" strokeWidth="1.6" />
      <path d="M31 19h2l1 12h-4z" fill="#1d3157" opacity="0.35" />
      <path d="M43.4 20 41.8 54h-6.4l1-13z" fill="#16294a" opacity="0.2" />
      <Parlama d="M23.5 20h3.6l-1.3 30h-3.4z" opacity="0.26" />
      <circle cx="32" cy="15.7" r="1.5" fill="#dfe8f7" opacity="0.85" />
    </svg>
  );
}

function TakimElbise() {
  return (
    <svg viewBox="0 0 64 64" className="oyun-urun-svg">
      <defs>
        <Degrade id="u-takim" acik="#3f4d6b" koyu="#1c2439" />
        <Degrade id="u-gomlek" acik="#ffffff" koyu="#ccd6e6" />
        <Degrade id="u-kravat" acik="#f0564c" koyu="#a8221d" />
      </defs>
      {/* Önce gömlek ve kravat, sonra ceket kanatları üstlerine kapanıyor. */}
      <path d="M32 19.5 25.5 30l4 4.5-1 19h7l-1-19 4-4.5z" fill="url(#u-gomlek)" stroke="#a9b6c9" strokeWidth="1.2" />
      <path d="m32 21.5 2.7 2.6-1.5 8.6-1.2 6.6-1.2-6.6-1.5-8.6z" fill="url(#u-kravat)" stroke="#8a1a16" strokeWidth="1.1" strokeLinejoin="round" />
      {/* Omuzlar bir eğriyle yuvarlanıyor: sivri bıraktığımızda yaka boynuza,
          ceket de yarasa kanadına benziyordu. */}
      <path
        d="M24 13 32 19.5l-5.2 9.3 4 4-2.4 20.9H15.6L14.7 22C14.7 17.7 18.6 14 24 13Z"
        fill="url(#u-takim)"
        stroke="#141a2b"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M40 13 32 19.5l5.2 9.3-4 4 2.4 20.9h12.8L49.3 22C49.3 17.7 45.4 14 40 13Z"
        fill="url(#u-takim)"
        stroke="#141a2b"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M47.6 20.5 48.5 53.7h-4.9L46 24z" fill="#0e1322" opacity="0.3" />
      <Parlama d="M19.5 19.2 20.2 51h-3.6l-.8-30.7z" opacity="0.2" />
      <circle cx="34.4" cy="42" r="1.3" fill="#e6d9a8" />
      <circle cx="34.9" cy="48" r="1.3" fill="#e6d9a8" />
    </svg>
  );
}

function Telefon() {
  return (
    <svg viewBox="0 0 64 64" className="oyun-urun-svg">
      <defs>
        <Degrade id="u-telefon" acik="#5d6472" koyu="#23272f" />
        <linearGradient id="u-ekran" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4aa8ff" />
          <stop offset="0.55" stopColor="#2f6fd0" />
          <stop offset="1" stopColor="#1b3f7d" />
        </linearGradient>
      </defs>
      <rect x="18" y="6" width="28" height="52" rx="7" fill="url(#u-telefon)" stroke="#15181e" strokeWidth="1.8" />
      <rect x="21.5" y="10.5" width="21" height="43" rx="4" fill="url(#u-ekran)" />
      {/* Ekrandan geçen çapraz yansıma: camı cam yapan tek detay. */}
      <path d="M21.5 42 42.5 22v7.5L26 46h-1a3.5 3.5 0 0 1-3.5-3.5z" fill="#ffffff" opacity="0.16" />
      <path d="M21.5 26.5 34 14.5h6L21.5 33z" fill="#ffffff" opacity="0.12" />
      <rect x="28.5" y="7.8" width="7" height="2" rx="1" fill="#0e1014" />
      <path d="M41.5 8.5A5 5 0 0 1 44 12.8v38.4a5 5 0 0 1-2.5 4.3z" fill="#0e1014" opacity="0.35" />
      <Parlama d="M20.5 12a3 3 0 0 1 1.6-2.6v45.2A3 3 0 0 1 20.5 52z" opacity="0.3" />
    </svg>
  );
}

function Ayakkabi() {
  return (
    <svg viewBox="0 0 64 64" className="oyun-urun-svg">
      <defs>
        <Degrade id="u-ayakkabi" acik="#ffffff" koyu="#c9d4e2" />
        <Degrade id="u-serit" acik="#3fd6c0" koyu="#16907f" />
      </defs>
      {/* Bilekten bağlamalı bir spor ayakkabı. Alçak modeli birkaç kez denedik:
          52 pikselde ne yapsak bilgisayar faresine benziyordu. Sağda dik duran
          bilek boğazı ile sola uzanan burun, bu ölçekte ayakkabıyı tek başına
          okutan siluet. */}
      <path
        d="M45 11a6 6 0 0 1 6 6v25.5H8.4c-1.3-8.4 2.4-14 8.8-17.3L30.5 18.6V17a6 6 0 0 1 6-6z"
        fill="url(#u-ayakkabi)"
        stroke="#8fa0b5"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M43.5 11.3A6 6 0 0 1 51 17v25.5h-7.5z" fill="#adbccd" opacity="0.5" />
      {/* Boğaz bandı ve bağcıklar: dik duran parçayı bir kutu olmaktan çıkarıyor. */}
      <rect x="30.5" y="11.5" width="20.5" height="7" rx="3" fill="#9aa9bb" stroke="#7b8b9e" strokeWidth="1.2" />
      <path d="M33 24h13M33 29.5h13M33 35h13" stroke="#9aa9bb" strokeWidth="1.9" strokeLinecap="round" />
      {/* Yan şerit: markanın imzası, ayakkabıyı ayakkabı yapan işaret. */}
      <path d="M16 40.5c2.6-4.6 6.4-7.8 11.4-10" fill="none" stroke="url(#u-serit)" strokeWidth="4.8" strokeLinecap="round" />
      <path d="M6.5 42h45a3 3 0 0 1 3 3v1a4 4 0 0 1-4 4H10A3.5 3.5 0 0 1 6.5 46.5z" fill="#2b3442" stroke="#161c26" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M7 46h47" stroke="#59657a" strokeWidth="1.4" />
      <Parlama d="M11.5 39c1-4.6 3.6-8 7.4-10.4l2.2 2.4c-3.2 2-5.4 4.8-6.4 8z" opacity="0.8" />
    </svg>
  );
}

function Kamera() {
  return (
    <svg viewBox="0 0 64 64" className="oyun-urun-svg">
      <defs>
        <Degrade id="u-kamera" acik="#5a6270" koyu="#22262e" />
        <radialGradient id="u-lens" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#7fd0ff" />
          <stop offset="0.5" stopColor="#2a6bb8" />
          <stop offset="1" stopColor="#101c33" />
        </radialGradient>
      </defs>
      <rect x="21" y="12" width="16" height="7" rx="2.5" fill="#3a414d" stroke="#14171d" strokeWidth="1.5" />
      <rect x="6" y="17" width="52" height="33" rx="7" fill="url(#u-kamera)" stroke="#14171d" strokeWidth="1.8" />
      <path d="M50 18.5A5 5 0 0 1 56 23v21a5 5 0 0 1-6 5z" fill="#0d1015" opacity="0.35" />
      <circle cx="32" cy="34" r="12.5" fill="#1a1f27" stroke="#0d1015" strokeWidth="1.5" />
      <circle cx="32" cy="34" r="9" fill="url(#u-lens)" />
      <circle cx="28.4" cy="30.4" r="2.8" fill="#ffffff" opacity="0.7" />
      <circle cx="35.5" cy="38" r="1.4" fill="#ffffff" opacity="0.35" />
      <rect x="44" y="22" width="7" height="4.5" rx="2" fill="#ffe8a3" stroke="#b99a35" strokeWidth="1.1" />
      <Parlama d="M9 24a4 4 0 0 1 3.4-4v27A4 4 0 0 1 9 43z" opacity="0.26" />
    </svg>
  );
}

function Sapka() {
  return (
    <svg viewBox="0 0 64 64" className="oyun-urun-svg">
      <defs>
        <Degrade id="u-sapka" acik="#ff8a7a" koyu="#c92f28" />
      </defs>
      <path
        d="M50.5 35c5.6 1 9.5 3.6 9.5 6 0 2.2-3.2 3-7.6 3H14c-3 0-4.6-1.2-4.6-3.2 0-2.4 2.4-4.6 5.2-5.8z"
        fill="#e0463c"
        stroke="#8f1f1a"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M32 15.5c10.2 0 18.5 8.2 18.5 19.5h-37C13.5 23.7 21.8 15.5 32 15.5z" fill="url(#u-sapka)" stroke="#8f1f1a" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M41 17.4c5.7 3.3 9.5 9.7 9.5 17.6H41z" fill="#8f1f1a" opacity="0.25" />
      <Parlama d="M20.5 34.5c0-8 3.6-14.5 8.4-16.8-3 4-4.8 9.8-4.8 16.8z" opacity="0.4" />
      <circle cx="32" cy="15.8" r="2.6" fill="#ff8a7a" stroke="#8f1f1a" strokeWidth="1.5" />
    </svg>
  );
}

function Saat() {
  return (
    <svg viewBox="0 0 64 64" className="oyun-urun-svg">
      <defs>
        <Degrade id="u-kayis" acik="#4a5262" koyu="#1e222b" />
        <Degrade id="u-kasa" acik="#f2f5f9" koyu="#9fadbe" />
      </defs>
      <rect x="25" y="5" width="14" height="54" rx="4.5" fill="url(#u-kayis)" stroke="#13161c" strokeWidth="1.6" />
      <path d="M25 16h14M25 48h14" stroke="#0f1218" strokeWidth="1.2" opacity="0.5" />
      <rect x="15" y="19" width="34" height="26" rx="11" fill="url(#u-kasa)" stroke="#7c8b9d" strokeWidth="1.6" />
      <circle cx="32" cy="32" r="10" fill="#1b2531" stroke="#0e141c" strokeWidth="1.3" />
      <path d="M32 25.5v7l4.5 3" stroke="#7fd0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M25.5 22.5a11 11 0 0 0-1.2 15.5c-3-4.6-2.6-11.4 1.2-15.5z" fill="#ffffff" opacity="0.55" />
      <rect x="48" y="29" width="3.5" height="6" rx="1.6" fill="#c2cddb" stroke="#7c8b9d" strokeWidth="1.1" />
    </svg>
  );
}

function Canta() {
  return (
    <svg viewBox="0 0 64 64" className="oyun-urun-svg">
      <defs>
        <Degrade id="u-canta" acik="#5fd39a" koyu="#1c8b5f" />
        <Degrade id="u-kapak" acik="#4cc48c" koyu="#157a52" />
      </defs>
      {/* Askılar gövdenin arkasında: önce onlar çiziliyor. */}
      <path d="M24 22V16a8 8 0 0 1 16 0v6" fill="none" stroke="#0f5f3f" strokeWidth="3.4" strokeLinecap="round" />
      <rect x="12" y="20" width="40" height="36" rx="10" fill="url(#u-canta)" stroke="#0f5f3f" strokeWidth="1.8" />
      <path d="M44 21.4A10 10 0 0 1 52 30v16a10 10 0 0 1-8 9.8z" fill="#0b4a31" opacity="0.24" />
      <path d="M12 30v-1.5C12 21.6 20.9 16 32 16s20 5.6 20 12.5V30c0 3-2 4.6-5 4.6H17c-3 0-5-1.6-5-4.6z" fill="url(#u-kapak)" stroke="#0f5f3f" strokeWidth="1.8" strokeLinejoin="round" />
      <rect x="27" y="30" width="10" height="8" rx="2.6" fill="#f6d98a" stroke="#a5852f" strokeWidth="1.4" />
      <rect x="22" y="42" width="20" height="9" rx="3.4" fill="#0b4a31" opacity="0.3" />
      <Parlama d="M17 24.5c2.6-3.4 7-5.8 11.5-6.8-3.8 2-7 5-9 9z" opacity="0.5" />
    </svg>
  );
}

function Gozluk() {
  return (
    <svg viewBox="0 0 64 64" className="oyun-urun-svg">
      <defs>
        <Degrade id="u-cam" acik="#bfe6ff" koyu="#5fa8d8" />
      </defs>
      <path d="M8 26c-2.4 0-4-1.2-4-2.6M56 26c2.4 0 4-1.2 4-2.6" stroke="#8a5a1e" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M26 30h12" stroke="#c98a2e" strokeWidth="3.4" strokeLinecap="round" />
      <rect x="5" y="24" width="22" height="16" rx="7" fill="url(#u-cam)" stroke="#c98a2e" strokeWidth="3" />
      <rect x="37" y="24" width="22" height="16" rx="7" fill="url(#u-cam)" stroke="#c98a2e" strokeWidth="3" />
      <path d="M9 34c0-4 3-7 7-7.4-3 1.6-5 4.4-5.4 8z" fill="#ffffff" opacity="0.75" />
      <path d="M41 34c0-4 3-7 7-7.4-3 1.6-5 4.4-5.4 8z" fill="#ffffff" opacity="0.75" />
    </svg>
  );
}

function Matkap() {
  return (
    <svg viewBox="0 0 64 64" className="oyun-urun-svg">
      <defs>
        <Degrade id="u-matkap" acik="#ffc861" koyu="#d1830c" />
        <Degrade id="u-matkap-koyu" acik="#4d5566" koyu="#20252f" />
      </defs>
      {/* Uç, mandren, gövde, tutamak, akü: matkabı okutan beş parça. Tutamak
          gövdeden ayrı bir renkte, yoksa hepsi tek bir turuncu leke oluyor. */}
      <path d="M50 26.4h9.5v3.2H50z" fill="#7d8797" stroke="#454d5b" strokeWidth="1.3" strokeLinejoin="round" />
      <rect x="42" y="22" width="8.5" height="12" rx="2.4" fill="#9aa4b3" stroke="#454d5b" strokeWidth="1.5" />
      {/* Tutamak gövdenin altından uzanıyor ve akünün üstünde bitiyor. Kısa
          bıraktığımızda matkap bir kutuya, tutamak da bir çıkıntıya dönüyordu. */}
      <path d="M23.5 30h13.5l-1.4 17.5H24.4z" fill="url(#u-matkap-koyu)" stroke="#171b24" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M23.5 37.5h-3.6a2 2 0 0 0 0 4h3.6z" fill="#171b24" />
      <rect x="19.5" y="46.5" width="19" height="9" rx="3" fill="#39414f" stroke="#171b24" strokeWidth="1.6" />
      <path d="M13 17h25a6.5 6.5 0 0 1 6.5 6.5v9A6.5 6.5 0 0 1 38 39H13a5.5 5.5 0 0 1-5.5-5.5v-11A5.5 5.5 0 0 1 13 17z" fill="url(#u-matkap)" stroke="#96600a" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M38 17.6a6.5 6.5 0 0 1 6.5 6.5v8.4A6.5 6.5 0 0 1 38 38.6z" fill="#8a5608" opacity="0.28" />
      <path d="M21.5 34.5h4.5v5a2.2 2.2 0 0 1-4.4.4z" fill="#171b24" opacity="0.55" />
      <Parlama d="M12 19.5h26a4.6 4.6 0 0 1 3.4 1.6H12.6a2 2 0 0 0-1.8 1z" opacity="0.5" />
      <circle cx="17.5" cy="28" r="2.6" fill="#fff3d6" stroke="#96600a" strokeWidth="1.3" />
    </svg>
  );
}

/**
 * Oyunun ürün havuzu. Kiralık eşya çeşitliliğini göstersin diye giyimden
 * elektroniğe kadar dağılıyor — balon patladığında ne çıkacağı sürpriz olsun.
 */
export const URUNLER: Urun[] = [
  { anahtar: "tisort", ad: "Tişört", Cizim: Tisort },
  { anahtar: "pantolon", ad: "Pantolon", Cizim: Pantolon },
  { anahtar: "takim", ad: "Takım elbise", Cizim: TakimElbise },
  { anahtar: "telefon", ad: "Telefon", Cizim: Telefon },
  { anahtar: "ayakkabi", ad: "Spor ayakkabı", Cizim: Ayakkabi },
  { anahtar: "kamera", ad: "Fotoğraf makinesi", Cizim: Kamera },
  { anahtar: "sapka", ad: "Şapka", Cizim: Sapka },
  { anahtar: "saat", ad: "Kol saati", Cizim: Saat },
  { anahtar: "canta", ad: "Sırt çantası", Cizim: Canta },
  { anahtar: "gozluk", ad: "Güneş gözlüğü", Cizim: Gozluk },
  { anahtar: "matkap", ad: "Matkap", Cizim: Matkap },
];
