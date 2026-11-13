import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/fab-client";
import { t } from "@/lib/fab-i18n";

// ScrollRow: ONE row of chips, filters, categories or (on a narrow screen) section links, which scrolls sideways
// with no scrollbar and still tells the person there is more.
//
// Why it exists instead of `flex overflow-x-auto`: that row paints a native bar across the middle of the screen, and
// the generator kept writing it even with the SYSTEM prompt forbidding it (a merchant nav, 2026-09-13). Hiding the bar
// alone is not the answer either. What the research agrees on (NN/g, Adrian Roselli, Carbon, Material 3):
//   • without a bar there must be another cue: the edges FADE where content is hidden;
//   • a mouse without a trackpad cannot scroll sideways, so arrows appear on fine pointers, and they are VISIBLE
//     whenever there is hidden content, not only on hover (NN/g: hover-only arrows go undiscovered);
//   • keyboard: a row of links/buttons is already reachable, and a focused item is scrolled into view (WCAG 2.4.11);
//     a row with nothing focusable becomes a focusable, named region, or a keyboard user could never scroll it.
// The fade is driven by the same overflow measurement as the arrows, not by CSS scroll-driven animations, because
// Safari does not run `animation-timeline` and would show no cue at all.

const FOCUSABLE = "a[href],button,input,select,textarea,[tabindex]:not([tabindex='-1'])";
const FADE = "2rem";

function ScrollRow({
  children, className, contentClassName, label, arrows = true, ...props
}: React.ComponentProps<"div"> & {
  /** Classes for the inner flex row (gap, padding). The row itself is always `flex` and never wraps. */
  contentClassName?: string;
  /** Names the region for assistive tech. Needed when the items are not links/buttons. */
  label?: string;
  /** Arrow buttons on devices with a mouse. Default true. */
  arrows?: boolean;
}) {
  const loc = useLocale();
  const ref = React.useRef<HTMLDivElement>(null);
  const [edges, setEdges] = React.useState({ back: false, forward: false, focusable: true, rtl: false });

  const measure = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // `scrollLeft` is negative in a right-to-left row, so the distance travelled is its absolute value.
    const travelled = Math.abs(el.scrollLeft);
    const room = el.scrollWidth - el.clientWidth;
    const next = { back: travelled > 1, forward: room - travelled > 1, focusable: !!el.querySelector(FOCUSABLE),
      rtl: getComputedStyle(el).direction === "rtl" };
    setEdges((prev) => (prev.back === next.back && prev.forward === next.forward && prev.focusable === next.focusable
      && prev.rtl === next.rtl ? prev : next));
  }, []);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    ro?.observe(el);
    if (el.firstElementChild) ro?.observe(el.firstElementChild);
    return () => { el.removeEventListener("scroll", measure); ro?.disconnect(); };
  }, [measure]);

  const page = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * (edges.rtl ? -1 : 1) * Math.max(120, el.clientWidth * 0.8), behavior: "smooth" });
  };

  // Only a row that actually scrolls and holds nothing focusable becomes a tab stop: a region that cannot move would
  // be an empty stop for every keyboard user, and a verbose one for screen readers (Roselli).
  const needsFocus = !edges.focusable && (edges.back || edges.forward);
  // The gradient runs from the START edge, which is the right one in a right-to-left row.
  const start = edges.back ? "transparent" : "#000";
  const end = edges.forward ? "transparent" : "#000";
  const mask = edges.back || edges.forward
    ? `linear-gradient(to ${edges.rtl ? "left" : "right"}, ${start}, #000 ${FADE}, #000 calc(100% - ${FADE}), ${end})`
    : undefined;
  const arrow = "absolute top-1/2 z-10 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full border "
    + "bg-background text-foreground shadow-sm transition-opacity hover:bg-muted focus-visible:outline-none "
    + "focus-visible:ring-[3px] focus-visible:ring-ring/30 [@media(pointer:fine)]:flex";

  return (
    <div data-slot="scroll-row" className={cn("relative w-full min-w-0", className)} {...props}>
      <div
        ref={ref}
        role={needsFocus ? "region" : undefined}
        aria-label={needsFocus ? label : undefined}
        tabIndex={needsFocus ? 0 : undefined}
        onFocusCapture={(e) => {
          if (e.target !== ref.current) (e.target as HTMLElement).scrollIntoView({ block: "nearest", inline: "nearest" });
        }}
        className="scrollbar-hide overflow-x-auto overscroll-x-contain rounded-[inherit] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
        style={{ maskImage: mask, WebkitMaskImage: mask }}
      >
        <div className={cn("flex w-max min-w-full items-center gap-2 [&>*]:shrink-0", contentClassName)}>
          {children}
        </div>
      </div>
      {arrows && edges.back && (
        <button type="button" tabIndex={-1} aria-label={t(loc, "ui.scrollBack")} onClick={() => page(-1)}
          className={cn(arrow, "start-0")}>
          <ChevronLeft className="size-4 rtl:rotate-180" />
        </button>
      )}
      {arrows && edges.forward && (
        <button type="button" tabIndex={-1} aria-label={t(loc, "ui.scrollForward")} onClick={() => page(1)}
          className={cn(arrow, "end-0")}>
          <ChevronRight className="size-4 rtl:rotate-180" />
        </button>
      )}
    </div>
  );
}

export { ScrollRow };
