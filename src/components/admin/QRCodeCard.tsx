import { productQrDataUrl, productUrl } from "@/lib/qr";
import { IconDownload } from "@/components/icons";

export default async function QRCodeCard({ productId }: { productId: string }) {
  const dataUrl = await productQrDataUrl(productId);

  return (
    <div className="card">
      <h2 className="eyebrow mb-4 text-ink-muted">QR kod</h2>
      <div className="relative mx-auto flex h-40 w-40 items-center justify-center">
        <span className="qr-pulse-ring" />
        <div className="relative flex h-full w-full items-center justify-center rounded-md border border-border bg-white p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUrl} alt="Ürün QR kodu" className="h-full w-full" />
        </div>
      </div>
      <p className="mt-4 break-all text-center text-xs text-ink-muted">{productUrl(productId)}</p>
      <div className="mt-5 flex gap-3">
        <a
          href={`/api/products/${productId}/qr?format=png`}
          download
          className="btn btn-secondary flex-1 text-xs"
        >
          <IconDownload className="h-3.5 w-3.5" />
          PNG
        </a>
        <a
          href={`/api/products/${productId}/qr?format=svg`}
          download
          className="btn btn-secondary flex-1 text-xs"
        >
          <IconDownload className="h-3.5 w-3.5" />
          SVG
        </a>
      </div>
    </div>
  );
}
