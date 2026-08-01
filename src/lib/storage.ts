export const PRODUCT_IMAGES_BUCKET = "product-images";

export const MAX_PRODUCT_IMAGES = 2;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

/**
 * Public storage URLs look like
 * `{SUPABASE_URL}/storage/v1/object/public/product-images/{owner}/{file}`.
 *
 * The host is part of the prefix on purpose. Searching for the path alone
 * (`url.indexOf("/storage/v1/...")`) accepted
 * `https://elsewhere.example/storage/v1/object/public/product-images/x.png`
 * too, so a hand-crafted form submission could park a foreign URL on a product
 * — and hand `remove()` a key it never minted. Anchoring to our own project
 * URL is what makes "points at our bucket" actually mean it.
 */
const PUBLIC_URL_PREFIX = `${(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(
  /\/+$/,
  ""
)}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/`;

/**
 * Anything that would make the key mean something other than a plain object in
 * this bucket: a traversal out of the owner's folder, or a query/fragment that
 * turns the rest of the URL into part of the key. The storage policies already
 * refuse a key whose first segment isn't the caller's uid, but a value this
 * shape has no legitimate source and shouldn't reach them.
 */
const SUSPICIOUS_KEY = /(^\/)|(\.\.)|[?#]/;

/**
 * Returns the object key (everything after the bucket), or null if the URL
 * doesn't point at our bucket — which is also what keeps a hand-crafted form
 * submission from making the server delete somebody else's object.
 */
export function storagePathFromUrl(url: string): string | null {
  // No configured project URL means nothing can be verified; refuse rather
  // than fall back to matching on the path alone.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  if (!url.startsWith(PUBLIC_URL_PREFIX)) return null;

  const path = url.slice(PUBLIC_URL_PREFIX.length);
  if (!path || SUSPICIOUS_KEY.test(path)) return null;

  return path;
}

export function isProductImageUrl(url: string): boolean {
  return storagePathFromUrl(url) !== null;
}
