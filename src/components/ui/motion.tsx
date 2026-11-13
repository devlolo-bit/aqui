import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * THE MOTION KIT — scroll-linked and entrance effects a page composes from, without writing any scroll code.
 *
 * Why it exists: a site described with agency-level motion ("the hero image drifts on scroll, the numbers count
 * up, the process pins and advances chapter by chapter") came out of a build with a fade-in and nothing else. The
 * model reliably USES a component it is told exists (it used `<Reveal>` unprompted); what it does not do in a
 * short build is write GSAP/ScrollTrigger from scratch, and the CSS it reaches for (`animation-timeline`) does not
 * run in Safari. These components are the platform's own implementation, tested in Chrome and Safari, and every
 * one of them respects `prefers-reduced-motion` (the final state is shown, nothing moves).
 *
 *   <Parallax speed={0.3}>…</Parallax>          the content drifts as the page scrolls (an image, a background)
 *   <ScrollScale from={0.9} to={1}>…</ScrollScale>  grows (or shrinks) as it enters the viewport, optional fade
 *   <Pin height={3}>{(p) => …}</Pin>              a section that stays on screen while the page scrolls `height`
 *                                                 viewports; `p` runs 0→1, drive chapters/steps from it
 *   <Marquee speed={40}>…</Marquee>               an endless horizontal loop (logos, quotes), pauses on hover
 *   <Counter value={1280} suffix="+" />            counts up from 0 when it enters the viewport
 *   <TextReveal>One strong line</TextReveal>        the words (or lines) rise one after the other on entrance
 *
 * All of them work on ANY element tree and never take over the scroll: no smooth-scroll library, no body lock.
 * ONE scroll listener and ONE animation frame serve every component on the page (`subscribe` below): thirty
 * cards measuring themselves on their own would read layout after every other card's write, thirty times a frame.
 */

const REDUCED = "(prefers-reduced-motion: reduce)";

function prefersReduced(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.(REDUCED).matches;
}

/** True when the person asked the OS for less motion. Every effect here checks it and shows the final state.
 *  Initialised from the media query, so a reduced-motion reader never sees the animated frame first. */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(prefersReduced);
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(REDUCED);
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

// ── The scroll bus: one listener, one frame, every subscriber measured then updated in the same callback ────────
type Measure = () => void;
const subscribers = new Set<Measure>();
let frame = 0;
let listening = false;

function flush() {
  frame = 0;
  // React 18+ batches the setState calls made inside one callback into one commit: all the reads happen first
  // (every subscriber measures its own element), and the writes land together afterwards.
  subscribers.forEach((m) => m());
}
function schedule() {
  if (!frame) frame = window.requestAnimationFrame(flush);
}
function subscribe(measure: Measure): () => void {
  subscribers.add(measure);
  if (!listening && typeof window !== "undefined") {
    listening = true;
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
  }
  measure();
  return () => {
    subscribers.delete(measure);
    if (subscribers.size === 0 && listening) {
      listening = false;
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) { window.cancelAnimationFrame(frame); frame = 0; }
    }
  };
}

/** The element's rectangle relative to the viewport, sampled on the shared frame. `null` until measured. */
function useViewportRect<T extends HTMLElement>(ref: React.RefObject<T | null>, disabled = false): DOMRect | null {
  const [rect, setRect] = React.useState<DOMRect | null>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || disabled || typeof window === "undefined") return;
    return subscribe(() => setRect(el.getBoundingClientRect()));
  }, [ref, disabled]);
  return rect;
}

/**
 * The element's progress through the viewport, 0 when its top enters at the bottom edge and 1 when its bottom
 * leaves at the top edge (clamped).
 */
function useScrollProgress<T extends HTMLElement>(ref: React.RefObject<T | null>, disabled = false): number {
  const rect = useViewportRect(ref, disabled);
  if (!rect || typeof window === "undefined") return 0;
  const vh = window.innerHeight || 1;
  const total = rect.height + vh;
  return total > 0 ? Math.min(1, Math.max(0, (vh - rect.top) / total)) : 0;
}

/** Whether the element has entered the viewport at least once (an IntersectionObserver, with a no-IO fallback). */
function useInView<T extends HTMLElement>(ref: React.RefObject<T | null>, threshold = 0.2): boolean {
  const [seen, setSeen] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } },
      { threshold, rootMargin: "0px 0px -8% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold]);
  return seen;
}

const easeOut = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

/**
 * Parallax — the content drifts vertically as the page scrolls past it. `speed` is the fraction of the scroll the
 * content follows: 0.2–0.4 for a hero image or a background (subtle), negative to move against the scroll. Give the
 * WRAPPER the size (e.g. `h-[80vh]`); the child is scaled just enough for the drift never to show an edge, whatever
 * the wrapper's height. Ex.: `<Parallax speed={0.3} className="absolute inset-0"><AppImage … className="h-full w-full object-cover"/></Parallax>`.
 */
function Parallax({ children, speed = 0.3, className }: {
  children: React.ReactNode;
  speed?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();
  const rect = useViewportRect(ref, reduced);
  const vh = typeof window !== "undefined" ? window.innerHeight || 1 : 1;
  const p = rect ? Math.min(1, Math.max(0, (vh - rect.top) / (rect.height + vh))) : 0.5;
  const h = rect?.height || 0;
  const range = Math.min(1, Math.abs(speed)) * 120;                       // px of travel at |speed| = 1
  const scale = reduced || !h ? 1 : 1 + Math.min(0.4, (2 * range) / h);   // the cover the travel needs, no more
  const y = reduced ? 0 : (p - 0.5) * 2 * range * Math.sign(speed || 1);
  return (
    <div ref={ref} className={cn("overflow-hidden", className)}>
      <div style={{ transform: `translate3d(0, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`, willChange: reduced ? undefined : "transform" }}
        className="h-full w-full">
        {children}
      </div>
    </div>
  );
}

/**
 * ScrollScale — the content grows (or shrinks) as it enters the viewport, with an optional fade: an image that
 * swells as you reach it, a card that settles into place. `from`/`to` are the scale factors when the element's top
 * enters and once it has crossed the lower third of the viewport, so a card in the page's last screen still
 * arrives at `to`. Ex.: `<ScrollScale from={0.85} to={1} fade>…</ScrollScale>`.
 */
function ScrollScale({ children, from = 0.9, to = 1, fade = false, className }: {
  children: React.ReactNode;
  from?: number;
  to?: number;
  fade?: boolean;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();
  const rect = useViewportRect(ref, reduced);
  let t = 1;
  if (!reduced && rect && typeof window !== "undefined") {
    const vh = window.innerHeight || 1;
    const atEnd = window.scrollY + vh >= (document.documentElement.scrollHeight || 0) - 1;
    t = atEnd ? 1 : (vh * 0.9 - rect.top) / (vh * 0.35);   // starts as the top enters, done past 55% of the viewport
  }
  const eased = easeOut(t);
  const scale = from + (to - from) * eased;
  return (
    <div ref={ref} className={className}
      style={{ transform: `scale(${scale.toFixed(4)})`, opacity: fade && !reduced ? eased : 1, transformOrigin: "center", willChange: reduced ? undefined : "transform, opacity" }}>
      {children}
    </div>
  );
}

/**
 * Pin — a section that stays on screen while the page scrolls on for `height` viewports, and hands its children
 * the progress (0→1) to drive chapters, a growing image, a line that draws, a counter of steps. The classic
 * "process in three acts" or "one product, three angles". Keep `height` at 2–4; the sticky panel is one viewport
 * tall. The child is a FUNCTION of the progress; a plain element is rendered as it is (nothing to drive).
 * Ex.: `<Pin height={3}>{(p) => <Steps active={Math.min(2, Math.floor(p * 3))} />}</Pin>`.
 */
function Pin({ children, height = 3, className }: {
  children: React.ReactNode | ((progress: number) => React.ReactNode);
  height?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();
  const rect = useViewportRect(ref, reduced);
  let progress = 0;
  if (rect && typeof window !== "undefined") {
    const travel = Math.max(1, rect.height - (window.innerHeight || 1));
    progress = Math.min(1, Math.max(0, -rect.top / travel));
  }
  const vh = Math.max(1, Math.min(6, height));
  const p = reduced ? 1 : progress;
  const content = typeof children === "function" ? children(p) : children;
  // Reduced motion: no pinning, the content sits in one viewport and reads at its final state. `100dvh` keeps the
  // panel inside what a phone actually shows; `min-h` lets a chapter taller than the screen scroll instead of cut.
  return (
    <div ref={ref} className={cn("relative", className)} style={{ height: reduced ? undefined : `${vh * 100}vh` }}>
      <div className={cn(reduced ? "" : "sticky top-0 min-h-[100dvh]")}>{content}</div>
    </div>
  );
}

/**
 * Marquee — an endless horizontal loop of the children (client logos, quotes, tags). `speed` is pixels per second;
 * it pauses on hover and stands still under reduced motion. The children are duplicated to close the loop, so
 * give each item a fixed gap (`gap-10`) and no key that must be unique across the page.
 */
function Marquee({ children, speed = 40, className }: {
  children: React.ReactNode;
  speed?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const track = React.useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = React.useState(0);
  React.useEffect(() => {
    const el = track.current;
    if (!el) return;
    const measure = () => setWidth(el.scrollWidth / 2);
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);
  const duration = width > 0 ? width / Math.max(8, speed) : 0;
  return (
    <div className={cn("group relative overflow-hidden", className)} aria-live="off">
      <style>{`@keyframes fab-marquee{from{transform:translate3d(0,0,0)}to{transform:translate3d(-50%,0,0)}}`}</style>
      <div ref={track} className="flex w-max items-center group-hover:[animation-play-state:paused]"
        style={reduced || !duration ? undefined : { animation: `fab-marquee ${duration.toFixed(2)}s linear infinite` }}>
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center" aria-hidden="true">{children}</div>
      </div>
    </div>
  );
}

/**
 * Counter — a number that counts up from 0 to `value` when it enters the viewport (a stats band: "12 anos",
 * "140 projetos", "38.000 m²"). `decimals`, `prefix`/`suffix` and the locale format the final text; the final
 * value is in the markup from the first render (search engines and reduced motion read it as is).
 */
function Counter({ value, duration = 1400, decimals = 0, prefix = "", suffix = "", locale, className }: {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  locale?: string;
  className?: string;
}) {
  const target = Number(value) || 0;          // a `value="140"` from JSX is a string; NaN would print as "NaN"
  const ref = React.useRef<HTMLSpanElement | null>(null);
  const reduced = useReducedMotion();
  const seen = useInView(ref, 0.5);
  const [shown, setShown] = React.useState(target);
  React.useEffect(() => {
    if (!seen || reduced || typeof window === "undefined") { setShown(target); return; }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / Math.max(1, duration));
      setShown(target * easeOut(t));
      if (t < 1) raf = window.requestAnimationFrame(tick);
    };
    setShown(0);
    raf = window.requestAnimationFrame(tick);
    return () => { if (raf) window.cancelAnimationFrame(raf); };
  }, [seen, reduced, target, duration]);
  const fmt = React.useMemo(() => new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }), [locale, decimals]);
  return <span ref={ref} className={cn("tabular-nums", className)}>{prefix}{fmt.format(shown)}{suffix}</span>;
}

/**
 * TextReveal — the words of a headline (or the lines of a short paragraph, `by="line"` splits on `\n`) rise one
 * after the other when the text enters the viewport. For the hero title and one strong sentence per section; not
 * for body copy. `stagger` is the ms between words; keep the whole entrance under ~900ms. The sentence stays
 * readable to assistive technology through a visually hidden copy; the animated words are decoration.
 */
function TextReveal({ children, by = "word", stagger = 40, className, as: Tag = "span" }: {
  children: React.ReactNode;
  by?: "word" | "line";
  stagger?: number;
  className?: string;
  as?: "span" | "h1" | "h2" | "h3" | "p";
}) {
  const ref = React.useRef<HTMLElement | null>(null);
  const reduced = useReducedMotion();
  const seen = useInView(ref, 0.3);
  const text = React.Children.toArray(children).map((c) => (typeof c === "string" || typeof c === "number" ? String(c) : "")).join("");
  const parts = by === "line" ? text.split("\n") : text.split(/(\s+)/);
  let index = 0;
  return (
    <Tag ref={ref as React.RefObject<never>} className={cn("inline-block", className)}>
      <span className="sr-only">{text}</span>
      {parts.map((part, i) => {
        if (by === "word" && /^\s+$/.test(part)) return <React.Fragment key={i}>{part}</React.Fragment>;
        const delay = stagger * index++;
        const on = seen || reduced;
        return (
          <span key={i} aria-hidden="true" className={cn("inline-block", by === "line" && "block")}
            style={{ overflow: "hidden", verticalAlign: "bottom", paddingBottom: "0.12em", marginBottom: "-0.12em" }}>
            <span className="inline-block transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
              style={{ transitionDelay: `${delay}ms`, transform: on ? "translateY(0)" : "translateY(110%)", opacity: on ? 1 : 0 }}>
              {part}
            </span>
          </span>
        );
      })}
    </Tag>
  );
}

export { Counter, Marquee, Parallax, Pin, ScrollScale, TextReveal, useInView, useReducedMotion, useScrollProgress };
