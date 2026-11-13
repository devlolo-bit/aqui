/**
 * <AgendaBoard/> — the READY-MADE piece of the PROVIDER's agenda (the owner's side, it complements the client's <SlotPicker/>). A week
 * strip + the day's list of bookings with confirm/cancel, RESCHEDULE (it picks a free slot) and BLOCK a slot.
 * It reuses the "booking" blueprint (service/availability/booking); no new model. Token-driven and light/dark.
 *
 * `<AgendaBoard/>` (or with custom model names). It only makes sense for whoever manages the agenda (the owner/an admin) — protect the route.
 * A platform component — the app USES the <AgendaBoard/>, it does not recreate it. Code-split by the fab-client.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, useAuth, useLocale, type Row } from "./fab-client";
import { t as i18n, type FabI18nKey } from "./fab-i18n";

type Service = Row & { name?: string; duration_min?: number };
type Availability = Row & { service?: string | null; weekday?: string | number; start_time?: string; end_time?: string };
type Booking = Row & { service?: string; customer?: string; customer_name?: string; start?: string; end?: string; day?: string; status?: string };

const SKEL = "animate-pulse bg-muted";
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hhmm = (iso?: string) => { if (!iso) return ""; const d = new Date(iso); return isNaN(+d) ? "" : `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
function timesInWindow(start: string, end: string, step: number): string[] {
  const [sh, sm] = (start || "").split(":").map(Number); const [eh, em] = (end || "").split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n)) || step <= 0) return [];
  const out: string[] = []; let cur = sh * 60 + sm; const endM = eh * 60 + em;
  while (cur + step <= endM) { out.push(`${pad(Math.floor(cur / 60))}:${pad(cur % 60)}`); cur += step; }
  return out;
}
const STATUS: Record<string, { key: FabI18nKey; color: string }> = {
  confirmed: { key: "ag.confirmed", color: "var(--success)" },
  pending: { key: "ag.pending", color: "var(--warning)" },
  canceled: { key: "ag.canceled", color: "var(--muted-foreground)" },
  completed: { key: "ag.completed", color: "var(--info)" },
  blocked: { key: "ag.blocked", color: "var(--destructive)" },
};

export function AgendaBoard({ bookingModel = "booking", serviceModel = "service", availabilityModel = "availability" }:
  { bookingModel?: string; serviceModel?: string; availabilityModel?: string }) {
  const { user } = useAuth();
  const loc = useLocale();
  const T = useCallback((k: FabI18nKey) => i18n(loc, k), [loc]);
  const bookings = useMemo(() => collection<Booking>(bookingModel), [bookingModel]);
  const services = useMemo(() => collection<Service>(serviceModel), [serviceModel]);
  const avails = useMemo(() => collection<Availability>(availabilityModel), [availabilityModel]);

  const [selDate, setSelDate] = useState(() => startOfDay(new Date()));
  const [svcMap, setSvcMap] = useState<Record<string, Service>>({});
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [rows, setRows] = useState<Booking[] | null>(null);
  const [pick, setPick] = useState<{ mode: "reschedule" | "block"; booking?: Booking } | null>(null);

  useEffect(() => {
    services.list({ limit: 200 }).then((s) => setSvcMap(Object.fromEntries(s.map((x) => [x.id, x])))).catch(() => {});
    avails.list({ limit: 200 }).then(setAvailability).catch(() => {});
  }, [services, avails]);
  const load = useCallback(() => {
    bookings.list({ filter: { day: ymd(selDate) }, sort: "start", limit: 200 }).then(setRows).catch(() => setRows([]));
  }, [bookings, selDate]);
  useEffect(() => { setRows(null); load(); }, [load]);

  const week = useMemo(() => {   // 7 days starting from the Sunday of the selDate's week
    const sun = new Date(selDate); sun.setDate(selDate.getDate() - selDate.getDay());
    return Array.from({ length: 7 }, (_, i) => new Date(sun.getFullYear(), sun.getMonth(), sun.getDate() + i));
  }, [selDate]);
  const shiftWeek = (n: number) => setSelDate((d) => { const x = new Date(d); x.setDate(d.getDate() + n * 7); return x; });

  // the day's free slots (to reschedule/block): the weekday's windows − the existing active bookings
  const freeSlots = useMemo(() => {
    const wd = selDate.getDay();
    const step = (pick?.booking && svcMap[pick.booking.service || ""]?.duration_min) || 30;
    const taken = new Set((rows || []).filter((b) => b.status !== "canceled" && b.id !== pick?.booking?.id).map((b) => hhmm(b.start)));
    const all = availability.filter((a) => (!a.service || !pick?.booking?.service || a.service === pick.booking.service) && Number(a.weekday) === wd)
      .flatMap((a) => timesInWindow(a.start_time || "", a.end_time || "", step));
    return Array.from(new Set(all)).sort().filter((t) => !taken.has(t));
  }, [selDate, availability, rows, pick, svcMap]);

  const patch = (id: string, p: Partial<Booking>) => { setRows((r) => r?.map((x) => (x.id === id ? { ...x, ...p } : x)) ?? r); bookings.update(id, p).catch(() => load()); };
  function applyPick(time: string) {
    const [h, m] = time.split(":").map(Number);
    const start = new Date(selDate); start.setHours(h, m, 0, 0);
    if (pick?.mode === "reschedule" && pick.booking?.id) {
      const dur = svcMap[pick.booking.service || ""]?.duration_min || 30;
      patch(pick.booking.id, { start: start.toISOString(), end: new Date(start.getTime() + dur * 60000).toISOString(), day: ymd(selDate) });
    } else if (pick?.mode === "block") {
      bookings.create({ status: "blocked", day: ymd(selDate), start: start.toISOString(),
        end: new Date(start.getTime() + 30 * 60000).toISOString(), customer: user?.id } as Partial<Booking>)
        .then(() => load()).catch(() => {});
    }
    setPick(null);
  }

  const dow = (d: Date) => new Intl.DateTimeFormat(loc, { weekday: "short" }).format(d);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-3">
        <div className="flex items-center gap-1">
          <button aria-label={T("ag.prev")} onClick={() => shiftWeek(-1)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg></button>
          <button onClick={() => setSelDate(startOfDay(new Date()))} className="rounded-lg px-2.5 py-1 text-[12px] font-semibold text-foreground hover:bg-muted">{T("ag.today")}</button>
          <button aria-label={T("ag.next")} onClick={() => shiftWeek(1)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg></button>
        </div>
        <button onClick={() => setPick({ mode: "block" })} className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-[12.5px] font-semibold text-foreground/80">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M8 15l8 4M16 15l-8 4" /></svg>{T("ag.block")}
        </button>
      </div>

      {/* the week strip */}
      <div className="grid grid-cols-7 gap-1 p-2">
        {week.map((d, i) => {
          const on = ymd(d) === ymd(selDate); const today = ymd(d) === ymd(new Date());
          return (
            <button key={i} onClick={() => setSelDate(startOfDay(d))} className={`flex flex-col items-center rounded-lg py-2 ${on ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
              <span className={`text-[10px] font-bold uppercase ${on ? "" : "text-muted-foreground"}`}>{dow(d)}</span>
              <span className={`mt-0.5 text-[15px] font-bold ${today && !on ? "text-primary" : ""}`}>{d.getDate()}</span>
            </button>
          );
        })}
      </div>

      {/* the pick-a-slot mode (reschedule/block) */}
      {pick && (
        <div className="border-t border-border bg-muted/40 p-3">
          <div className="mb-2 text-[12.5px] font-bold text-foreground">{T("ag.pickSlot")}</div>
          {freeSlots.length === 0 ? <div className="text-xs text-muted-foreground">{T("ag.noSlots")}</div> : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {freeSlots.map((t) => <button key={t} onClick={() => applyPick(t)} className="rounded-lg border border-border bg-card py-2 text-[13px] font-semibold text-foreground hover:border-primary">{t}</button>)}
            </div>
          )}
          <button onClick={() => setPick(null)} className="mt-2 text-[12px] font-semibold text-muted-foreground">{T("ag.cancel")}</button>
        </div>
      )}

      {/* the day's bookings */}
      {!pick && (
        <div className="border-t border-border">
          {rows === null && Array.from({ length: 3 }).map((_, i) => <div key={i} className="flex items-center gap-3 border-b border-border p-3"><div className={`${SKEL} h-4 w-12 rounded`} /><div className="flex-1"><div className={`${SKEL} mb-1.5 h-3 w-1/3 rounded`} /><div className={`${SKEL} h-2.5 w-1/4 rounded`} /></div></div>)}
          {rows?.length === 0 && <div className="p-8 text-center text-[13px] text-muted-foreground">{T("ag.noBookings")}</div>}
          {rows?.map((b) => {
            const st = STATUS[b.status || "confirmed"] || STATUS.confirmed;
            const blocked = b.status === "blocked";
            return (
              <div key={b.id} className="flex items-center gap-3 border-b border-border p-3">
                <div className="w-12 flex-none text-[13px] font-bold text-foreground">{hhmm(b.start)}</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-bold text-foreground">{blocked ? T("ag.blocked") : (b.customer_name || "—")}</div>
                  {!blocked && <div className="truncate text-[11.5px] text-muted-foreground">{svcMap[b.service || ""]?.name || ""}</div>}
                </div>
                <span className="hidden items-center gap-1.5 text-[11.5px] font-bold sm:flex" style={{ color: st.color }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: st.color }} />{T(st.key)}</span>
                {b.status !== "canceled" && !blocked && (
                  <div className="flex gap-1">
                    {b.status !== "confirmed" && <button onClick={() => b.id && patch(b.id, { status: "confirmed" })} aria-label={T("ag.confirm")} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--success)] hover:bg-muted"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></button>}
                    <button onClick={() => setPick({ mode: "reschedule", booking: b })} aria-label={T("ag.reschedule")} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg></button>
                    <button onClick={() => b.id && patch(b.id, { status: "canceled" })} aria-label={T("ag.cancel")} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
                  </div>
                )}
                {blocked && b.id && <button onClick={() => { setRows((r) => r?.filter((x) => x.id !== b.id) ?? r); bookings.remove(b.id!).catch(() => load()); }} aria-label={T("ag.cancel")} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg></button>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
