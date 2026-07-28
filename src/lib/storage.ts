export const PRODUCT_IMAGES_BUCKET = "product-images";

export const MAX_PRODUCT_IMAGES = 2;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

/**
 * Public storage URLs look like
 * `{SUPABASE_URL}/storage/v1/object/public/product-images/{owner}/{file}`.
 * Returns the object key (everything after the bucket), or null if the URL
 * doesn't point at our bucket — which is also what keeps a hand-crafted form
 * submission from making the server delete somebody else's object.
 */
export function storagePathFromUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  const path = url.slice(index + marker.length);
  return path || null;
}

export function isProductImageUrl(url: string): boolean {
  return storagePathFromUrl(url) !== null;
}
