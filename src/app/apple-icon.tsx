import { ImageResponse } from "next/og";
import { BrandIcon } from "@/lib/brand-icon";

// iOS ana ekran simgesi. Safari manifest'teki simgeleri kullanmıyor, kendi
// `apple-touch-icon` bağlantısını arıyor — Next bu dosya için onu kendisi
// ekliyor.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<BrandIcon size={180} />, size);
}
