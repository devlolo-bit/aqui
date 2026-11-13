/**
 * The rich-text sanitizer. It lives outside the component because it is the part that decides what ENTERS the
 * page, and that decision needs a test — `rich-text-view.tsx` has JSX and the CI's `node --test` cannot import
 * it.
 */
import DOMPurify from "isomorphic-dompurify";

// The allowlist lives on its own so the CI can exercise it with no dependency installed.
export { EMBED_HOSTS, embedAllowed } from "./rich-text-embed-hosts.ts";
import { embedAllowed } from "./rich-text-embed-hosts.ts";

/**
 * `embeds` turns the `<iframe>` on — off by default, and THAT DEFAULT IS THE SECURITY BOUNDARY: the rich text
 * of a feed or a community is written by whoever uses the app, and an arbitrary iframe there is a stranger's
 * page wearing this app's identity.
 *
 * It exists because content brought over from the Fábrica de Aplicativos carries the app OWNER's own embeds —
 * one church app alone had 35 YouTube videos and 4 maps inside its texts — and turning them into links loses
 * exactly what the reader came for.
 */
export function sanitizeRichText(html: string, { embeds = false }: { embeds?: boolean } = {}): string {
  if (!embeds) {
    return DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, ADD_ATTR: ["target", "rel"] });
  }
  // The hook is global on the DOMPurify singleton, so it is added and removed around THIS call. `sanitize` is
  // synchronous: nothing can interleave between the two lines.
  DOMPurify.addHook("uponSanitizeElement", (node: any, data: any) => {
    if (data.tagName !== "iframe") return;
    const src = typeof node.getAttribute === "function" ? node.getAttribute("src") || "" : "";
    if (embedAllowed(src)) {
      // `allow-storage-access-by-user-activation` because without it the frame can only ASK for access to its
      // own storage and take a "Refused to execute request" in the console — measured with a Google dashboard
      // inside a migrated page. The token does not grant access: it grants the right to ask, and the browser
      // decides, after the person interacts.
      node.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups allow-presentation allow-forms "
        + "allow-storage-access-by-user-activation");
      node.setAttribute("loading", "lazy");
    } else {
      node.parentNode?.removeChild(node);
    }
  });
  try {
    return DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true },
      ADD_TAGS: ["iframe"],
      ADD_ATTR: ["target", "rel", "allow", "allowfullscreen", "frameborder", "sandbox", "loading", "referrerpolicy"],
    });
  } finally {
    DOMPurify.removeHook("uponSanitizeElement");
  }
}
