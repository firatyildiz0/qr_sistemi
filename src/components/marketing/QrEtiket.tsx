import QRCode from "qrcode";

/** Etiketteki kodun gerçekten götürdüğü yer: okutan anasayfaya gelir. */
const QR_TARGET = "https://qrsistemi.vercel.app/";

/**
 * Modüller sunucuda tek bir SVG yoluna çevriliyor: 600 küçük kutu yerine tek
 * `<path>`, ve her ölçekte keskin. Okunabilmesi için modüller bitişik ve
 * etrafında beyaz sessiz alan var (etiketin iç boşluğu).
 */
const { size: QR_SIZE, path: QR_PATH } = (() => {
  const { modules } = QRCode.create(QR_TARGET, { errorCorrectionLevel: "L" });
  const size = modules.size;
  let path = "";
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (modules.data[y * size + x]) path += `M${x} ${y}h1v1h-1z`;
    }
  }
  return { size, path };
})();

/**
 * Anasayfanın kahraman görseli: bir ürünün üstüne yapıştırılmış RentQR etiketi.
 *
 * Etiket her iki temada da beyaz kalıyor — gerçek bir etiket kâğıttır ve
 * kodun okunması için koyu modüllerin açık zeminde durması gerekiyor. Sol
 * kenardaki delikler zeminin renginden açılıyor, böylece koyu temada da
 * kâğıttan koparılmış gibi duruyor.
 */
export default function QrEtiket() {
  return (
    <div className="relative w-full max-w-[420px] -rotate-[4deg] motion-reduce:rotate-0">
      <div aria-hidden className="absolute inset-0 translate-x-3.5 translate-y-4 rounded-[28px] bg-border" />
      <figure
        aria-label="Bir ürüne yapıştırılmış RentQR etiketi"
        className="relative m-0 flex rounded-[28px] bg-white bg-[radial-gradient(circle_at_0_50%,var(--color-paper)_7px,transparent_7.5px)] bg-[length:14px_22px] bg-repeat-y text-[#1f1413] shadow-[0_30px_60px_-30px_var(--app-shadow)]"
      >
        <div className="flex w-16 flex-none items-center justify-center border-r-2 border-dashed border-[#e9e1df]">
          <span className="vitrin-baslik rotate-180 text-lg font-extrabold text-[#d81f26] [writing-mode:vertical-rl]">
            RentQR
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-4 p-6 sm:p-7">
          <svg
            viewBox={`0 0 ${QR_SIZE} ${QR_SIZE}`}
            shapeRendering="crispEdges"
            className="aspect-square w-full"
            role="img"
            aria-label="QR kod"
          >
            <path d={QR_PATH} fill="#1f1413" />
          </svg>
          <figcaption className="flex flex-col gap-1">
            <span className="vitrin-baslik text-2xl font-extrabold">Abiye elbise, lacivert</span>
            <span className="text-sm tabular-nums text-[#7a6663]">Barkod 8690 1002 4817</span>
          </figcaption>
          <p className="m-0 flex items-center gap-2.5 border-t border-[#e9e1df] pt-3.5 text-sm font-semibold text-[#5e4c49]">
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="h-5 w-5 shrink-0"
              fill="none"
              stroke="#d81f26"
              strokeWidth={2}
              strokeLinecap="round"
            >
              <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16" />
            </svg>
            Kameranızla okutun, tarih seçin
          </p>
        </div>
      </figure>
    </div>
  );
}
