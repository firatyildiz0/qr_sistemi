/* eslint-disable @next/next/no-img-element -- küçük, zaten kırpılıp küçültülmüş bir kare; optimizasyon katmanı gereksiz */

/**
 * Satıcının profil görseli: yüklediği fotoğraf, yoksa seçtiği renkte baş
 * harfi. Kenar çubuğu, mobil üst çubuk, menü ve Hesabım ekranı aynı bileşeni
 * kullanıyor; biri değişince hepsi aynı görünüyor.
 */
export default function ProfilAvatari({
  url,
  renk,
  harf,
  className = "h-10 w-10 text-base",
}: {
  url: string | null;
  renk: string | null;
  harf: string;
  className?: string;
}) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className={`shrink-0 rounded-full object-cover shadow-[0_6px_14px_-8px_var(--color-accent)] ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      style={renk ? { backgroundColor: renk } : undefined}
      className={`flex shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-white shadow-[0_6px_14px_-8px_var(--color-accent)] ${className}`}
    >
      {harf}
    </span>
  );
}
