import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Reveal — it animates the content's ENTRANCE when it appears in the viewport (a fade + a gentle slide-up). Wrap a
 * page SECTION block (a hero, a features grid, testimonials, a CTA) to give it life. The `delay` (ms) staggers a SHORT ROW
 * of items; keep the stagger low (≤ ~500ms total). It respects `prefers-reduced-motion` (it appears with no animation).
 * Do NOT wrap the whole route/layout nor LONG lists (reveal the container ONCE) — otherwise the items below take a while to
 * aparecer. Ex.: `<Reveal><h2>…</h2></Reveal>` · fileira: `{cards.map((c,i)=><Reveal key={c.id} delay={Math.min(i,6)*60}>…</Reveal>)}`.
 */
function Reveal({ children, className, delay = 0 }: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    if (typeof IntersectionObserver === "undefined") {   // a browser with no IO → it shows it (it never stays invisible forever)
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "transition-all duration-700 ease-out will-change-[opacity,transform] motion-reduce:transition-none",
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

export { Reveal };
