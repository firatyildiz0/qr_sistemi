import QRCode from "qrcode";

export function productUrl(productId: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/product/${productId}`;
}

export async function productQrDataUrl(productId: string) {
  return QRCode.toDataURL(productUrl(productId), {
    margin: 1,
    width: 320,
  });
}

export async function productQrPng(productId: string) {
  return QRCode.toBuffer(productUrl(productId), {
    margin: 1,
    width: 640,
    type: "png",
  });
}

export async function productQrSvg(productId: string) {
  return QRCode.toString(productUrl(productId), {
    margin: 1,
    type: "svg",
  });
}
