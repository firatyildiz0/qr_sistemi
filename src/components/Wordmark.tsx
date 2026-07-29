import type { CSSProperties } from "react";

const LETTERS = [..."RentQR"];

/**
 * Marka adı, sayfa ilk açıldığında harflerin içinden bir renk dalgası geçecek
 * biçimde. Dalga soldan sağa ilerliyor ve tek seferde bitiyor: sürekli renk
 * değiştiren bir logo dikkati işin kendisinden çalardı.
 *
 * Harfler ayrı `span`'lere bölündüğü için ekran okuyucu kelimeyi harf harf
 * heceleyebilirdi; o yüzden gerçek metin `sr-only` olarak bir kez veriliyor ve
 * görünen harfler `aria-hidden` kalıyor.
 *
 * Renkler `currentColor`dan başlayıp ona dönüyor (bkz. globals.css), dolayısıyla
 * bileşen koyu kenar çubuğunda da açık zeminli sayfada da olduğu gibi çalışır.
 */
export default function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={className}>
      <span className="sr-only">RentQR</span>
      {LETTERS.map((letter, index) => (
        <span
          key={index}
          aria-hidden="true"
          className="wordmark-letter"
          style={{ "--i": index } as CSSProperties}
        >
          {letter}
        </span>
      ))}
    </span>
  );
}
