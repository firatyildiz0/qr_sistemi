import { productQrDataUrl } from "@/lib/qr";
import QrDownloadButtons from "@/components/admin/QrDownloadButtons";
import { code128, QUIET_ZONE } from "@/lib/barkod";

export default async function QRCodeCard({
  productId,
  productName,
  productBarcode,
}: {
  productId: string;
  productName: string;
  /** Etikete basılan numara; girilmemişse null. */
  productBarcode: string | null;
}) {
  const dataUrl = await productQrDataUrl(productId);

  return (
    <div className="card">
      <h2 className="eyebrow mb-4 text-ink-muted">QR kod</h2>
      <div className="relative mx-auto flex h-40 w-40 items-center justify-center">
        <span className="qr-pulse-ring" />
        {/* Deliberately white in both themes: the QR needs a light quiet zone
            around it or scanners lose the finder patterns. */}
        <div className="relative flex h-full w-full items-center justify-center rounded-md border border-border bg-white p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUrl} alt="Ürün QR kodu" className="h-full w-full" />
        </div>
      </div>
      {/* İndirilen etikette ne yazacağı burada görünüyor: ad, altında numara
          ve numaranın çizgisi. */}
      <p className="mt-3 truncate text-center text-sm font-semibold text-ink" title={productName}>
        {productName}
      </p>
      {productBarcode ? (
        <>
          <p className="mt-0.5 text-center font-mono text-base font-bold tracking-widest text-ink">
            {productBarcode}
          </p>
          <BarcodeBars text={productBarcode} />
        </>
      ) : (
        <p className="mt-0.5 text-center text-xs text-ink-muted">
          Barkod numarası girilmedi
        </p>
      )}

      <QrDownloadButtons
        productId={productId}
        productName={productName}
        productBarcode={productBarcode}
        qrDataUrl={dataUrl}
      />
    </div>
  );
}

/**
 * Numaranın çizgisi. QR gibi iki temada da beyaz zemin üstünde siyah: ekrandan
 * okutulduğunda da çalışsın, sessiz alan zeminin içinde kalsın.
 */
function BarcodeBars({ text }: { text: string }) {
  const { bars, modules } = code128(text);
  const width = modules + QUIET_ZONE * 2;

  return (
    <div className="mx-auto mt-2 w-fit rounded-md border border-border bg-white px-1 py-2">
      <svg
        viewBox={`0 0 ${width} 30`}
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
        aria-label={`${text} barkodu`}
        role="img"
        className="block h-10"
        style={{ width: Math.min(width * 2, 240) }}
      >
        {bars.map((bar) => (
          <rect key={bar.x} x={QUIET_ZONE + bar.x} y={0} width={bar.width} height={30} fill="#000" />
        ))}
      </svg>
    </div>
  );
}
