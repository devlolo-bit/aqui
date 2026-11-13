/**
 * <SlotPicker/> — the READY-MADE booking piece (the "booking" blueprint). The steps date → slot → confirm. It reads the
 * `service` (the duration/price) + the `availability` (the windows per weekday) and generates the day's FREE slots
 * by subtracting the existing `booking`s; on confirm, it creates the `booking`. A MONTH calendar (a grid) or a WEEK one
 * (a compact strip). Token-driven (it inherits the theme) and light/dark. The day/month names by locale (Intl).
 *
 * A platform component — the app USES the <SlotPicker/>, it does not recreate it. Code-split by the fab-client.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, formatMoney, useAuth, useLocale, type Row } from "./fab-client";
import { t as i18n, type FabI18nKey } from "./fab-i18n";

export type Service = Row & { name?: string; duration_min?: number; price?: number; active?: boolean };
export type Availability = Row & { service?: string | null; weekday?: string | number; start_time?: string; end_time?: string };
export type Booking = Row & { service?: string; customer?: string; customer_name?: string; start?: string; end?: string; day?: string; status?: string; price?: number };

const SKEL = "animate-pulse bg-muted";
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
function timesInWindow(start: string, end: string, stepMin: number): string[] {
  const [sh, sm] = (start || "").split(":").map(Number); const [eh, em] = (end || "").split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n)) || stepMin <= 0) return [];
  const out: string[] = []; let cur = sh * 60 + sm; const endM = eh * 60 + em;
  while (cur + stepMin <= endM) { out.push(`${pad(Math.floor(cur / 60))}:${pad(cur % 60)}`); cur += stepMin; }
  return out;
}

export function SlotPicker({ serviceId, serviceModel = "service", availabilityModel = "availability",
  bookingModel = "booking", onBooked }:
  { serviceId?: string; serviceModel?: string; availabilityModel?: string; bookingModel?: string; onBooked?: (b: Booking) => void }) {
  const { user } = useAuth();
  const loc = useLocale();
  const T = useCallback((k: FabI18nKey) => i18n(loc, k), [loc]);
  const services = useMemo(() => collection<Service>(serviceModel), [serviceModel]);
  const avails = useMemo(() => collection<Availability>(availabilityModel), [availabilityModel]);
  const bookings = useMemo(() => collection<Booking>(bookingModel), [bookingModel]);

  const [service, setService] = useState<Service | null>(null);
  const [availability, setAvailability] = useState<Availability[] | null>(null);
  const [month, setMonth] = useState(() => startOfDay(new Date()));
  const [selDate, setSelDate] = useState<Date | null>(null);
  const [selSlot, setSelSlot] = useState<string | null>(null);
  const [dayBookings, setDayBookings] = useState<Booking[]>([]);
  const [loadingDay, setLoadingDay] = useState(false);
  const [view, setView] = useState<"month" | "week">("month");
  const [status, setStatus] = useState<"idle" | "confirming" | "done">("idle");
  const [done, setDone] = useState<Booking | null>(null);

  // it loads the service (the one given, otherwise the 1st active one) + the availability windows
  useEffect(() => {
    (serviceId ? services.get(serviceId) : services.list({ filter: { active: true }, limit: 1 }).then((s) => s[0] || null))
      .then((s) => setService(s || null)).catch(() => setService(null));
  }, [serviceId, services]);
  useEffect(() => {
    avails.list({ limit: 200 }).then(setAvailability).catch(() => setAvailability([]));
  }, [avails]);

  const sid = service?.id;
  const windows = useMemo(() => (availability || []).filter((a) => !a.service || a.service === sid), [availability, sid]);
  const availWeekdays = useMemo(() => new Set(windows.map((w) => Number(w.weekday))), [windows]);
  const stepMin = service?.duration_min && service.duration_min > 0 ? service.duration_min : 30;

  // when a day is picked: it fetches that day's bookings (an equality by `day`) to subtract the taken slots
  useEffect(() => {
    if (!selDate) { setDayBookings([]); return; }
    setLoadingDay(true);
    bookings.list({ filter: { day: ymd(selDate) }, limit: 200 })
      // the cancelled ones RELEASE the slot; confirmed/pending/blocked (the provider's block through the <AgendaBoard/>) TAKE it.
      .then((b) => setDayBookings(b.filter((x) => (!sid || x.service === sid) && x.status !== "canceled")))
      .catch(() => setDayBookings([])).finally(() => setLoadingDay(false));
  }, [selDate, bookings, sid]);

  const slots = useMemo(() => {
    if (!selDate) return [] as string[];
    const wd = selDate.getDay();
    const taken = new Set(dayBookings.map((b) => (b.start ? new Date(b.start) : null)).filter(Boolean)
      .map((d) => `${pad((d as Date).getHours())}:${pad((d as Date).getMinutes())}`));
    const isToday = ymd(selDate) === ymd(new Date());
    const now = new Date();
    const all = windows.filter((w) => Number(w.weekday) === wd)
      .flatMap((w) => timesInWindow(w.start_time || "", w.end_time || "", stepMin));
    return Array.from(new Set(all)).sort().filter((tm) => {
      if (taken.has(tm)) return false;
      if (isToday) { const [h, m] = tm.split(":").map(Number); if (h * 60 + m <= now.getHours() * 60 + now.getMinutes()) return false; }
      return true;
    });
  }, [selDate, windows, dayBookings, stepMin]);

  const pickDate = (d: Date) => { setSelDate(d); setSelSlot(null); };
  async function confirm() {
    if (!selDate || !selSlot || !user || !sid || status === "confirming") return;  // a guard against a double click
    setStatus("confirming");
    const [h, m] = selSlot.split(":").map(Number);
    const start = new Date(selDate); start.setHours(h, m, 0, 0);
    const end = new Date(start.getTime() + stepMin * 60000);
    try {
      const b = await bookings.create({ service: sid, customer: user.id, customer_name: user.name, start: start.toISOString(),
        end: end.toISOString(), day: ymd(selDate), status: "confirmed", price: service?.price } as Partial<Booking>);
      setDone(b); setStatus("done"); onBooked?.(b);
    } catch { setStatus("idle"); }
  }

  const dow = useMemo(() => {  // the days' initials (Sun→Sat) in the locale
    const base = new Date(2024, 8, 1); // a Sunday
    return Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(loc, { weekday: "narrow" }).format(new Date(base.getFullYear(), base.getMonth(), 1 + i)));
  }, [loc]);
  const monthLabel = new Intl.DateTimeFormat(loc, { month: "long", year: "numeric" }).format(month);
  const shiftMonth = (n: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));

  // ---- SUCCESS ----
  if (status === "done" && done && selDate) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--success)]/15 text-[var(--success)]">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        </div>
        <div className="mt-3 text-base font-bold text-foreground">{T("bk.done")}</div>
        <div className="mt-1 text-[13px] text-muted-foreground">
          {new Intl.DateTimeFormat(loc, { weekday: "long", day: "2-digit", month: "2-digit" }).format(selDate)} · {selSlot} · {service?.name}
        </div>
      </div>
    );
  }

  // ---- NO AVAILABILITY ----
  if (availability !== null && windows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted text-muted-foreground">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
        </div>
        <div className="text-[13px] font-bold text-foreground">{T("bk.noAvail")}</div>
        <div className="text-xs text-muted-foreground">{T("bk.noAvailSub")}</div>
      </div>
    );
  }

  // the month's grid
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const lead = first.getDay();
  const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const today = startOfDay(new Date());
  const cells: (Date | null)[] = [...Array(lead).fill(null), ...Array.from({ length: total }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  // the selected date's week (or the current one) — a simple computation (no hook: it comes AFTER the early returns above).
  const wkBase = startOfDay(selDate || new Date()); const wkSun = new Date(wkBase); wkSun.setDate(wkBase.getDate() - wkBase.getDay());
  const weekDays: Date[] = Array.from({ length: 7 }, (_, i) => new Date(wkSun.getFullYear(), wkSun.getMonth(), wkSun.getDate() + i));

  const stepDot = (n: number, label: FabI18nKey, state: "done" | "active" | "todo") => (
    <div className="flex items-center gap-2">
      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${state === "done" ? "bg-[var(--success)] text-white" : state === "active" ? "bg-primary text-primary-foreground" : "border border-border bg-muted text-muted-foreground"}`}>{state === "done" ? "✓" : n}</span>
      <span className={`text-[12.5px] font-bold ${state === "todo" ? "text-muted-foreground" : "text-foreground"}`}>{T(label)}</span>
    </div>
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      {/* the steps + the month/week toggle */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {stepDot(1, "bk.stepDate", selDate ? "done" : "active")}
        <div className="h-0.5 w-6 bg-border" />
        {stepDot(2, "bk.stepTime", selSlot ? "done" : selDate ? "active" : "todo")}
        <div className="h-0.5 w-6 bg-border" />
        {stepDot(3, "bk.stepConfirm", selSlot ? "active" : "todo")}
        <div className="flex-1" />
        <div className="flex gap-0.5 rounded-lg border border-border bg-muted p-0.5 text-xs font-semibold">
          {(["month", "week"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`rounded-md px-2.5 py-1 ${view === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>{T(v === "month" ? "bk.month" : "bk.week")}</button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-5">
        {/* the calendar */}
        <div className="min-w-[280px] flex-1">
          {view === "month" ? (
            <>
              <div className="mb-3 flex items-center justify-between">
                <button aria-label={T("bk.prev")} onClick={() => shiftMonth(-1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg></button>
                <span className="text-[15px] font-bold capitalize text-foreground">{monthLabel}</span>
                <button aria-label={T("bk.next")} onClick={() => shiftMonth(1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg></button>
              </div>
              <div className="mb-1.5 grid grid-cols-7 gap-1.5">{dow.map((d, i) => <div key={i} className="text-center text-[10.5px] font-bold uppercase text-muted-foreground/70">{d}</div>)}</div>
              <div className="grid grid-cols-7 gap-1.5">
                {cells.map((d, i) => {
                  if (!d) return <div key={i} />;
                  const avail = availWeekdays.has(d.getDay()) && d >= today;
                  const isSel = selDate && ymd(selDate) === ymd(d);
                  const isToday = ymd(d) === ymd(new Date());
                  return (
                    <button key={i} disabled={!avail} onClick={() => avail && pickDate(d)}
                      className={`flex h-9 items-center justify-center rounded-lg text-[13px] font-semibold ${isSel ? "bg-primary text-primary-foreground" : avail ? "bg-accent text-primary hover:brightness-95" : "text-muted-foreground/50"} ${isToday && !isSel ? "ring-1 ring-primary" : ""}`}>{d.getDate()}</button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex gap-2">
              {weekDays.map((d, i) => {
                const avail = availWeekdays.has(d.getDay()) && d >= today;
                const isSel = selDate && ymd(selDate) === ymd(d);
                return (
                  <button key={i} disabled={!avail} onClick={() => avail && pickDate(d)}
                    className={`flex-1 rounded-xl py-3.5 text-center ${isSel ? "bg-primary text-primary-foreground" : avail ? "bg-accent text-primary" : "border border-border bg-muted text-muted-foreground/60"}`}>
                    <div className="text-[10.5px] font-bold uppercase">{new Intl.DateTimeFormat(loc, { weekday: "short" }).format(d)}</div>
                    <div className="mt-0.5 text-lg font-bold">{d.getDate()}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* the slots + the summary */}
        <div className="w-full flex-none md:w-[340px]">
          {selDate && (
            <>
              <div className="mb-2.5 text-xs font-bold text-foreground">{T("bk.times")} · <span className="text-primary">{new Intl.DateTimeFormat(loc, { day: "2-digit", month: "2-digit" }).format(selDate)}</span></div>
              {loadingDay ? (
                <div className="grid grid-cols-3 gap-2">{Array.from({ length: 9 }).map((_, i) => <div key={i} className={`${SKEL} h-11 rounded-lg`} />)}</div>
              ) : slots.length === 0 ? (
                <div className="rounded-xl border border-border bg-muted px-4 py-6 text-center text-xs text-muted-foreground">{T("bk.noAvail")}</div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {slots.map((tm) => (
                    <button key={tm} onClick={() => setSelSlot(tm)} className={`rounded-lg border py-2.5 text-[13px] font-semibold ${selSlot === tm ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary"}`}>{tm}</button>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="mt-4 rounded-2xl border border-border bg-muted p-4">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-[13.5px] font-bold text-foreground">{service?.name || "—"}</span>
              {!!service?.duration_min && <span className="rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] text-muted-foreground">{service.duration_min} {T("bk.min")}</span>}
            </div>
            <div className="flex items-center gap-2 text-[12.5px] text-foreground/80">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
              {selDate ? new Intl.DateTimeFormat(loc, { day: "2-digit", month: "long", weekday: "long" }).format(selDate) : "—"}
            </div>
            <div className={`mt-1.5 flex items-center gap-2 text-[12.5px] ${selSlot ? "text-foreground/80" : "text-muted-foreground/70"}`}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
              {selSlot || T("bk.chooseTime")}
            </div>
            {service?.price != null && (
              <div className="mt-3.5 flex items-center justify-between border-t border-border pt-3.5">
                <span className="text-xs text-muted-foreground">{T("bk.total")}</span>
                <span className="text-xl font-bold text-foreground">{formatMoney(service.price)}</span>
              </div>
            )}
            <button onClick={confirm} disabled={!selSlot || status === "confirming"}
              className="mt-3 h-11 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50">
              {status === "confirming" ? T("bk.confirming") : T("bk.confirm")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
