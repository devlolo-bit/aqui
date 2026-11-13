import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AUTH } from './config';
import { useAppName } from './kit';

/**
 * The brand-side pieces the layouts compose. Each one renders NOTHING when its data is empty: a missing tagline
 * never becomes invented copy, and a testimonial or a number appears only when it is real.
 */

export const hasTagline = () => AUTH.brand.tagline.trim().length > 0;
export const hasFeatures = () => AUTH.brand.features.filter(Boolean).length > 0;
export const hasQuote = () => !!AUTH.brand.testimonial?.quote;
export const hasStats = () => AUTH.brand.stats.length > 0;

export function Tagline({ className, as: Tag = 'p' }: { className?: string; as?: 'p' | 'h2' }) {
  if (!hasTagline()) return null;
  return <Tag className={cn('text-balance', className)}>{AUTH.brand.tagline}</Tag>;
}

export function Features({
  className,
  itemClassName,
  iconClassName,
  max = 3,
}: {
  className?: string;
  itemClassName?: string;
  iconClassName?: string;
  max?: number;
}) {
  const items = AUTH.brand.features.filter(Boolean).slice(0, max);
  if (!items.length) return null;
  return (
    <ul className={cn('grid gap-3', className)}>
      {items.map((f, i) => (
        <li key={i} className={cn('flex items-start gap-3', itemClassName)}>
          <span
            className={cn('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full', iconClassName)}
            aria-hidden
          >
            <Check className="size-3.5" strokeWidth={2.5} />
          </span>
          <span>{f}</span>
        </li>
      ))}
    </ul>
  );
}

export function Quote({
  className,
  quoteClassName,
  metaClassName,
}: {
  className?: string;
  quoteClassName?: string;
  metaClassName?: string;
}) {
  const q = AUTH.brand.testimonial;
  if (!q?.quote) return null;
  return (
    <figure className={cn('grid gap-4', className)}>
      <blockquote className={cn('text-pretty text-lg leading-relaxed', quoteClassName)}>“{q.quote}”</blockquote>
      <figcaption className={cn('text-sm', metaClassName)}>
        <span className="font-medium">{q.author}</span>
        {q.role ? <span className="opacity-80">, {q.role}</span> : null}
      </figcaption>
    </figure>
  );
}

export function Stats({
  className,
  valueClassName,
  labelClassName,
}: {
  className?: string;
  valueClassName?: string;
  labelClassName?: string;
}) {
  if (!hasStats()) return null;
  return (
    <dl className={cn('grid grid-cols-3 gap-6', className)}>
      {AUTH.brand.stats.slice(0, 3).map((s, i) => (
        <div key={i} className="grid gap-1">
          <dt className={cn('order-2 text-xs', labelClassName)}>{s.label}</dt>
          <dd className={cn('order-1 text-2xl font-semibold tabular-nums', valueClassName)}>{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The app's name set as a poster: the layouts that have nothing else to say still say the name, big. */
export function BigName({ className }: { className?: string }) {
  const name = useAppName();
  if (!name) return null;
  return (
    <p className={cn('auth-poster font-display text-balance [overflow-wrap:anywhere]', className)} aria-hidden>
      {name}
    </p>
  );
}

/** Writes the pointer position into `--mx/--my` (one rAF per frame), only for a fine pointer without reduced motion. */
export function useSpotlight<T extends HTMLElement>() {
  const ref = React.useRef<T | null>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined' || !window.matchMedia) return;
    if (!window.matchMedia('(pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      return;
    let frame = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    };
    el.addEventListener('pointermove', move);
    return () => {
      el.removeEventListener('pointermove', move);
      cancelAnimationFrame(frame);
    };
  }, []);
  return ref;
}

/** Splits a statement into up to three balanced lines for the masked line reveal (no runtime measuring). */
export function splitLines(text: string, maxLines = 3): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 2) return [words.join(' ')].filter(Boolean);
  const lines = Math.min(maxLines, Math.ceil(words.length / 3));
  const per = Math.ceil(words.length / lines);
  const out: string[] = [];
  for (let i = 0; i < words.length; i += per) out.push(words.slice(i, i + per).join(' '));
  return out;
}
