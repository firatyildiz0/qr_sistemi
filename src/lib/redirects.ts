/**
 * `next` arrives from a query string, so it decides where a *successfully
 * authenticated* seller lands — exactly the redirect an attacker wants to own.
 *
 * A leading "/" is not enough to prove the target is ours: "//evil.com" and
 * "/\evil.com" are protocol-relative absolute URLs that browsers resolve to
 * another origin. Requiring a single "/" followed by something that is neither
 * a slash nor a backslash keeps the redirect inside this app.
 */
export function safeNextPath(next: string | undefined): string {
  return next && /^\/(?![/\\])/.test(next) ? next : "/admin";
}
