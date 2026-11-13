/**
 * Reading and writing the session cookie.
 *
 * A module of its own, and not four lines inside `fab-client.tsx`, because `fab-client` imports React and the UI —
 * so nothing in it can be exercised by a test. The session is the one thing in the SDK whose failure mode is
 * invisible: a token that cannot be read does not raise, it just logs the person out, and the screen that appears
 * is the same one a first-time visitor sees.
 *
 * Both bugs below were found by probing rather than by reading, and both were in production:
 *
 *   • `document.cookie.split("; ")` requires the space. The browser normally writes one, but nothing guarantees it —
 *     anything that writes `document.cookie` by hand, or a server that sets several cookies in one header, can
 *     produce `a=1;fab_token_x=…`, and the session silently disappeared.
 *   • `pair.split("=")[1]` truncates the value at the FIRST `=`. A JWT has none, so this held right up until the
 *     day something else was stored there.
 */

const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/** The value of `name`, or undefined. It splits on the first `=` only, and does not depend on the separator's spacing. */
export function readCookie(name: string, jar?: string): string | undefined {
  const source = jar ?? (typeof document !== "undefined" ? document.cookie : "");
  if (!source) return undefined;
  for (const pair of source.split(";")) {
    const eq = pair.indexOf("=");
    if (eq < 0) continue;
    if (pair.slice(0, eq).trim() !== name) continue;
    const raw = pair.slice(eq + 1).trim();
    // A value written before this module escaped nothing, and a JWT survives a decode untouched — so decoding is
    // safe for what is already out there. A malformed escape throws, and the raw value is a better answer than none.
    try { return decodeURIComponent(raw); } catch { return raw; }
  }
  return undefined;
}

/** Writes the cookie, or expires it when `value` is empty. Not httpOnly: the JS itself reads the session back. */
export function writeCookie(name: string, value?: string): void {
  if (typeof document === "undefined") return;
  document.cookie = value
    ? `${name}=${encodeURIComponent(value)}; path=/; max-age=${MAX_AGE_SECONDS}; samesite=lax`
    : `${name}=; path=/; max-age=0; samesite=lax`;
}
