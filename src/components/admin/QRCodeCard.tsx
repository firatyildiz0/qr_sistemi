import { productQrDataUrl, productUrl } from "@/lib/qr";

export default async function QRCodeCard({ productId }: { productId: string }) {
  const dataUrl = await productQrDataUrl(productId);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6">
      <h2 className="mb-3 text-sm font-medium text-neutral-700">QR code</h2>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dataUrl} alt="Product QR code" className="h-40 w-40" />
      <p className="mt-3 break-all text-xs text-neutral-400">{productUrl(productId)}</p>
      <div className="mt-4 flex gap-3">
        <a
          href={`/api/products/${productId}/qr?format=png`}
          download
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50"
        >
          Download PNG
        </a>
        <a
          href={`/api/products/${productId}/qr?format=svg`}
          download
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50"
        >
          Download SVG
        </a>
      </div>
    </div>
  );
}
