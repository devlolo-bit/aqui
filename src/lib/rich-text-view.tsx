/**
 * The renderer of the saved rich-text content (HTML). It SANITIZES (see `rich-text-sanitize.ts`, isomorphic → it runs on the SSR and on the client) before
 * injecting — user content (a feed/community) is NEVER trusted. Server-safe: the SSR shows the content (good for SEO).
 */
import { sanitizeRichText } from "./rich-text-sanitize";

// The typography of the rendered content, and it has to cover MORE than the editor's toolbar emits.
//
// It used to style four things — `img`, `h2`, `ul`, `a` — which matched the toolbar exactly (heading + bullet list)
// and nothing else. But the toolbar is not the only writer: the AI seeds rich-text fields directly, an imported
// document arrives as HTML, and a model's answer is converted to HTML before being shown. All three produce `h1`,
// `h3`, `ol`, `code` and multiple `p`s, and every one of them landed unstyled.
//
// Two of those were not cosmetic. An `ol` with no marker and no padding inherits `list-style: none` from the reset,
// so a numbered list rendered WITHOUT ITS NUMBERS — the model wrote "1., 2., 3." and the reader saw four sentences in
// no particular order. And `p` with no spacing ran every paragraph together into one block, which is the "faltou uma
// formatação aqui" reported on a policy page. Losing the ordering of a list is losing content, not styling.
//
// Kept as arbitrary variants on the wrapper (not a global stylesheet) so it stays scoped to rendered content and a
// caller can still override any of it through `className`. EXPORTED because the EDITOR renders the same content
// while you type: with its own shorter list, what you wrote and what the reader sees disagreed on every tag the
// editor did not know about.
export const RICH_TEXT_TYPOGRAPHY = [
  "[&_h1]:mt-6 [&_h1]:mb-2 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:leading-tight",
  "[&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:leading-tight",
  "[&_h3]:mt-5 [&_h3]:mb-1.5 [&_h3]:text-base [&_h3]:font-semibold",
  // No `uppercase` here: this renders text somebody else wrote, and shouting "NOTES" at a reader who typed
  // "Notes" is the renderer editing the content. Size and weight carry the hierarchy; the letters stay theirs.
  "[&_h4]:mt-4 [&_h4]:mb-1 [&_h4]:text-sm [&_h4]:font-semibold",
  "[&>*:first-child]:mt-0",           // the first block never pushes the container open
  // A LONG WORD WITH NO SPACES pushes the whole page sideways. It is not a corner case: pasted content is full
  // of bare URLs, and one migrated page whose entire body was a 300-character Airtable link measured 1539px of
  // content inside a 375px screen. `break-words` only acts when a word does not fit, so normal prose is
  // untouched.
  "break-words",
  "[&_p]:my-3 [&_p:last-child]:mb-0",
  "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5",
  "[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_li]:my-1 [&_li>ul]:my-1 [&_li>ol]:my-1",
  "[&_a]:underline [&_a]:underline-offset-2",
  "[&_strong]:font-semibold [&_em]:italic",
  "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em]",
  "[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:text-sm",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:italic",
  "[&_hr]:my-6",
  "[&_img]:my-2 [&_img]:rounded-lg",
  // A table is the one block that can push the page sideways, so it scrolls inside its own box.
  "[&_table]:my-3 [&_table]:block [&_table]:w-full [&_table]:overflow-x-auto [&_table]:text-sm",
  "[&_th]:border-b [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-semibold",
  "[&_td]:border-b [&_td]:px-2 [&_td]:py-1",
].join(" ");

export function RichText({ html = "", className, embeds = false }: { html?: string; className?: string; embeds?: boolean }) {
  const cls = RICH_TEXT_TYPOGRAPHY + (className ? " " + className : "")
    + (embeds ? " [&_iframe]:my-3 [&_iframe]:aspect-video [&_iframe]:w-full [&_iframe]:rounded-lg [&_iframe]:border-0" : "");
  return <div className={cls} dangerouslySetInnerHTML={{ __html: sanitizeRichText(html, { embeds }) }} />;
}
