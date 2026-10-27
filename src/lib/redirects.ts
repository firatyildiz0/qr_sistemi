/**
 * `next` arrives from a query string, so it decides where a *successfully
 * authenticated* seller lands — exactly the redirect an attacker wants to own.
 *
 * Pattern checks on the raw string are not enough: browsers strip tabs and
 * newlines from URLs, so "/\t/evil.com" passes a "single leading slash" test
 * and still resolves to "//evil.com". Instead the value is resolved the way a
 * browser would, against a placeholder origin; anything that lands on another
 * origin is rejected, and only the normalised path is handed back.
 */
const BASE = "http://rentqr.invalid";

export function safeNextPath(next: string | undefined): string {
  if (!next || !next.startsWith("/")) return "/admin";

  try {
    const url = new URL(next, BASE);
    if (url.origin !== BASE) return "/admin";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/admin";
  }
}
