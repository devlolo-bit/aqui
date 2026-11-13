/**
 * <AvailabilityManager/> — the owner's READY-MADE piece for managing the AVAILABILITY (the weekly service windows) of the
 * "booking" blueprint: a list per weekday, it ADDS/EDITS/REMOVES windows (a weekday + a start_time/end_time "HH:MM").
 * The "Add" button is ALWAYS visible (it never disappears once there are days) — the natural pair of the <SlotPicker/> (the client's) and
 * of the <AgendaBoard/> (the day's agenda). It reuses the booking's `availability` model; no new model. Token-driven.
 *
 * `<AvailabilityManager/>` (or an `availabilityModel='...'`). It only makes sense for the owner/an admin — protect the route.
 * A platform component — the app USES the <AvailabilityManager/>, it does not recreate it. Code-split by the fab-client.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, useLocale, type Row } from "./fab-client";
import { t as i18n, type FabI18nKey } from "./fab-i18n";

type Availability = Row & { service?: string | null; weekday?: string | number; start_time?: string; end_time?: string };

const DAYS = ["0", "1", "2", "3", "4", "5", "6"];

const IconBtn = ({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) => (
  <button onClick={onClick} aria-label={label} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">{children}</button>
);

export function AvailabilityManager({ availabilityModel = "availability" }: { availabilityModel?: string }) {
  const loc = useLocale();
  const T = useCallback((k: FabI18nKey) => i18n(loc, k), [loc]);
  const coll = useMemo(() => collection<Availability>(availabilityModel), [availabilityModel]);

  const [items, setItems] = useState<Availability[] | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Availability | null>(null);
  const [weekday, setWeekday] = useState("1");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("18:00");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(() => { coll.list({ limit: 200 }).then(setItems).catch(() => setItems([])); }, [coll]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {   // Esc closes the modal
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // the day's label in the locale (2024-09-01 is a Sunday → weekday 0..6)
  const dayLabel = (w: string) => new Intl.DateTimeFormat(loc, { weekday: "long" }).format(new Date(2024, 8, 1 + Number(w)));

  const byDay = useMemo(() => {
    const m: Record<string, Availability[]> = {};
    for (const a of items || []) { const w = String(a.weekday ?? ""); (m[w] ||= []).push(a); }
    for (const w in m) m[w].sort((x, y) => (x.start_time || "").localeCompare(y.start_time || ""));
    return m;
  }, [items]);

  function openCreate() { setEditing(null); setWeekday("1"); setStart("09:00"); setEnd("18:00"); setErr(""); setOpen(true); }
  function openEdit(a: Availability) { setEditing(a); setWeekday(String(a.weekday ?? "1")); setStart(a.start_time || "09:00"); setEnd(a.end_time || "18:00"); setErr(""); setOpen(true); }

  async function save() {
    if (!(start < end)) { setErr(T("av.errRange")); return; }
    setBusy(true); setErr("");
    try {
      const payload = { weekday, start_time: start, end_time: end };
      if (editing?.id) await coll.update(editing.id, payload as Partial<Availability>);
      else await coll.create(payload as Partial<Availability>);
      setOpen(false); load();
    } catch { setErr(T("av.errSave")); } finally { setBusy(false); }
  }
  async function remove(a: Availability) {
    if (!a.id) return;
    setItems((it) => it?.filter((x) => x.id !== a.id) ?? it);   // optimistic
    try { await coll.remove(a.id); } catch { load(); }
  }

  const has = (items?.length ?? 0) > 0;

  return (
    <div className="rounded-2xl border border-border bg-card">
      {/* the header — the Add button is ALWAYS visible */}
      <div className="flex items-center justify-between gap-3 border-b border-border p-4">
        <div>
          <div className="text-[15px] font-bold text-foreground">{T("av.title")}</div>
          <div className="text-[12.5px] text-muted-foreground">{T("av.subtitle")}</div>
        </div>
        <button onClick={openCreate} className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[13px] font-bold text-primary-foreground">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          {T("av.add")}
        </button>
      </div>

      {items === null ? (
        <div className="space-y-2 p-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />)}</div>
      ) : !has ? (
        <div className="flex flex-col items-center gap-1 px-6 py-12 text-center">
          <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted text-muted-foreground">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
          </div>
          <div className="text-[13px] font-bold text-foreground">{T("av.empty")}</div>
          <div className="text-xs text-muted-foreground">{T("av.emptySub")}</div>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {DAYS.map((w) => {
            const slots = byDay[w];
            if (!slots || slots.length === 0) return null;
            return (
              <div key={w} className="flex items-start gap-3 p-4">
                <div className="w-28 flex-none pt-1 text-[13px] font-bold capitalize text-foreground">{dayLabel(w)}</div>
                <div className="flex flex-1 flex-wrap gap-2">
                  {slots.map((a) => (
                    <div key={a.id} className="flex items-center gap-1 rounded-lg border border-border bg-muted px-2.5 py-1.5 text-[12.5px] font-semibold text-foreground">
                      <span>{a.start_time} – {a.end_time}</span>
                      <IconBtn onClick={() => openEdit(a)} label={T("av.edit")}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg></IconBtn>
                      <IconBtn onClick={() => remove(a)} label={T("av.remove")}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg></IconBtn>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* modal add/editar */}
      {open && (
        <div role="dialog" aria-modal="true" onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 60 }} className="flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-[1px]">
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl">
            <div className="mb-4 text-[15px] font-bold text-foreground">{editing ? T("av.editTitle") : T("av.addTitle")}</div>
            <label className="mb-1 block text-xs font-bold text-foreground">{T("av.day")}</label>
            <select value={weekday} onChange={(e) => setWeekday(e.target.value)}
              className="mb-3 h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-primary">
              {DAYS.map((w) => <option key={w} value={w} className="capitalize">{dayLabel(w)}</option>)}
            </select>
            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-foreground">{T("av.start")}</label>
                <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-primary" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-foreground">{T("av.end")}</label>
                <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-primary" />
              </div>
            </div>
            {err && <div className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">{err}</div>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="h-10 rounded-lg border border-border px-4 text-[13px] font-semibold text-muted-foreground">{T("av.cancel")}</button>
              <button onClick={save} disabled={busy} className="h-10 rounded-lg bg-primary px-5 text-[13px] font-bold text-primary-foreground disabled:opacity-50">{busy ? T("av.saving") : T("av.save")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
