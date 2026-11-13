/**
 * <Rating/> — the READY-MADE piece of reviews & ratings (the "reviews" blueprint). A summary (the average rating + the distribution per
 * star + the total), a form with interactive stars (hover) and a list of reviews with a "helpful". Token-driven
 * (it inherits the theme) and light/dark. Reading is public; reviewing requires a login.
 *
 * It consumes the canonical model `review` (target, author→ref, rating 1-5, body, helpful_count). It filters by `targetId`
 * (what is being reviewed). A platform component — the app USES the <Rating/>, it does not recreate it. Code-split by the fab-client.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collection, useAuth, useLocale, type Row } from "./fab-client";
import { t as i18n, type FabI18nKey } from "./fab-i18n";

export type Review = Row & { target?: string; author?: string; rating?: number; body?: string; helpful_count?: number; author_name?: string };

const SKEL = "animate-pulse bg-muted";
function initials(name?: string | null): string {
  const s = (name || "").trim(); if (!s) return "•";
  const p = s.split(/\s+/); return ((p[0]?.[0] || "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}
const STAR_PATH = "m12 2 3 6.9 7.5.6-5.7 4.9 1.8 7.3L12 17.8 5.4 21.7l1.8-7.3L1.5 9.5 9 8.9Z";

// a star with a fractional fill (0..1): an empty star + a full copy clipped by width.
function Star({ fill, size = 16 }: { fill: number; size?: number }) {
  const f = Math.max(0, Math.min(1, fill));
  return (
    <span className="relative inline-block" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="absolute inset-0 text-border"><path d={STAR_PATH} /></svg>
      <span className="absolute inset-0 overflow-hidden" style={{ width: `${f * 100}%` }}>
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="text-[var(--warning)]"><path d={STAR_PATH} /></svg>
      </span>
    </span>
  );
}
function StarRow({ value, size = 14 }: { value: number; size?: number }) {
  return <span className="inline-flex gap-0.5">{[0, 1, 2, 3, 4].map((i) => <Star key={i} fill={value - i} size={size} />)}</span>;
}

export function Rating({ targetId, reviewModel = "review", title, canReview = true }:
  { targetId?: string; reviewModel?: string; title?: string; canReview?: boolean }) {
  const { user, isLoggedIn } = useAuth();
  const loc = useLocale();
  const T = useCallback((k: FabI18nKey) => i18n(loc, k), [loc]);
  const reviews = useMemo(() => collection<Review>(reviewModel), [reviewModel]);
  const meId = user?.id;

  const [items, setItems] = useState<Review[] | null>(null);
  const [hover, setHover] = useState(0);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const helpfulBusy = useRef<Set<string>>(new Set());

  const load = useCallback(() => {
    reviews.list({ sort: "-created_at", limit: 100, ...(targetId ? { filter: { target: targetId } } : {}) })
      .then(setItems).catch(() => setItems([]));
  }, [reviews, targetId]);
  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const list = items || [];
    const dist = [0, 0, 0, 0, 0];   // index 0 = 1★ … 4 = 5★
    let sum = 0;
    for (const r of list) { const n = Math.round(Number(r.rating) || 0); if (n >= 1 && n <= 5) { dist[n - 1]++; sum += n; } }
    const total = list.length;
    return { total, avg: total ? sum / total : 0, dist };
  }, [items]);

  async function submit() {
    if (!rating || !meId || busy) return;
    setBusy(true);
    try {
      const r = await reviews.create({ target: targetId, author: meId, author_name: user?.name, rating, body: body.trim(), helpful_count: 0 } as Partial<Review>);
      setItems((it) => [r, ...(it ?? [])]); setRating(0); setHover(0); setBody(""); setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch { /* ignore */ } finally { setBusy(false); }
  }
  async function markHelpful(r: Review) {
    if (!r.id || helpfulBusy.current.has(r.id)) return;
    helpfulBusy.current.add(r.id);
    const next = (r.helpful_count || 0) + 1;
    setItems((it) => it?.map((x) => (x.id === r.id ? { ...x, helpful_count: next } : x)) ?? it);
    try { await reviews.update(r.id, { helpful_count: next } as Partial<Review>); } catch { /* */ } finally { helpfulBusy.current.delete(r.id); }
  }

  return (
    <div className="flex flex-wrap items-stretch gap-4">
      {/* the summary */}
      <div className="w-full flex-none rounded-2xl border border-border bg-card p-5 text-center md:w-72">
        <div className="text-5xl font-bold leading-none text-foreground">{stats.avg ? stats.avg.toFixed(1) : "0.0"}</div>
        <div className="my-2 flex justify-center"><StarRow value={stats.avg} size={18} /></div>
        <div className="mb-4 text-xs text-muted-foreground">{stats.total} {T("rv.reviews")}</div>
        <div className="flex flex-col gap-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const c = stats.dist[star - 1]; const pct = stats.total ? (c / stats.total) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-2">
                <span className="w-7 text-right text-[11px] text-muted-foreground">{star} ★</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-[var(--warning)]" style={{ width: `${pct}%` }} /></div>
                <span className="w-7 text-[11px] text-muted-foreground">{c}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* the form + the list */}
      <div className="flex min-w-[300px] flex-1 flex-col gap-3.5">
        {canReview && isLoggedIn && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-sm font-bold text-foreground">{title || T("rv.title")}</div>
            <div className="mb-3.5 text-xs text-muted-foreground">{T("rv.sub")}</div>
            <div className="mb-3.5 flex gap-1.5" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => {
                const on = (hover || rating) >= n;
                return (
                  <button key={n} aria-label={`${n}`} onMouseEnter={() => setHover(n)} onClick={() => setRating(n)}
                    className="flex h-11 w-11 items-center justify-center">
                    <svg width="34" height="34" viewBox="0 0 24 24" fill={on ? "var(--warning)" : "none"} stroke={on ? "var(--warning)" : "var(--border)"} strokeWidth={on ? 1.4 : 1.8} className={on ? "scale-105 transition-transform" : "transition-transform"}><path d={STAR_PATH} /></svg>
                  </button>
                );
              })}
            </div>
            <textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder={T("rv.placeholder")}
              className="w-full resize-none rounded-xl border border-border bg-muted px-3.5 py-3 text-[13px] leading-relaxed text-foreground outline-none focus:border-primary" />
            <div className="mt-3 flex items-center justify-end gap-3">
              {sent && <span className="text-xs font-semibold text-[var(--success)]">{T("rv.thanks")}</span>}
              <button onClick={submit} disabled={!rating || busy} className="h-10 rounded-lg bg-primary px-5 text-[13px] font-bold text-primary-foreground disabled:opacity-50">{busy ? T("rv.submitting") : T("rv.submit")}</button>
            </div>
          </div>
        )}
        {/* a visitor (not logged in) but the section invites them to review → a login prompt (they are not left with "no way to review") */}
        {canReview && !isLoggedIn && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-4 text-center text-[13px] text-muted-foreground">
            {T("rv.loginToReview")}
          </div>
        )}

        {/* the list */}
        {items === null && (
          <div className="rounded-2xl border border-border bg-card p-5"><div className="flex gap-3"><div className={`${SKEL} h-10 w-10 flex-none rounded-full`} /><div className="flex-1"><div className={`${SKEL} mb-2 h-3 w-2/5 rounded`} /><div className={`${SKEL} mb-2.5 h-3 w-24 rounded`} /><div className={`${SKEL} mb-1.5 h-2.5 w-full rounded`} /><div className={`${SKEL} h-2.5 w-3/4 rounded`} /></div></div></div>
        )}
        {items?.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-7 text-center">
            <StarRow value={0} size={22} />
            <div className="text-[13.5px] font-bold text-foreground">{T("rv.empty")}</div>
            <div className="text-xs text-muted-foreground">{T("rv.emptySub")}</div>
          </div>
        )}
        {items?.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-4.5">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary/15 font-bold text-primary">{initials(r.author_name)}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between"><span className="text-[13.5px] font-bold text-foreground">{r.author_name || "—"}</span><span className="text-[11px] text-muted-foreground">{r.created_at ? new Intl.DateTimeFormat(loc, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(r.created_at)) : ""}</span></div>
                <div className="my-1.5"><StarRow value={Math.round(Number(r.rating) || 0)} /></div>
                {r.body && <div className="text-[13px] leading-relaxed text-foreground/80">{r.body}</div>}
                <button onClick={() => markHelpful(r)} className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" /></svg>
                  {T("rv.helpful")}{r.helpful_count ? ` · ${r.helpful_count}` : ""}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
