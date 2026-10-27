/**
 * Voyo Labs'in işareti: bir halkanın içinde, sol kanadı düz, sağ kanadı
 * yukarı kıvrılan V. İki kanadı ayıran ince yarık sol kanadın ucundan aşağı
 * iniyor.
 *
 * Çizim markanın kendi logo dosyasından çıkarıldı; halkanın kalınlığı ve V'nin
 * halka içindeki yeri oradaki oranlarla aynı. Tek renk, rengi `currentColor`'dan
 * alıyor: açık zeminde mürekkep, koyu zeminde beyaz — kullanan yerin `text-*`
 * sınıfı belirliyor.
 */
export function VoyoIsaret({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={className}>
      <circle cx="50" cy="50" r="47.6" fill="none" stroke="currentColor" strokeWidth="4.8" />
      <path
        transform="translate(12.99 19.67) scale(1.572)"
        fill="currentColor"
        d="M19.9,42.9C19.8,42.8 19.7,42.7 19.6,42.4C19.1,40.7 18.1,38.0 17.1,35.6C16.8,34.8 16.5,34.1 16.5,34.1C16.5,34.0 15.0,31.1 14.5,30.0C13.9,28.8 13.0,27.1 12.8,26.9C12.7,26.7 12.6,26.6 12.6,26.6C12.6,26.6 12.5,26.3 12.4,26.1C12.2,25.8 12.0,25.5 12.0,25.4C11.9,25.3 11.8,25.2 11.8,25.1C11.5,24.5 10.3,22.6 9.7,21.8C8.8,20.2 6.0,16.1 4.8,14.4C4.2,13.6 3.7,12.8 3.6,12.6C3.5,12.4 3.4,12.3 3.3,12.3C2.7,11.5 0.5,8.6 0.4,8.4C0.2,7.9 0.4,7.8 3.3,6.2C6.1,4.7 5.7,4.6 7.2,6.8C7.7,7.6 8.4,8.6 8.7,9.1C9.0,9.5 9.9,10.8 10.7,12.0C13.2,15.7 13.5,16.2 15.7,19.8C16.5,21.0 17.3,22.2 17.4,22.5C19.0,25.0 19.5,25.8 19.4,26.1C19.4,26.3 18.9,27.5 18.3,28.9C17.2,31.6 17.2,31.6 17.3,31.8C17.5,32.0 18.1,31.8 18.1,31.5C18.1,31.5 18.5,30.5 19.1,29.4C25.5,16.2 33.0,8.8 43.1,5.4C43.7,5.2 44.3,5.0 44.6,5.0C45.1,5.0 44.9,4.8 46.6,6.7C48.1,8.4 48.1,8.5 46.4,9.1C41.5,10.6 37.2,13.4 33.8,17.3C30.5,21.1 26.9,27.0 24.3,32.7C24.1,33.2 23.9,33.7 23.7,34.0C23.0,35.5 21.9,38.5 21.1,40.8C20.3,43.0 20.3,43.1 19.9,42.9Z"
      />
    </svg>
  );
}

/**
 * Solda işaret, yanında iki satırlık ad — üstte aralıklı kalın "VOYOLABS",
 * altta ince "STUDIO". Logo dosyasındaki dikdörtgen çerçeve bilerek yok;
 * işaretle yazı arasındaki oranlar oradakiyle aynı. Ad görsel değil yazı: her
 * ölçüde net çıkıyor ve ekran okuyucu onu okuyor.
 */
export default function VoyoLogo() {
  return (
    <span className="flex items-center gap-[7px]">
      <VoyoIsaret className="h-[45px] w-[45px] shrink-0" />
      <span className="flex flex-col leading-none">
        <span className="text-[15.5px] font-bold tracking-[0.14em]">VOYOLABS</span>
        <span className="mt-[2px] ml-[1px] text-[10.75px] font-normal tracking-[0.04em]">STUDIO</span>
      </span>
    </span>
  );
}
