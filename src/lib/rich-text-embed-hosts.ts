/**
 * WHO may become a frame inside somebody's page. No imports, on purpose: this is the decision, and the CI runs
 * it without installing the template's 335 MB of dependencies (it never does, and the Dockerfile says why).
 * `rich-text-sanitize.ts` is the wiring around DOMPurify and re-exports both names.
 *
 * The same list exists as `EMBED_HOSTS` in the migrator (`legacy_migration/embeds.py`), which is what WRITES
 * those frames. Let the two diverge and the frame disappears in the browser with no error, no warning and no
 * line in the report — `test_legacy_richtext.py` holds them together.
 */

// A CLOSED list, not a heuristic: an iframe is somebody else's page inside yours, so the question is never
// "does this look safe" but "do I know who is on the other side". The anchors matter as much as the names:
// unanchored, `youtube.com.evil.com` and `evilyoutube.com` both pass.
export const EMBED_HOSTS = [
  /^([\w-]+\.)*youtube\.com$/, /^([\w-]+\.)*youtube-nocookie\.com$/, /^([\w-]+\.)*youtu\.be$/,
  /^([\w-]+\.)*vimeo\.com$/, /^([\w-]+\.)*google\.com$/, /^([\w-]+\.)*google\.[a-z.]{2,6}$/,
  /^([\w-]+\.)*spotify\.com$/, /^([\w-]+\.)*soundcloud\.com$/, /^([\w-]+\.)*airtable\.com$/,
  /^([\w-]+\.)*canva\.com$/, /^([\w-]+\.)*facebook\.com$/, /^([\w-]+\.)*instagram\.com$/,
  /^([\w-]+\.)*twitter\.com$/, /^([\w-]+\.)*x\.com$/,
];

export function embedAllowed(src: string): boolean {
  try {
    // The invalid base makes a relative URL land on a host no rule accepts, instead of raising.
    const u = new URL(src, "https://x.invalid");
    return u.protocol === "https:" && EMBED_HOSTS.some((re) => re.test(u.hostname));
  } catch {
    return false;
  }
}
