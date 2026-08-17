import { productQrDataUrl } from "@/lib/qr";
import QrDownloadButtons from "@/components/admin/QrDownloadButtons";

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
      {/* İndirilen etikette ne yazacağı burada görünüyor: ad, altında numara. */}
      <p className="mt-3 truncate text-center text-sm font-semibold text-ink" title={productName}>
        {productName}
      </p>
      {productBarcode ? (
        <p className="mt-0.5 text-center font-mono text-base font-bold tracking-widest text-ink">
          {productBarcode}
        </p>
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
