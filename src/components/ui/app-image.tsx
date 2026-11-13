import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * AppImage — a swappable LAYOUT image (a hero, a section banner, a feature/testimonial card, an empty state). The AI uses
 * `<AppImage slot="hero-main" prompt="warm barbershop interior, moody lighting" className="…"/>` freely wherever an
 * image adds visual value. Until the owner picks a real image, it renders a themed PLACEHOLDER (a gradient in
 * the brand's color + a lucide-style icon) — with NO network — so a broken URL never shows up. In the Studio's preview, a
 * floating "trocar imagem" chip (the fab-inspector) lets the owner upload/generate the image in one click.
 *
 * Props:
 *  - `slot` (required): the image's unique kebab-case id (e.g. "hero-main"). Stable — it is the swap's anchor.
 *  - `prompt` (required): the short description of the SCENE in English that the AI writes — it becomes the context of the AI generation later.
 *  - `src` (optional): the URL, when the owner picks a real image. Set → it renders the real image.
 *  - `priority` (optional): this is the image that decides the LCP. `true` → `fetchpriority=high` + `loading=eager`
 *    + `decoding=sync`; `false` → explicitly deprioritised. Leave it unset and the FIRST AppImage of the page gets
 *    priority automatically (see claimFirstPaint) — a hero should never have to remember to ask.
 *  - `width`/`height` (optional): the intrinsic pixel size. Emitted whenever known — from these props or from the
 *    slot's entry in the build's image map — so the browser reserves the box and the page does not shift (CLS).
 *  - `alt`, `className`, and the rest are passed on to the `<img>` (…rest).
 *
 * WHY THE AUTOMATIC PRIORITY EXISTS: measured with Lighthouse mobile on 2026-09-07, every sampled app with a cover
 * image had an LCP of 11–22 s. The hero was a full-width image the browser discovered late and fetched at low
 * priority behind the JS. The first image a page renders is, in practice, always the one that paints the LCP, so
 * the default is the correct behaviour and the prop exists for the exceptions (an avatar above a hero, a gallery).
 *
 * The `src`'s resolution (F1 — images generated at build time): an explicit `props.src` → the `window.__FAB_IMAGES__[slot]` map
 * (injected into the <head> by the materialize from the `app.config.images`) → the themed placeholder. The AI does NOT emit a `src`;
 * the real URL lives in the map (decoupled from the code → it survives re-edits). With no entry in the map → the placeholder (no network).
 *
 * It ALWAYS renders an `<img>` (a real one or a placeholder data-URI) → the inspector swaps the `src` in the DOM without recreating the node.
 * It stamps `data-fab-img={slot}` and `data-fab-img-prompt={prompt}` (harmless in production; used by the preview's inspector).
 */
type SlotImage = { src: string; width?: number; height?: number };

/** The build's slot→image map (window.__FAB_IMAGES__, injected into the <head> by the materialization). An entry is
 *  either the URL alone or `{src, width, height}` — the second form is what lets us emit the intrinsic size. */
function fabImage(slot: string): SlotImage | undefined {
  if (typeof window === 'undefined') return undefined;
  const map = (window as unknown as { __FAB_IMAGES__?: Record<string, string | SlotImage> }).__FAB_IMAGES__;
  const entry = map ? map[slot] : undefined;
  if (typeof entry === 'string' && entry) return { src: entry };
  if (entry && typeof entry === 'object' && typeof entry.src === 'string' && entry.src) {
    return { src: entry.src, width: entry.width, height: entry.height };
  }
  return undefined;
}

/** The `src` only when a browser can fetch it from wherever the app is served: an absolute or protocol-relative URL,
 *  a root path, a data/blob URI. Sample data has carried bare file names the model invented ("frente-da-loja.jpg"),
 *  which resolve against the app's own origin, answer 404 and paint a broken image; those fall back to the slot map
 *  and then to the placeholder, like an image that was never set. */
function renderableSrc(src: unknown): string | undefined {
  if (typeof src !== 'string') return undefined;
  const value = src.trim();
  return /^(https?:)?\/\/|^\/|^data:image\/|^blob:/i.test(value) ? value : undefined;
}

// --- WHO GETS THE HIGH PRIORITY --------------------------------------------------------------------------------
// A module-level counter, reset on every navigation: the FIRST AppImage rendered on a page claims priority. React
// renders in document order, so "first rendered" is "first in the markup", which is the hero. The reset is keyed on
// `location.pathname` and not on a router hook on purpose — this component must keep working outside a Router
// (a story, a test, an isolated render) and must not import react-router into the shadcn layer.
let paintedPath: string | null = null;
let paintedCount = 0;
function claimFirstPaint(): boolean {
  const here = typeof location === 'undefined' ? '' : location.pathname;
  if (here !== paintedPath) {
    paintedPath = here;
    paintedCount = 0;
  }
  return paintedCount++ === 0;
}

function AppImage({
  slot,
  prompt,
  src,
  alt = '',
  className,
  priority,
  width,
  height,
  ...rest
}: {
  slot: string;
  prompt: string;
  src?: string;
  alt?: string;
  className?: string;
  priority?: boolean;
  width?: number | string;
  height?: number | string;
  [key: string]: unknown;
}) {
  const usable = renderableSrc(src);
  const entry = usable ? ({ src: usable } as SlotImage) : fabImage(slot);
  // A URL that fails to load (deleted file, dead host) swaps to the placeholder too, keyed on the URL that failed so a
  // new `src` gets its own chance.
  const [failed, setFailed] = React.useState<string | null>(null);
  const resolved = entry?.src && entry.src !== failed ? entry.src : undefined;
  const placeholder = React.useMemo(() => (resolved ? '' : placeholderDataUri()), [resolved]);
  const callerOnError = (rest as { onError?: React.ReactEventHandler<HTMLImageElement> }).onError;
  // The claim happens ONCE per mounted instance (a re-render must not consume another slot).
  const [claimed] = React.useState(claimFirstPaint);
  const hero = priority === undefined ? claimed : priority === true;
  // The intrinsic box, so the layout does not jump when the image lands (CLS). `w-full h-full object-cover` still
  // decides the RENDERED size — these are the aspect-ratio hint, not a size.
  const w = width ?? entry?.width;
  const h = height ?? entry?.height;
  const eager = {
    fetchPriority: 'high',
    loading: 'eager',
    decoding: 'sync',
  } as React.ImgHTMLAttributes<HTMLImageElement>;
  // `h-full` only when the caller did not size the box. With an `aspect-*` (or an explicit height) it is not a
  // default, it is a conflict `cn` cannot see: inside a grid the item is stretched to the row, so 100% resolves to
  // the whole card and the image overruns the text below it into the next row (seen on a listing grid, 2026-09-22).
  // `h-auto`, not nothing: the intrinsic `height` attribute above would otherwise set the height and void the aspect.
  const sized = /(^|\s)([\w-]+:)*(aspect-|h-|size-)/.test(className || '');
  // ORDER OF THE SPREADS below: the AUTOMATIC hero attributes come BEFORE `...rest` (an explicit `loading` written
  // at the call site still wins), while an EXPLICIT `priority` comes AFTER it — opting in has to beat the
  // `loading="lazy"` the model likes to put on exactly the image that must not be lazy.
  return (
    <img
      src={resolved || placeholder}
      alt={alt}
      data-fab-img={slot}
      data-fab-img-prompt={prompt}
      {...(w != null ? { width: w } : {})}
      {...(h != null ? { height: h } : {})}
      {...(hero ? eager : ({ loading: 'lazy', decoding: 'async' } as React.ImgHTMLAttributes<HTMLImageElement>))}
      className={cn(sized ? 'w-full h-auto object-cover' : 'w-full h-full object-cover', className)}
      {...(rest as React.ImgHTMLAttributes<HTMLImageElement>)}
      {...(priority === true ? eager : {})}
      onError={(event) => {
        if (resolved) setFailed(resolved);
        callerOnError?.(event);
      }}
    />
  );
}

// --- The themed PLACEHOLDER (it mirrors api/control-plane/.../seed_data.py::_placeholder_svg: the brand's gradient + a
// discreet lucide-style image icon). An inline data-URI, with no network. The color derived from the theme's --primary token (falling
// back to the brand's purple) → it respects the app's Brand/dark mode. ------------------------------------------------
const DEFAULT_PRIMARY = '#7a3b2e';

/** It clamps a channel to 0–255. */
function clampChannel(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

/** It lightens/darkens a hex by a factor (it mirrors the backend's _shade). A silent fallback to the hex itself. */
function shade(hex: string, factor: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const int = parseInt(m[1], 16);
  const r = clampChannel(((int >> 16) & 255) * factor);
  const g = clampChannel(((int >> 8) & 255) * factor);
  const b = clampChannel((int & 255) * factor);
  return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
}

/** It reads the theme's primary color (the resolved --primary token) on the client; the default on the SSR/prerender. */
function themePrimary(): string {
  if (typeof window === 'undefined' || typeof document === 'undefined') return DEFAULT_PRIMARY;
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    if (/^#([0-9a-f]{6})$/i.test(raw)) return raw;
    const rgb = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(raw);
    if (rgb) return '#' + [rgb[1], rgb[2], rgb[3]].map((v) => clampChannel(+v).toString(16).padStart(2, '0')).join('');
  } catch {
    /* the getComputedStyle is unavailable → the default */
  }
  return DEFAULT_PRIMARY;
}

/** The placeholder's SVG (a gradient + a lucide-image icon) as a data-URI. Wide (16:9) — cropped by an object-cover. */
function placeholderDataUri(): string {
  const w = 1600,
    h = 900;
  const primary = themePrimary();
  const c0 = shade(primary, 1.18),
    c1 = shade(primary, 0.72);
  const s = Math.min(w, h) * 0.26; // a 24×24 icon → the scale
  const tx = (w - s) / 2,
    ty = (h - s) / 2,
    sc = s / 24;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="placeholder">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c0}"/><stop offset="1" stop-color="${c1}"/></linearGradient></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#g)"/>` +
    `<g transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${sc.toFixed(3)})" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">` +
    `<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>` +
    `</g></svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

export { AppImage };
