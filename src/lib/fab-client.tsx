/**
 * Fabapp's client SDK for the GENERATED app (a Vite SPA, 100% client-side). Auth by COOKIE (the same risk profile as the
 * localStorage's, but readable by the JS itself). EVERY read/mutation/auth runs in the visitor's browser — there is no more
 * server-side execution of untrusted code. The config through VITE_FAB_* (injected by the platform at build/preview time).
 */
import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
// `toast` from the PACKAGE, not from the app's copy of `components/ui/sonner` (app-owned: an older copy may not
// export it, and a missing export fails the app's build). Every app's <Toaster/> listens to this same package store.
import { toast } from "sonner";
import { t as i18n, type FabI18nKey } from "@/lib/fab-i18n";
import { currentShell, saleOrigin, storeFinish, storeProducts, storePurchase, storeRestore, type SaleOrigin } from "@/lib/fab-shell";
import { readCookie, writeCookie } from "@/lib/fab-cookie";
import { createLiveHub, type LiveEnv, type LiveHub } from "@/lib/fab-live";
import { formatTaxId, isValidCnpj, isValidCpf, normalizeTaxId } from "@/lib/utils";

export const fabConfig = {
  base: (import.meta.env.VITE_FAB_BASE_URL || "http://localhost:8000").replace(/\/$/, ""),
  project: import.meta.env.VITE_FAB_PROJECT_ID || "",
  // Realtime at the edge (Durable Objects). Set → the useLive uses a WebSocket (an invalidation) instead of SSE. Empty → SSE/polling.
  realtime: (import.meta.env.VITE_FAB_REALTIME_URL || "").replace(/\/$/, ""),
  // THE BRAND: the logo (the URL of the image uploaded in the Brand panel) and the name. Injected per build from the theme — when the
  // owner uploads a logo, it shows up in EVERY <Logo/> without touching the code. Empty → the <Logo/> shows the name only.
  logo: (import.meta.env.VITE_FAB_LOGO || "").trim(),
  // THE SYMBOL (the square icon, with no lettering) — a SEPARATE slot from the logo, and the difference is what
  // `<Logo/>` needs in order to stop guessing. A logo is usually a LOCKUP: it already has the brand's name drawn
  // inside it, so writing the name beside it prints the brand twice. A symbol has no lettering, so the name beside
  // it is exactly right. One slot could not tell the two apart, and `variant="full"` had to assume.
  icon: (import.meta.env.VITE_FAB_ICON || "").trim(),
  logoName: (import.meta.env.VITE_FAB_LOGO_NAME || "").trim(),
  // The app's CURRENCY (ISO 4217), set by the AI according to the app's country and injected at build time. NEVER a fixed BRL → a neutral USD
  // as the fallback. Use `formatMoney(v)` to display money (the app currency's symbol/separators).
  currency: (import.meta.env.VITE_FAB_CURRENCY || "USD").trim().toUpperCase(),
  // The app's LOCALE (BCP-47, e.g. pt-BR/en-US/es-ES), set by the AI according to the app's country/language (the default = the locale
  // of WHOEVER CREATED it) and injected at build time. Empty → the format follows the browser. Use `formatDate(v)`/`formatDateTime(v)`
  // and the <DatePicker> instead of a hardcoded `.toLocaleDateString('pt-BR')` or an `<input type="date">` (which follows the
  // browser, not the app — that was the "mm/dd" bug in an en-US browser).
  locale: (import.meta.env.VITE_FAB_LOCALE || "").trim(),
  // WHAT THE APP IS, one line, from the Brand panel's description. Injected at build time (materialize writes
  // VITE_FAB_DESCRIPTION), so it is stable for the whole session — unlike `<meta name="description">`, which `useSeo`
  // rewrites on every route change. Consumed by `readAuthIdentity` → the `<AuthCard>` tagline. Empty → no tagline.
  description: (import.meta.env.VITE_FAB_DESCRIPTION || "").trim(),
};

/** It formats a monetary value in the app's CURRENCY (`fabConfig.currency`) and in the app's LOCALE. Pass a `currency` to
 * override (e.g. a record with a `currency` field of its own). Use it instead of an `Intl.NumberFormat` with a fixed currency.
 *
 * The locale is NOT optional here, and passing `undefined` was a real bug: `undefined` means "the RUNTIME's locale", i.e.
 * the VIEWER'S BROWSER. So a Brazilian app opened in an en-US browser printed `R$4,500.00` — the right symbol with US
 * grouping and decimal separator — and a German one `€12,000.00` instead of `12.000,00 €`. The currency looked localized
 * and the number was not, which is the kind of wrong that reads as sloppy rather than broken. `formatDate` right below
 * always did the right thing (`appLocale()`); money was the one that did not. */
export function formatMoney(value: number, currency?: string): string {
  const cur = (currency || fabConfig.currency || "USD").toUpperCase();
  try { return new Intl.NumberFormat(appLocale(), { style: "currency", currency: cur }).format(value); }
  catch { return `${cur} ${Number(value).toFixed(2)}`; }
}

/** The app's effective locale (from the build; empty = it follows the browser). An `undefined` lets the Intl use the runtime's default. */
function appLocale(): string | undefined { return fabConfig.locale || undefined; }

/** A `date` field holds a DATE-ONLY string (`2026-03-02`) and `new Date("2026-03-02")` parses it as UTC midnight —
 * which, rendered in any timezone west of Greenwich, is the DAY BEFORE. A due date of the 2nd showed up as the 1st for
 * every user in the Americas, on every screen, in every generated app; the value in the database was right, so nothing
 * looked broken enough to investigate. A date with no time has no timezone either: it must be read as LOCAL midnight.
 * A full timestamp (with `T`) is left alone — there the offset is meaningful and must be honoured. */
function _parse(value: string | number): Date {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
}

/** It formats a DATE in the app's LOCALE (e.g. pt-BR → dd/mm/aaaa). It accepts a `Date`, an ISO string or epoch ms. ALWAYS use
 * this (or the <DatePicker>) instead of a hardcoded `.toLocaleDateString('pt-BR')` — the date then respects the locale of
 * whoever created the app, and it changes along when the locale changes. The `opts` (Intl.DateTimeFormatOptions) overrides the `short` default. */
export function formatDate(value: Date | string | number, opts?: Intl.DateTimeFormatOptions): string {
  const d = value instanceof Date ? value : _parse(value);
  if (isNaN(d.getTime())) return "";
  try { return new Intl.DateTimeFormat(appLocale(), opts || { dateStyle: "short" }).format(d); }
  catch { return d.toISOString().slice(0, 10); }
}

/** It formats a DATE + TIME in the app's locale. (The `toLocaleDateString` does NOT accept a `timeStyle`; this is the right way.) */
export function formatDateTime(value: Date | string | number, opts?: Intl.DateTimeFormatOptions): string {
  return formatDate(value, opts || { dateStyle: "short", timeStyle: "short" });
}

// ---- <Logo/> — the app's brand (a ready-made piece) ------------------------------------------------------------
// It renders the brand: the LOGO (a lockup) or the SYMBOL uploaded in the Brand panel; with neither, the NAME. Use it in the header, the nav, the
// footer and the auth screens. THE POINT: when the owner uploads a logo, it shows up in EVERY <Logo/> without touching the code —
// which is why you should prefer a <Logo/> over writing an icon + text by hand. It is STYLABLE: pass a `className` (on the wrapper),
// an `imgClassName`/`textClassName` to adjust it, and a `variant` to choose what to show.
//   <Logo className="h-8" />                       // the logo (or the name) at the default size
//   <Logo variant="full" className="gap-2" />       // the logo + the name side by side (the full brand)
//   <Logo variant="mark" imgClassName="rounded-lg" /> // the symbol only
export type LogoProps = {
  /** "auto" (the default): the logo when there is one, otherwise the name · "mark": the logo/symbol only, falling
   *  back to a MONOGRAM (never the full name — a mark is sized as an icon) · "wordmark": the name only · "full": the logo+name */
  variant?: "auto" | "mark" | "wordmark" | "full";
  /** the name to display when there is no logo (or in the full/wordmark variant). The default: the Brand's name. */
  name?: string;
  className?: string;
  imgClassName?: string;
  textClassName?: string;
  /** a custom fallback when there is NO logo and you do not want the text (e.g. a lucide icon). Only in the mark/auto variant. */
  fallback?: ReactNode;
};

export function Logo({ variant = "auto", name, className, imgClassName, textClassName, fallback }: LogoProps) {
  const label = (name ?? fabConfig.logoName) || "";
  const cls = "h-7 w-auto object-contain " + (imgClassName || "");
  const pic = (src: string) => <img src={src} alt={label || "logo"} className={cls} />;
  const logo = fabConfig.logo ? pic(fabConfig.logo) : null;      // the LOCKUP: usually carries the name already
  const icon = fabConfig.icon ? pic(fabConfig.icon) : null;      // the SYMBOL: no lettering
  const text = <span className={"font-display text-lg font-bold tracking-tight " + (textClassName || "")}>{label}</span>;
  const wrap = "inline-flex items-center gap-2 " + (className || "");
  // ⚠️ A MARK IS A SYMBOL, and with no symbol uploaded the fallback still has to BEHAVE like one. `mark` used to
  // fall through to the full wordmark, so an app with no logo rendered its whole NAME inside whatever box the
  // caller had sized for an icon. Measured on the imported church app (2026-09-12): a 40-character name in a 44px
  // square (`size-11`), overflowing in every direction and painting over the brand text beside it — the first thing
  // anyone saw on every screen. The monogram is the smallest thing that is still the brand, and it cannot grow.
  const initials = (label.match(/\p{L}[\p{L}\p{M}]*/gu) || []).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const monogram = (
    <span role="img" aria-label={label || undefined}
          className={"flex size-full min-h-6 min-w-6 shrink-0 items-center justify-center overflow-hidden "
                     + "rounded-[inherit] bg-primary/15 font-display text-sm font-bold uppercase leading-none "
                     + "text-primary " + (imgClassName || "") + " " + (textClassName || "")}>{initials || "•"}</span>
  );

  let inner: ReactNode;
  // the SYMBOL first; an app that only uploaded a lockup still gets a mark out of it, which is what it did before
  if (variant === "mark") inner = icon ?? logo ?? fallback ?? monogram;
  else if (variant === "wordmark") inner = text;
  else if (variant === "full") {
    // ⚠️ WITH A LOGO, THE LOGO ALONE. A lockup already has the brand written inside it, so adding the label beside
    // it prints the name twice. This used to draw `img + text` unconditionally, and the damage was visible: a
    // customer's app opened with "GW IMPORTS.jpg" (a FILE name, from an older defect) next to the JR GAMES logo —
    // and even with the name correct it would have said "JR GAMES" twice.
    // With only a symbol, symbol + name IS the composition `full` promises.
    inner = logo ?? (icon ? <>{icon}{label ? text : null}</> : (label ? text : fallback ?? null));
  } else inner = logo ?? icon ?? fallback ?? text;   // auto
  return <span className={wrap}>{inner}</span>;
}

export type Row = { id: string; created_at?: string; updated_at?: string | null; updated_by?: string | null; [k: string]: unknown };
// What the SDK's generics actually REQUIRE of a record: an id. `Row` stays the default (and the untyped shape).
//
// It used to be `T extends Row`, and `Row` carries an index signature. An `interface Athlete { name: string }` — the
// shape the model writes for every model — has no implicit index signature, so `collection<Athlete>()` failed with
// TS2344 "Index signature for type 'string' is missing in type 'Athlete'". Measured on 2026-09-10 over 15 published
// apps: 156 of their 332 type errors were this one line, 47% of everything the checker had to say, and not one of
// them was a defect anybody could see. The SDK reads `r.id` and sorts by `keyof T`; it never needed the rest.
export type RowLike = { id: string };
export type AppUser = { id: string; email?: string | null; phone?: string | null; name?: string | null; roles?: string[]; plan?: string | null; plan_source?: string | null; plan_expires_at?: string | null; trial_used?: boolean; email_verified?: boolean; must_change_password?: boolean; [k: string]: unknown };

const COOKIE = `fab_token_${fabConfig.project}`;
// THE REFRESH, in a cookie of its own. Separate because the two have different jobs: the access token travels on
// every request, the refresh only on a renewal. Keeping them together would send the long-lived one along on every
// call for no reason.
const REFRESH_COOKIE = `fab_refresh_${fabConfig.project}`;
// The token IN MEMORY on top of the cookie. The reason: the Studio's PREVIEW embeds the app in a CROSS-SITE iframe
// (a preview-<app>.fabapp.app inside app.fabapp.ai). Browsers (Safari's ITP, Chrome's 3p cookies) BLOCK writing a
// third-party cookie in that context → the auto-login (setToken → getToken) failed silently and the preview opened
// logged out, even with the owner being an app-user. The cookie remains, to persist the PUBLISHED app's session (top-level, first-party);
// in the preview, the fragment's token is re-injected on every load, so memory is enough.
let _memToken: string | undefined;
// Are we in the PREVIEW? = embedded in an iframe. It is the only context where the 3p cookie is blocked and where the memory comes in.
function _inFrame(): boolean {
  return typeof window !== "undefined" && window.parent !== window;
}
// A NON httpOnly cookie (readable by the JS itself) — the same risk profile as the localStorage's; it persists the session across reloads.
// The parsing lives in `@/lib/fab-cookie` so it can be tested: it used to require a space after the `;` and to cut
// the value at the first `=`, and neither failure raises — the session simply vanishes and the app renders the
// logged-out screen, which is indistinguishable from a first visit.
function getToken(): string | undefined {
  const c = readCookie(COOKIE);
  if (c) return c;     // the PUBLISHED app (top-level): the cookie is the source of truth → a logout across tabs still holds
  // the in-memory fallback ONLY in the preview (an iframe): there the 3p cookie is blocked. In the published one we do not use memory, otherwise a
  // logout in one tab would not tear down the other (the memory would survive).
  return _inFrame() ? _memToken : undefined;
}
function setToken(t?: string) {
  _memToken = t || undefined;
  writeCookie(COOKIE, t);
}

let _memRefresh: string | undefined;
function getRefresh(): string | undefined {
  const c = readCookie(REFRESH_COOKIE);
  if (c) return c;
  return _inFrame() ? _memRefresh : undefined;
}
function setRefresh(t?: string) {
  _memRefresh = t || undefined;
  writeCookie(REFRESH_COOKIE, t);
}

/**
 * Renews the session ONCE and says whether it worked.
 *
 * ⚠️ WHY IT EXISTS. The session cookie lives 30 days and the token inside it has a deadline of its own; with no
 * renewal there comes a moment when the browser is still sending a credential the server has stopped accepting,
 * and the app draws its "session expired" screen over nothing. That happened in production 552 times in one day,
 * across 50 apps.
 *
 * ⚠️ ONE ATTEMPT AT A TIME, which is what the shared promise guarantees. A screen usually fires several calls at
 * once; if each 401 asked for its own renewal, the first rotation would invalidate the refresh the others are
 * still using, and the server's reuse detection would take the whole lineage down — trading one sign-out an hour
 * for an immediate one.
 */
let _renewing: Promise<boolean> | undefined;
function renew(): Promise<boolean> {
  if (_renewing) return _renewing;
  _renewing = (async () => {
    const refresh = getRefresh();
    if (!refresh) return false;
    try {
      const r = await fetch(`${fabConfig.base}/projects/${fabConfig.project}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      if (!r.ok) {
        // An explicit refusal is final: that refresh is spent. Clearing it here stops the attempt repeating on
        // every following call and lets the app fall into the signed-out state, which is the honest one.
        setToken(undefined);
        setRefresh(undefined);
        return false;
      }
      const dados = (await r.json()) as { access_token?: string; refresh_token?: string };
      if (!dados.access_token) return false;
      setToken(dados.access_token);
      if (dados.refresh_token) setRefresh(dados.refresh_token);
      return true;
    } catch {
      return false;      // a network failure is not an invalid session: nothing is cleared
    } finally {
      _renewing = undefined;
    }
  })();
  return _renewing;
}

export class ApiError extends Error {
  // `detail` is the server's raw `detail`: a string most of the time, an object when the refusal carries a code the
  // app can act on (e.g. `extractData` answering 413 `{ code: "use_extract_document", pages }`). `code` is the
  // body's own top-level `code` when there is one (a function call: `function_timeout`, `functions_unavailable`).
  constructor(public status: number, message: string, public detail?: unknown, public code?: string) { super(message); }
}

// An error answer is not always the API's JSON: a proxy in front of it can put its own text there (`error code:
// 504`). Reading it as JSON threw a SyntaxError where the app expected an ApiError with the status.
function apiError(res: Response, text: string): ApiError {
  let payload: { detail?: unknown; code?: unknown } | undefined;
  try { payload = text ? JSON.parse(text) : undefined; } catch { payload = undefined; }
  const detail = payload?.detail;
  const message = typeof detail === "string" ? detail : detail != null ? JSON.stringify(detail) : (res.statusText || `HTTP ${res.status}`);
  return new ApiError(res.status, message, detail, typeof payload?.code === "string" ? payload.code : undefined);
}

// `onHeaders`: receives the headers of the response that is actually answered (after a renewal, the repeat's):
// how the listing reads its `X-Next-Cursor` without a second request path that could renew on its own.
async function req<T>(method: string, path: string, body?: unknown, _renewed = false, onHeaders?: (h: Headers) => void): Promise<T> {
  const token = getToken();
  const res = await fetch(`${fabConfig.base}/projects/${fabConfig.project}${path}`, {
    method,
    headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  // ⚠️ A 401 WITH A SESSION IN HAND DESERVES A SECOND CHANCE, and this is where the fix touches the screen.
  // Without it the app shows "your session expired" to somebody whose session is perfectly alive on the server,
  // with only the access token past its deadline — which is exactly the 04/09/2026 outage.
  //
  // ⚠️ ONE ATTEMPT ONLY (`_renewed`). If the repeat also comes back 401 the session really is over, and
  // insisting would become a loop: two requests per call, for ever, against a server that already said no.
  if (res.status === 401 && !_renewed && token && await renew()) {
    return req<T>(method, path, body, true, onHeaders);
  }
  onHeaders?.(res.headers);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!res.ok) throw apiError(res, text);
  return (text ? JSON.parse(text) : undefined) as T;
}

// A POLLING GET (light realtime): it returns the data + the delta cursor (the `X-Fab-Now` header). It does NOT debit the monthly
// quota (only a rate limit on the server). Used by the `collection().poll()` — the app does not call this directly.
async function reqPoll<T>(path: string): Promise<{ data: T; cursor: string | null }> {
  const token = getToken();
  const res = await fetch(`${fabConfig.base}/projects/${fabConfig.project}${path}`, {
    method: "GET", headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const text = await res.text();
  if (!res.ok) throw apiError(res, text);
  return { data: (text ? JSON.parse(text) : undefined) as T, cursor: res.headers.get("X-Fab-Now") };
}

async function loginFlow(path: string, body: unknown): Promise<AppUser> {
  const { access_token, refresh_token } =
    await req<{ access_token: string; refresh_token?: string }>("POST", path, body);
  setToken(access_token);
  // Absent in the flows that come back through a redirect (OAuth/SSO): there the access token is what exists, and
  // it is already session-backed, revocable on the server.
  setRefresh(refresh_token);
  return req<AppUser>("GET", `/auth/me`);
}

// a filter value: a primitive = EQUALITY; an array = "any of these" (an in); an object = operators on the SERVER.
// Operators: eq, ne, gt, gte, lt, lte, in, nin, contains (text, case-insensitive), starts, null (true|false).
export type FilterPrimitive = string | number | boolean;
export type FilterOps = {
  eq?: FilterPrimitive; ne?: FilterPrimitive; gt?: FilterPrimitive; gte?: FilterPrimitive; lt?: FilterPrimitive; lte?: FilterPrimitive;
  in?: FilterPrimitive[]; nin?: FilterPrimitive[]; contains?: string; starts?: string; null?: boolean;
};
export type FilterValue = FilterPrimitive | FilterPrimitive[] | FilterOps;
// the listing options: a filter (equality OR operators), a sort (`sort=field` asc | `sort=-field` desc) and pagination
// (`limit`/`offset`). Fully backward compatible: `list()`, `list({limit,offset})` and `filter:{field:value}` (equality) stay the same.
// `fields`: a PROJECTION — it returns only these fields (+ the `id` always) for a smaller payload on big lists/tables.
// `after`: KEYSET pagination — pass the `next` of the previous page (same `sort` and `filter`) to get the page after it;
// unlike `offset`, a deep page costs the same as the first.
export type ListOptions = { filter?: Record<string, FilterValue>; sort?: string; limit?: number; offset?: number; fields?: string[]; after?: string | null };
function buildListQuery(opts?: ListOptions): string {
  if (!opts) return "";
  const p = new URLSearchParams();
  if (opts.filter) for (const [k, v] of Object.entries(opts.filter)) {
    if (Array.isArray(v)) p.set(`filter.${k}.in`, v.join(","));                       // [a,b] → filter.k.in=a,b
    else if (v !== null && typeof v === "object")                                     // { gte:50, lt:100 } → filter.k.gte=50&filter.k.lt=100
      for (const [op, val] of Object.entries(v)) { if (val != null) p.set(`filter.${k}.${op}`, Array.isArray(val) ? val.join(",") : String(val)); }
    else p.set(`filter.${k}`, String(v));                                             // a primitive → equality (backward compat)
  }
  if (opts.sort) p.set("sort", opts.sort);
  if (opts.limit != null) p.set("limit", String(opts.limit));
  if (opts.offset != null) p.set("offset", String(opts.offset));
  if (opts.fields?.length) p.set("fields", opts.fields.join(","));                    // the projection
  if (opts.after) p.set("after", opts.after);                                         // the keyset cursor
  const qs = p.toString();
  return qs ? `?${qs}` : "";
}

// One entry of a record's CHANGE TRAIL (models with `"history": true` in fab.schema.json). `changes` maps each
// top-level field that moved to `[before, after]` (a create is `[null, value]`; `$status` = the draft/published
// status). `actor.kind`: app_user | guest | owner | support | function | service | automation | import | seed |
// system; `actor.id` is the person (null when none, or after an erasure) and `actor.name` their display name.
export type RecordVersion = {
  version: number;
  op: "create" | "update" | "delete" | "restore";
  at: string;
  actor: { kind: string; id: string | null; name?: string | null; fn?: string };
  changes: Record<string, [unknown, unknown]>;
};
// A page of the trail, newest first. `total` counts every version kept; `retention_days` is how far back the
// account's plan keeps them (0 = the plan keeps none).
export type HistoryPage = { items: RecordVersion[]; total: number; retention_days: number };

// the epoch for the 1st poll (it brings everything) — afterwards the client resends the cursor the server returned
const _EPOCH = "1970-01-01T00:00:00Z";

// ---- the collections (client-side): a REST CRUD on the control-plane's project-scoped API, with the cookie's Bearer ----
export function collection<T extends RowLike = Row>(model: string) {
  const root = `/api/${model}`;
  return {
    // list(): all of them. list({ filter:{status:'open'}, sort:'-created_at', limit:20, offset:0 }): it filters/sorts/paginates.
    // A `sort:'field'` = ascending; a `sort:'-field'` = descending. The `filter` is an exact equality per field.
    // The answer is the ARRAY of rows (as always) carrying `next`: the cursor of the following page, or null on the last
    // one. `let page = await list({ limit: 100 }); while (page.next) page = await list({ limit: 100, after: page.next })`.
    list: async (opts?: ListOptions): Promise<T[] & { next: string | null }> => {
      let next: string | null = null;
      const data = await req<T[]>("GET", root + buildListQuery(opts), undefined, false, (h) => { next = h.get("X-Next-Cursor") || null; });
      const rows = (Array.isArray(data) ? data : []) as T[] & { next: string | null };
      // not enumerable: spreading, `Object.keys` and JSON never see it, so every existing caller reads the same array
      Object.defineProperty(rows, "next", { value: next, enumerable: false });
      return rows;
    },
    // count(): total (under access + `filter`) WITHOUT bringing the rows — for pagination ('X de N') and badges. Cheap.
    count: (filter?: Record<string, FilterValue>) =>
      req<{ count: number }>("GET", `${root}/_count${buildListQuery(filter ? { filter } : undefined)}`).then((r) => r.count),
    get: (id: string, opts?: { fields?: string[] }) => req<T>("GET",
      `${root}/${encodeURIComponent(id)}${opts?.fields?.length ? `?fields=${opts.fields.map(encodeURIComponent).join(",")}` : ""}`),
    create: (data: Partial<T>) => req<T>("POST", root, data),
    update: (id: string, data: Partial<T>) => req<T>("PATCH", `${root}/${encodeURIComponent(id)}`, data),
    // updateMany(): it applies the SAME patch to several ids in a single call (e.g. marking messages read in a batch).
    // It only affects the records you can update (the rest are skipped). It returns { updated: n }.
    updateMany: (ids: string[], data: Partial<T>) => req<{ updated: number }>("POST", `${root}/_bulk_update`, { ids, data }),
    // bulkCreate(): it creates SEVERAL records in one transaction (all-or-nothing; a cap of 200) — e.g. importing a CSV. It returns { created:[…] }.
    bulkCreate: (items: Partial<T>[]) => req<{ created: T[] }>("POST", `${root}/_bulk_create`, { items }),
    // updateWhere(): a patch on everything that matches the `filter` (the list's same operators). It only affects what you can update. { updated:n }.
    // Atomic per record: the filter is re-checked under the row lock, so a filter on the current value is a
    // compare-and-set (of two callers expecting { version: 3 }, exactly one gets updated: 1).
    updateWhere: (filter: Record<string, FilterValue>, data: Partial<T>) => req<{ updated: number }>("POST", `${root}/_bulk_update`, { filter, data }),
    // increment(): add to number/money fields of ONE record atomically (a counter several people or jobs bump at once
    // never loses a count; missing/null counts as 0). e.g. increment(id, { likes: 1, stock: -2 }) → the record.
    increment: (id: string, by: Record<string, number>) => req<T>("POST", `${root}/${encodeURIComponent(id)}/_increment`, { by }),
    // deleteMany(): it soft-deletes everything that matches the `filter` (MANDATORY; a cap of 200) — e.g. deleting the completed ones. It returns { deleted:n }.
    deleteMany: (filter: Record<string, FilterValue>) => req<{ deleted: number }>("POST", `${root}/_bulk_delete`, { filter }),
    // bulkUpsert(): create OR update up to 500 rows matched by `key` (1-3 fields, e.g. ["cpf"]), writing only what changed.
    // App ADMINS only from the browser (functions too). mode "insert_only" never touches an existing record.
    // → { created, updated, unchanged, errors: [{ index, error }] } — a failing row is reported, the others are written.
    bulkUpsert: (rows: Partial<T>[], opts: { key: string[]; mode?: "upsert" | "insert_only" }) =>
      req<{ created: number; updated: number; unchanged: number; errors: { index: number; error: string }[] }>(
        "POST", `${root}/_bulk_upsert`, { key: opts.key, rows, mode: opts.mode ?? "upsert" }),
    remove: (id: string) => req<void>("DELETE", `${root}/${encodeURIComponent(id)}`),
    // history(): WHO changed this record and WHAT changed, newest first, one page at a time — only on a model with
    // `"history": true`. By default only the app's admins may read it (403 otherwise); the model's `access.history`
    // rule opens it to others. e.g. history(id, { limit: 20, offset: 0 }) → { items, total, retention_days }.
    history: (id: string, opts?: { limit?: number; offset?: number }) => {
      const p = new URLSearchParams();
      if (opts?.limit != null) p.set("limit", String(opts.limit));
      if (opts?.offset != null) p.set("offset", String(opts.offset));
      const qs = p.toString();
      return req<HistoryPage>("GET", `${root}/${encodeURIComponent(id)}/_history${qs ? `?${qs}` : ""}`);
    },
    // poll(): a DELTA fetch for realtime. With no `since` (the 1st poll) it brings everything; afterwards pass the returned `cursor` to receive
    // ONLY what changed. It does NOT debit the monthly quota (only a rate limit). Merge by id on the client. See the `useLive` hook.
    poll: (opts?: ListOptions & { since?: string | null }) => {
      const qs = buildListQuery(opts);
      const sep = qs ? "&" : "?";
      return reqPoll<T[]>(`${root}${qs}${sep}updated_since=${encodeURIComponent(opts?.since || _EPOCH)}`);
    },
  };
}

// ---- the pairing / shared space by CODE (the "orgs" blueprint) -----------------------------------------------
export type OrgRef = { id: string; name?: string; code?: string; owner?: string; members?: string[] };
// It creates an org/shared space and returns its invite CODE (generated on the server). The creator becomes the owner+a member.
export function createOrg(name: string, opts?: { orgModel?: string; membershipModel?: string }): Promise<OrgRef> {
  return req<OrgRef>("POST", "/api/_org/create", { name, ...opts });
}
// It JOINS a space by CODE (a privileged op — the code is the authorization). A `maxMembers:2` for a couple's space.
export function joinOrgByCode(code: string, opts?: { maxMembers?: number; orgModel?: string; membershipModel?: string }): Promise<OrgRef> {
  return req<OrgRef>("POST", "/api/_org/join", { code, ...opts });
}

// The current space's context — it lives HERE (the shared chunk, tiny) so the `useSpace()` hook is a real export of the
// SDK; the provider is the <PairingGate/> (code-split in the fab-org, which imports this context). It avoids a cycle/chunk bloat.
export type SpaceValue = { org: Row | null; members: Row[]; partner: Row | null; code: string | null };
export const SpaceContext = createContext<SpaceValue | null>(null);
// useSpace() — the current space's { org, members, partner, code }. Use it INSIDE a <PairingGate/> (outside it, it comes empty).
export function useSpace(): SpaceValue {
  return useContext(SpaceContext) ?? { org: null, members: [], partner: null, code: null };
}

// ---- WEB PUSH (a notification on the device, even with the app closed) --------------------------------------
let _cfgCache: Promise<{ vapidPublicKey?: string | null }> | null = null;
function getPublicConfig(): Promise<{ vapidPublicKey?: string | null }> {
  if (!_cfgCache) {
    _cfgCache = fetch(`${fabConfig.base}/projects/${fabConfig.project}/api/_config`)
      .then((r) => r.json()).catch(() => ({}));
  }
  return _cfgCache;
}
function urlB64ToArrayBuffer(base64: string): ArrayBuffer {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buf;
}
// is it supported by the browser? (iOS requires the app installed on the home screen for the push to work)
export function pushSupported(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}
// It enables Web Push: it asks for permission, subscribes on the service worker and registers the subscription on the server. It returns whether it enabled it.
// It requires a logged-in user (the server associates the subscription with the user). `false` = no support / the VAPID is off / permission denied.
export async function enablePush(): Promise<boolean> {
  if (!pushSupported()) return false;
  const key = (await getPublicConfig())?.vapidPublicKey;
  if (!key) return false;                                   // a platform with no VAPID → push is unavailable
  if ((await Notification.requestPermission()) !== "granted") return false;
  await navigator.serviceWorker.register("/sw.js").catch(() => {});  // it registers on demand (idempotent)
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription())
    || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToArrayBuffer(String(key)) }));
  await req("POST", "/api/_push/subscribe", { ...sub.toJSON(), ua: navigator.userAgent });
  return true;
}
// It registers a NATIVE push token (Expo) on the server — the `expo` transport (the native shell), not Web Push. Used by
// the `fab-native.registerPush()` from inside the native app; it requires a logged-in user. The `token` is an ExponentPushToken.
/** Registers the NATIVE device's push token. `kind` is the transport, and it is not cosmetic: iOS goes through
 *  Expo's push service (the APNs key is managed by EAS from the store credential the owner already connected), and
 *  Android goes straight to Firebase with the owner's own service account — Expo's service cannot deliver on Android
 *  without a credential that can only be uploaded by hand. `appId` says WHOSE Firebase, and only Android needs it. */
export async function subscribeNativePush(token: string, kind: "expo" | "fcm" = "expo", appId?: string): Promise<void> {
  await req("POST", "/api/_push/subscribe",
            { kind, token, app_id: appId, ua: typeof navigator !== "undefined" ? navigator.userAgent : "" });
}
/** @deprecated use `subscribeNativePush` — kept so an app generated before the Android path still compiles. */
export async function subscribeExpoPush(token: string): Promise<void> {
  await subscribeNativePush(token, "expo");
}
// It disables it: it removes it on the server FIRST (otherwise, if the server fails, the row is left orphaned with already invalid keys),
// then it cancels the subscription in the browser.
export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  await req("POST", "/api/_push/unsubscribe", { endpoint: sub.endpoint }).catch(() => {});
  await sub.unsubscribe().catch(() => {});
}
export type PushState = { supported: boolean; enabled: boolean; busy: boolean; enable: () => Promise<void>; disable: () => Promise<void> };
// usePush() — the device's Web Push state + turning it on/off. E.g.: an "Enable notifications" toggle in the Settings.
export function usePush(): PushState {
  const supported = pushSupported();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!supported) return;
    // a getRegistration (not a `ready`): it resolves RIGHT AWAY with undefined if the SW was never registered (push was never enabled)
    // — it avoids hanging when the app does not use push.
    navigator.serviceWorker.getRegistration().then((r) => r?.pushManager.getSubscription())
      .then((s) => setEnabled(!!s)).catch(() => {});
  }, [supported]);
  const enable = useCallback(async () => { setBusy(true); try { setEnabled(await enablePush()); } finally { setBusy(false); } }, []);
  const disable = useCallback(async () => { setBusy(true); try { await disablePush(); setEnabled(false); } finally { setBusy(false); } }, []);
  return { supported, enabled, busy, enable, disable };
}
// <EnablePushButton/> — a ready-made button to turn push notifications on/off. It disappears when the browser does not support them.
export function EnablePushButton({ className, onLabel, offLabel }: { className?: string; onLabel?: string; offLabel?: string }) {
  const loc = useLocale();
  const { supported, enabled, busy, enable, disable } = usePush();
  if (!supported) return null;
  const label = enabled ? (offLabel ?? i18n(loc, "push.disable")) : (onLabel ?? i18n(loc, "push.enable"));
  return (
    <button type="button" onClick={() => (enabled ? disable() : enable())} disabled={busy}
      className={className ?? "inline-flex items-center gap-2 rounded-xl border border-input bg-background px-4 py-2 text-[13px] font-semibold text-foreground disabled:opacity-50"}>
      {label}
    </button>
  );
}

// The credential the realtime WebSocket presents. The platform mints a short token scoped to realtime only
// (`POST /api/_realtime/token`), so the edge Worker does not need the key that signs sessions. Where that is not
// offered (404 while it is not configured, an older server, a visitor with no session) it falls back to the session
// token, which is what this socket always sent.
//
// ONE answer is shared by every live list of the page. Each `useLive` opens its own socket, and its effect re-runs
// on every filter change, so asking per socket meant one POST per list per keystroke of a search box: enough to
// spend the per-user allowance of the route (30 a minute) and leave the lists on polling. The token is reused
// while it has a quarter of its life left (the Worker reads it only at the upgrade), a "not offered" is remembered
// for a minute, and lists that mount together wait on the same request. Keyed by the session, so a logout or a
// login as someone else never reuses the previous person's answer.
const RT_NOT_OFFERED_MS = 60_000;
let _rt: { session: string; token: string; until: number } | undefined;
let _rtAsking: { session: string; answer: Promise<string> } | undefined;
async function realtimeToken(): Promise<string> {
  const session = getToken();
  if (!session) return "";
  if (_rt && _rt.session === session && Date.now() < _rt.until) return _rt.token || session;
  if (_rtAsking && _rtAsking.session === session) return _rtAsking.answer;
  const answer = (async () => {
    try {
      const r = await req<{ token?: string; expires_in?: number }>("POST", "/api/_realtime/token");
      if (r && typeof r.token === "string" && r.token) {
        const life = typeof r.expires_in === "number" && r.expires_in > 0 ? r.expires_in : 0;
        _rt = { session, token: r.token, until: Date.now() + life * 750 };
        return r.token;
      }
    } catch (e) {
      // not offered: fall back below. Only the 404 is remembered; a 429 or a network error is asked again.
      if (e instanceof ApiError && e.status === 404) _rt = { session, token: "", until: Date.now() + RT_NOT_OFFERED_MS };
    }
    return getToken() || "";
  })();
  _rtAsking = { session, answer };
  try { return await answer; } finally { if (_rtAsking && _rtAsking.answer === answer) _rtAsking = undefined; }
}

// ---- realtime through DELTA POLLING (with no WebSocket) ------------------------------------------------------
export type LiveOptions = {
  filter?: Record<string, FilterValue>;   // equality OR operators (the list's same format; see the FilterValue)
  sort?: string;
  limit?: number;
  activeMs?: number;   // the "hot" cadence (something changed recently) — 3s by default
  idleMs?: number;     // the idle cadence — 15s by default. With the push (WebSocket) connected the poll is only a
                       // safety net and runs at 60s instead: a change arrives over the socket and refetches at once,
                       // so polling faster only costs requests. A value ABOVE 60s is respected as given.
  enabled?: boolean;   // false → it does not poll (e.g. no thread is open)
};
export type LiveState<T> = { rows: T[]; loading: boolean; error: boolean; refresh: () => void };

// a merge by id (a new/changed one replaces) + it reorders by the `sort` (an ISO/a number compare directly). The delta's basis.
function mergeSort<T extends RowLike>(prev: T[], delta: T[], sort?: string): T[] {
  if (!delta.length) return prev;
  const byId = new Map(prev.map((r) => [r.id, r]));
  for (const r of delta) byId.set(r.id, r);
  const rows = Array.from(byId.values());
  if (sort) {
    const desc = sort.startsWith("-");
    const key = (desc ? sort.slice(1) : sort) as keyof T;
    rows.sort((a, b) => {
      const av = a[key] as unknown as (string | number | null), bv = b[key] as unknown as (string | number | null);
      const c = av == null ? -1 : bv == null ? 1 : av < bv ? -1 : av > bv ? 1 : 0;
      return desc ? -c : c;
    });
  }
  return rows;
}

// The tab's shared live-updates connection (see `fab-live.ts`). Created on first use; the URL reads the token at
// every (re)connection, so a renewed session is picked up the next time the stream opens.
let _liveHub: LiveHub | null | undefined;
function liveHub(): LiveHub | null {
  if (_liveHub !== undefined) return _liveHub;
  if (typeof EventSource === "undefined") return (_liveHub = null);
  _liveHub = createLiveHub({
    EventSource: EventSource as unknown as LiveEnv["EventSource"],
    url: (keys) => {
      const p = new URLSearchParams();
      const tok = getToken();
      if (tok) p.set("token", tok);   // no token = a guest (the public models)
      for (const k of keys) p.append("s", k);
      return `${fabConfig.base}/projects/${fabConfig.project}/api/_stream?${p.toString()}`;
    },
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (t) => clearTimeout(t as ReturnType<typeof setTimeout>),
    // a stream opened under another session (logout, login as someone else, a renewed token) is rebuilt
    ident: () => getToken() || "",
    doc: typeof document !== "undefined" ? document : null,
  });
  return _liveHub;
}

/**
 * useLive — a REALTIME list through light DELTA polling (with no WebSocket server). It fetches ONLY what changed since the
 * last cursor, it PAUSES when the tab is hidden, speeds up with activity and slows down when idle, backs off on an error and
 * does NOT debit the monthly quota (only a rate limit on the server). It is the recommended form of "realtime" in the generated app.
 * Ex.: `const { rows } = useLive('message', { filter: { conversation: id }, sort: 'created_at' })`.
 * A note: deletions do not show up in the delta — a periodic full RESYNC (every ~20 polls) reconciles them.
 */
export function useLive<T extends RowLike = Row>(model: string, opts?: LiveOptions): LiveState<T> {
  const { filter, sort, limit, activeMs = 3000, idleMs = 15000, enabled = true } = opts || {};
  const fkey = JSON.stringify(filter || {});
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const cursor = useRef<string | null>(null);
  const errors = useRef(0);
  const lastChange = useRef(0);
  const polls = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);
  const kick = useRef<() => void>(() => {});

  useEffect(() => {
    alive.current = true;
    cursor.current = null; polls.current = 0; errors.current = 0; lastChange.current = 0;
    setRows([]); setLoading(true); setError(false);
    const coll = collection<T>(model);
    let unsubLive: (() => void) | null = null;
    let ws: WebSocket | null = null;
    let disposed = false;   // THIS effect's cleanup ran (`alive` is shared with the next run, so it cannot say it)
    let sseOk = false;   // the push (SSE/WS) is connected → the polling becomes just a slow resync (idle); it dropped → normal polling (the fallback)

    // With the push CONNECTED the poll is not the transport any more — a change arrives over the WebSocket and
    // triggers an immediate refetch (`kick`), so what is left here is a safety net against a push that dies without
    // saying so. A safety net does not need to run every 15 seconds: at the old cadence, 300 people with a tab open
    // cost 1200 requests/minute even when NOTHING changed, which is the whole reason polling scales with USERS while
    // push scales with CHANGES.
    //
    // The trade, stated: if the push breaks silently (the server fails to publish and the socket stays open), a
    // change now takes up to a minute to appear instead of 15 seconds. That is a degraded mode either way, and it
    // buys a 4x cut on the healthy path, which is every other minute of the app's life.
    const quietMs = () => (sseOk ? Math.max(idleMs, 60000) : idleMs);

    function schedule(ms: number) {
      if (!alive.current || !enabled) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(run, ms);
    }
    // on the full resync we fetch the N MOST RECENT ones (a DESCENDING sort by the field) and reorder them into the display
    // order — otherwise an ascending `sort` + a limit would bring the N OLDEST ones and the UI would regress on a long thread.
    const resyncSort = sort ? "-" + (sort.startsWith("-") ? sort.slice(1) : sort) : undefined;
    async function run() {
      if (!alive.current) return;
      // a hidden tab: it does not fetch, and it comes back at the QUIET cadence — a background tab polling every 15s
      // was pure waste (the `visibilitychange` listener already kicks an immediate poll when it comes to the front)
      if (typeof document !== "undefined" && document.hidden) { schedule(quietMs()); return; }
      const full = polls.current % 20 === 0;   // a periodic full resync → it reconciles deletions/reorderings
      polls.current++;
      try {
        const { data, cursor: cur } = await coll.poll({ filter, sort: full ? resyncSort : sort, limit, since: full ? null : cursor.current });
        if (!alive.current) return;
        cursor.current = cur; errors.current = 0; setError(false);
        // a resync does NOT count as activity (it is a maintenance sweep); only a delta with content reignites the "hot" mode
        if (full) setRows(mergeSort([], data, sort));
        else if (data.length) { lastChange.current = Date.now(); setRows((p) => mergeSort(p, data, sort)); }
        setLoading(false);
        // with the push up, the poll is only a RESYNC (the quiet cadence); with no push, the normal hot/idle cadence
        schedule(sseOk ? quietMs() : (Date.now() - lastChange.current < 30000 ? activeMs : idleMs));
      } catch {
        if (!alive.current) return;
        errors.current++; setError(true); setLoading(false);
        schedule(Math.min(idleMs * 2 ** errors.current, 30000));   // an exponential backoff (a cap of 30s)
      }
    }
    kick.current = () => { if (alive.current && enabled) { if (timer.current) clearTimeout(timer.current); run(); } };
    // The SSE PUSH (low latency): an instant merge of the events the server pushes (already filtered by the RLS+filter).
    // It rides the tab's ONE shared stream (`fab-live.ts`: one connection for every live list, not one per hook — one
    // per hook is what hit the server's per-app stream cap when a screen with several lists opened). It degrades
    // gracefully: while the stream is not confirmed for this list, the polling above remains the transport.
    function openSSE() {
      if (!enabled || typeof EventSource === "undefined") return;
      const hub = liveHub();
      if (!hub) return;
      // The stream reconnects on its own (the server ends every stream after a few minutes so Cloud Run slots
      // rotate, and the hub reopens one the browser gave up on). A REconnect catches up at once: an event published
      // in the gap was never pushed, and the next quiet poll could be up to a minute away. After a LONG gap (the tab
      // was hidden, or the stream failed and backed off) it is a full resync: the delta does not carry deletions.
      let opened = false;
      unsubLive = hub.subscribe({
        model,
        query: buildListQuery({ filter }).replace(/^\?/, ""),
        onRecord: (rec) => {
          if (!alive.current) return;
          lastChange.current = Date.now();
          if (rec._deleted) setRows((p) => p.filter((r) => (r as unknown as Row).id !== rec.id));
          else setRows((p) => mergeSort(p, [rec as unknown as T], sort));
        },
        onState: (up, resync) => {
          sseOk = up;
          if (!up || !alive.current) return;
          if (resync) { polls.current = 0; kick.current(); }   // polls % 20 === 0 → the next poll is a full resync
          else if (opened) kick.current();
          opened = true;
        },
      });
    }
    // The PUSH through a WEBSOCKET (Durable Objects): the server sends only an invalidation SIGNAL ("the model changed") and we redo
    // the fetch (which applies the RLS+filter). Low latency without keeping the control-plane always on. The fallback = the polling.
    async function openWS() {
      if (!enabled || typeof WebSocket === "undefined" || !fabConfig.realtime) return;
      const tok = await realtimeToken();
      if (disposed || !alive.current) return;   // unmounted or re-run while the token was on its way
      try {
        const wsBase = fabConfig.realtime.replace(/^http/, "ws");
        ws = new WebSocket(`${wsBase}/subscribe?project=${encodeURIComponent(fabConfig.project)}`
          + `&model=${encodeURIComponent(model)}&token=${encodeURIComponent(tok || "")}`);
        ws.onopen = () => { sseOk = true; };
        ws.onmessage = () => { if (alive.current) kick.current(); };   // an invalidation → an immediate refetch (under the RLS)
        ws.onclose = () => { sseOk = false; };
        ws.onerror = () => { sseOk = false; };
      } catch { ws = null; }
    }
    if (enabled) { run(); if (fabConfig.realtime) void openWS(); else openSSE(); } else setLoading(false);
    const onVis = () => { if (typeof document !== "undefined" && !document.hidden) kick.current(); }; // a focus → poll right away
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVis);
    return () => {
      alive.current = false; disposed = true;
      if (timer.current) clearTimeout(timer.current);
      if (unsubLive) { unsubLive(); unsubLive = null; }
      if (ws) { try { ws.close(); } catch { /* */ } ws = null; }
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVis);
    };
  }, [model, fkey, sort, limit, activeMs, idleMs, enabled]);

  return { rows, loading, error, refresh: () => kick.current() };
}

// ---- a file upload (an avatar/photo/image/document) → R2; it returns the VALUE to save on the record (the `url`) ----
// Use num <input type="file">: `const { url } = await uploadFile(e.target.files[0]); await update(id, { avatar: url })`.
// NEVER ask for the image's URL as text — upload the file with this (it requires a logged-in user).
//
// the visibility ('public' by default):
//  • 'public'  → the `url` is a stable URL (anyone can reach it). Use it for images displayed in the app (an avatar, a photo, a cover).
//    An ordinary image (png/jpeg/webp/gif/pdf/audio) comes back as its address on the CDN, so displaying it never touches our
//    API — that is what lets an app with a lot of traffic serve its images without paying for a request each time.
//  • 'private' → the `url` is an opaque id; save it in the field. On the record's READ the API swaps it for a SIGNED URL
//    (it expires) and ONLY for whoever can read the record. Use it for sensitive documents (a receipt, a contract, a report, an ID).
// In both cases save the returned `url` in the field and use it directly in an <img src=.../> or an <a href=.../>.
//
// `onProgress(fraction)` (optional): called with 0..1 while the bytes go up, and with 1 once the upload is stored. Use it for a
// progress bar on a big file (a video, a PDF): `uploadFile(file, { onProgress: (f) => setPct(Math.round(f * 100)) })`.
export async function uploadFile(
  file: File, opts?: { visibility?: "public" | "private"; onProgress?: (fraction: number) => void },
): Promise<{ id: string; url: string; visibility: "public" | "private" }> {
  // A GUARD: it requires a REAL File/Blob. A common mistake: passing the URL that an `<ImageUpload onChange={url => …}>` already returned back
  // into the uploadFile — it would upload the URL's TEXT as an octet-stream and the <img> would show a broken image. It fails loudly here.
  if (!(file instanceof Blob)) {
    throw new ApiError(0, "uploadFile requires a File/Blob (e.g. e.target.files[0]). Note: <ImageUpload onChange> " +
      "already returns the uploaded URL — save it directly, do not call uploadFile again.");
  }
  const ct = file.type || "application/octet-stream";
  const visibility = opts?.visibility === "private" ? "private" : "public";
  const { file_id, upload_url, url } = await req<{ file_id: string; upload_url: string; url: string }>(
    "POST", "/api/_upload", { filename: file.name, content_type: ct, size_bytes: file.size, visibility });
  // A presigned PUT with ONLY the Content-Type (the only signed header). The forced download for non-inline types (anti XSS)
  // is applied on the READ — and it is also why a type like SVG is the one case whose `url` stays on `/files/{id}/raw`
  // instead of the CDN: only that route can attach the Content-Disposition=attachment. It is not applied on the PUT —
  // signing a Content-Disposition here would require the client to repeat it exactly, otherwise R2 gives a 403 (seen as a CORS error).
  // Without `onProgress` it is the plain fetch, exactly as before; with it, an XMLHttpRequest (fetch has no upload progress).
  const onProgress = opts?.onProgress;
  if (onProgress) {
    const status = await putWithProgress(upload_url, ct, file, onProgress);
    if (status < 200 || status >= 300) throw new ApiError(status, "falha ao enviar o arquivo");
  } else {
    const put = await fetch(upload_url, { method: "PUT", headers: { "Content-Type": ct }, body: file });
    if (!put.ok) throw new ApiError(put.status, "falha ao enviar o arquivo");
  }
  // It TELLS the server the PUT has finished. The upload goes STRAIGHT from the browser to R2 — the server is notified by
  // nobody. For a VIDEO, this step is what fires the derivation to Cloudflare Stream (the adaptive quality).
  // Best-effort on purpose: if it fails, the file is ALREADY on R2 and the app keeps working (the video plays as MP4).
  try { await req("POST", `/api/_upload/${file_id}/complete`, {}); } catch { /* the file is saved; the cache is optional */ }
  if (onProgress) reportProgress(onProgress, 1);
  return { id: file_id, url, visibility };
}

// The app's progress callback must never break the upload: a throw inside it (a setState on an unmounted screen) is swallowed.
function reportProgress(onProgress: (fraction: number) => void, fraction: number): void {
  try { onProgress(fraction); } catch { /* the app's callback; the upload goes on */ }
}

// The presigned PUT with upload progress events. It resolves with the HTTP status (the caller decides what a non-2xx is) and
// rejects with an ApiError(0) when the request never got an answer (network down, CORS refusal, abort, timeout).
function putWithProgress(url: string, ct: string, file: Blob, onProgress: (fraction: number) => void): Promise<number> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", ct);
    xhr.upload.onprogress = (e: ProgressEvent) => {
      if (e.lengthComputable && e.total > 0) reportProgress(onProgress, Math.min(1, e.loaded / e.total));
    };
    xhr.onload = () => resolve(xhr.status);
    const fail = () => reject(new ApiError(0, "falha ao enviar o arquivo"));
    xhr.onerror = fail;
    xhr.onabort = fail;
    xhr.ontimeout = fail;
    xhr.send(file);
  });
}

// ---- The runtime AI (InvokeLLM / GenerateImage / ExtractData). It runs SERVER-SIDE with the platform's keys (the app
// NEVER sees a key) and it consumes the account's "integration credits". It requires a logged-in user. A 402 = out of credits. ----
export type InvokeResult = { text: string | null; data: Record<string, unknown> | null; credits: number | null };
// It generates an AI response. With a `schema` (a JSON Schema) it returns STRUCTURED output in `data`; otherwise text in `text`.
// The `tier`: 'fast' (cheap, the default) | 'smart' (a strong model). E.g.: const { data } = await invokeLLM({ prompt, schema }).
export function invokeLLM(input: { prompt: string; system?: string; schema?: Record<string, unknown>; tier?: "fast" | "smart"; maxOutput?: number }): Promise<InvokeResult> {
  return req<InvokeResult>("POST", "/api/_ai/invoke", { prompt: input.prompt, system: input.system, schema: input.schema, tier: input.tier ?? "fast", max_output: input.maxOutput });
}
// It calls one of the app's BACKEND FUNCTIONS (server-side): a `POST /fn/<name>` with a `payload` (JSON) → the function's JSON response.
// The function runs ISOLATED on the server and can do what the client cannot (use a secret, privileged ops through the ctx).
// It requires the project's Pro+ plan (a 403 feature_locked otherwise). It raises an ApiError when the function answers non-2xx.
export function callFunction<T = unknown>(name: string, payload?: unknown): Promise<T> {
  return req<T>("POST", `/fn/${encodeURIComponent(name)}`, payload ?? {});
}
// It calls an app-side AGENT (an AI loop that ACTS on the app's data UNDER YOUR permissions — the logged-in user's RLS),
// authored by the platform in the fab.agents.json. E.g.: `const { answer } = await agent('support').run('cancel order #123')`.
// It requires a login; it debits integration credits. Use it for an assistant that reasons + reads/writes data in steps (not for 1 answer: use the invokeLLM).
export function agent(name: string) {
  return {
    run: (input: string) => req<{ answer: string; credits: number; steps: number }>(
      "POST", `/api/_agents/${encodeURIComponent(name)}/run`, { input }),
  };
}
// It generates an image from text → it returns the public URL (save it in a field uploadFile-style or use it in an <img src=url/>).
export function generateImage(prompt: string): Promise<{ url: string; credits: number | null }> {
  return req<{ url: string; credits: number | null }>("POST", "/api/_ai/image", { prompt });
}
// It extracts data from an uploaded file (an uploadFile → { id }): pass the id in `fileId`. With a `schema` it returns structured
// `data` (e.g. an invoice → { total, items }); otherwise the extracted `text`. Documents and images (vision).
// It reads up to 5 scanned pages by vision; a bigger scan answers 413 with `e.detail.code === "use_extract_document"`:
// send that file to `extractDocument` instead.
export function extractData(input: { fileId: string; schema?: Record<string, unknown>; prompt?: string }): Promise<InvokeResult> {
  return req<InvokeResult>("POST", "/api/_ai/extract", { file_id: input.fileId, schema: input.schema, prompt: input.prompt });
}
// A WHOLE document in the background (up to 2,000 pages; scanned pages are read by vision). `extractDocument` only STARTS
// the job and answers at once; poll `getExtraction(jobId)` until `status` is no longer "queued"/"running". `mode: "document"`
// (default) applies `schema` once over the whole text → `data`; `mode: "page"` applies it to every page → `pages[i].data`.
// `pages` picks pages (1-based). Pass an `idempotencyKey` to make a retry return the same job instead of a second charge.
// `notifyRecord` writes the final status into a field of one of the app's records, so a screen can `useLive` it.
// A 402 = not enough integration credits for the job's estimate (`e.detail.credits_estimated`).
export type ExtractionPage = { n: number; method: "text" | "vision"; text: string; data: Record<string, unknown> | null; error?: string };
export type ExtractionJob = {
  job_id: string;
  status: "queued" | "running" | "succeeded" | "partial" | "failed" | "canceled";
  progress: { done: number; total: number };
  pages: ExtractionPage[];
  data: Record<string, unknown> | null;
  credits: number | null;
  credits_estimated?: number;
  truncated?: boolean;
  notes?: string[];
  expired?: boolean;   // the full result was kept 30 days after the job ended; past that only the summary remains
  error: string | null;
};
export function extractDocument(input: {
  fileId: string; schema?: Record<string, unknown>; prompt?: string; mode?: "document" | "page"; pages?: number[];
  idempotencyKey?: string; notifyRecord?: { model: string; id: string; field: string };
}): Promise<{ job_id: string; status: ExtractionJob["status"]; credits_estimated: number }> {
  return req("POST", "/api/_ai/extract-document", {
    file_id: input.fileId, schema: input.schema, prompt: input.prompt, mode: input.mode ?? "document",
    pages: input.pages, idempotency_key: input.idempotencyKey, notify_record: input.notifyRecord,
  });
}
export function getExtraction(jobId: string): Promise<ExtractionJob> {
  return req<ExtractionJob>("GET", `/api/_ai/extract-document/${encodeURIComponent(jobId)}`);
}
export function cancelExtraction(jobId: string): Promise<ExtractionJob> {
  return req<ExtractionJob>("POST", `/api/_ai/extract-document/${encodeURIComponent(jobId)}/cancel`, {});
}

// ---- The notifications (SMS/Slack/Discord/e-mail). The owner enables the channel in the panel; the platform sends server-side. It requires
// a logged-in user; uses integration credits. E.g.: await notify('sms', { to:'+5511...', message:'Pedido a caminho' }).
// a 'discord_dm' sends a DM to the logged-in user THEMSELVES (it requires a Discord login + a configured bot); 'discord'/'slack'
// post to the project's channel (a webhook).
//
// 'email' needs NOTHING configured — it leaves through the platform's sender, with the app's name on it. In exchange the
// platform, not the app, writes the message: pass `message` as PLAIN TEXT (no HTML, and no URL inside it) and put the
// destination in `link`, which must point at a page OF THIS APP. E.g.:
//   await notify('email', { to:'a@b.com', subject:'Convite', message:'Você foi convidado.', link: `${location.origin}/accept?token=${t}` })
// Daily caps apply per user and per app. ----
export function notify(channel: "sms" | "slack" | "discord" | "discord_dm" | "email",
  opts: { message: string; to?: string; subject?: string; link?: string }): Promise<{ ok: boolean; channel: string; credits: number | null }> {
  return req<{ ok: boolean; channel: string; credits: number | null }>("POST", "/api/_notify/send",
    { channel, message: opts.message, to: opts.to, subject: opts.subject, link: opts.link });
}

// ---- PUSH, sent NOW (`sendPush`). ONLY an app admin (owner/admin role) can call it — for an admin screen that composes and
// sends a notification. Free. It reaches every device the audience registered (the native app AND the browser); a user
// who never enabled notifications is simply not reached. The devices are registered by `registerPush()` (fab-native).
//   to: "all" | "admin" | "role:<slug>" | [appUserIds]      link: a PATH inside the app ("/orders/42"), never a full URL
//   const r = await sendPush({ to: "all", title: "Promoção", body: "Hoje até 20h", link: "/offers" })
//   r.devices === 0 → nobody in that audience enabled notifications (say so; it is not an error).
// Do NOT mark a send "failed" on your own: the answer is the truth. For a send at a FUTURE time, store a record and let an
// automation with `channel: "push"` and a `relative` trigger fire it. ----
export type PushSendResult = { recipients: number; reached: number; devices: number; sent: number; queued: number };
export function sendPush(opts: { to: "all" | "admin" | `role:${string}` | string[]; title: string; body?: string; link?: string }): Promise<PushSendResult> {
  return req<PushSendResult>("POST", "/api/_push/send", { to: opts.to, title: opts.title, body: opts.body, link: opts.link });
}

// ---- The provider integrations (WhatsApp Cloud, …). The owner connects the account in the panel; the platform keeps the secret
// and calls the provider server-side, the app only passes domain `params`. It requires a logged-in user; it consumes integration
// credits. Ex.: await integrations.call('whatsapp', 'sendMessage', { to:'+5511...', body:'Seu pedido saiu!' }). ----
// The providers this call can reach: the CLOSED list of `integrations/registry.py` on the server (a contract test keeps
// the two in step). It is a union and not `string` on purpose: a name outside the list is a 422 "provedor desconhecido" on
// every call, and a type error is the only signal an agent working through the CLI gets before publishing. `maps` is NOT
// here — Google Maps is the `geo` field, `<AddressInput>` and `computeRoute`, not a provider (FIX — Serviços e Reformas, 2026-10-02).
export type IntegrationProvider = "whatsapp" | "shopify" | "meta" | "telegram" | "notion" | "airtable" | "mailchimp" | "webhook";
export const integrations = {
  call<T = unknown>(provider: IntegrationProvider, action: string, params: Record<string, unknown>):
    Promise<{ ok: boolean; provider: string; action: string; credits: number | null; result: T }> {
    return req("POST", `/api/_integrations/${encodeURIComponent(provider)}/call`, { action, params });
  },
};

// ---- Address lookup (the Maps integration, proxied server-side: the owner's key never reaches the browser). The consumer
// is `<AddressInput>`. These go through `req` ON PURPOSE: the component used to call `fetch` by hand, which carries no
// session token, so the route answered 401 to a SIGNED-IN user and the field never suggested anything — silently, since
// its `catch` is what makes it degrade to plain text. A guest gets suggestions only when the owner switched "allow
// visitors" on in the Maps card; otherwise the 401 lands in that same `catch` and the field stays a text input. ----
export function geoAutocomplete(q: string, session?: string):
  Promise<{ configured: boolean; results: { place_id: string; description: string }[] }> {
  return req("GET", `/geo/autocomplete?q=${encodeURIComponent(q)}${session ? `&session=${encodeURIComponent(session)}` : ""}`);
}
export function geoPlace(placeId: string, session?: string):
  Promise<{ configured: boolean; place: { address?: string; lat?: number; lng?: number } | null }> {
  return req("GET", `/geo/place?place_id=${encodeURIComponent(placeId)}${session ? `&session=${encodeURIComponent(session)}` : ""}`);
}

// ---- The connectors (external APIs the owner imported through OpenAPI). A server-side proxy call: the credential stays on the
// platform, the app only names the operation. It requires a logged-in user. E.g.: await callConnector(id, 'listContacts', { query:{limit:10} }). ----
export function callConnector<T = unknown>(connectorId: string, operationId: string,
  opts?: { path_params?: Record<string, string | number>; query?: Record<string, unknown>; body?: unknown }): Promise<{ status: number; data: T }> {
  return req<{ status: number; data: T }>("POST", `/api/_connectors/${encodeURIComponent(connectorId)}/call`,
    { operationId, path_params: opts?.path_params, query: opts?.query, body: opts?.body });
}

// ---- ROUTES on the owner's Google Maps key (`computeRoute`). Distance and travel time between two points, server-side,
// through the SAME key the owner pasted in the Maps card (the Routes API has to be enabled on its Google Cloud project).
// A point is a `geo` value as stored — `{address, lat, lng}`, any subset; pass the field straight through. Same access as
// the address lookup: signed-in users, and visitors only when the owner switched them on in the Maps card (it spends the owner's Google quota). `configured:false` means the app cannot have a route — the owner
// has not connected Maps (`reason:"maps_off"`) or the key's project lacks the Routes API (`reason:"routes_api_disabled"`;
// the owner sees what to enable on the Maps card, not the end user): fall back to `straightLineDistanceKm` or a km
// field, and say the distance is approximate. Anything else (a quota, an address Google cannot place) throws an ApiError.
//   const r = await computeRoute({ from: order.pickup, to: order.dropoff });            // mode defaults to "DRIVE"
//   if (!r.configured) km = straightLineDistanceKm(a, b);  else if (r.route) km = r.route.distanceKm;  // route null = no road between them
// ----
export type RoutePoint = { address?: string; lat?: number; lng?: number };
export type TravelMode = "DRIVE" | "WALK" | "BICYCLE" | "TWO_WHEELER" | "TRANSIT";
export type RouteResult = { distanceMeters: number; durationSeconds: number; distanceKm: number; durationMinutes: number };
export function computeRoute(opts: { from: RoutePoint; to: RoutePoint; mode?: TravelMode }):
  Promise<{ configured: boolean; route: RouteResult | null; reason?: "maps_off" | "routes_api_disabled" }> {
  return req("POST", "/geo/route", { origin: opts.from, destination: opts.to, mode: opts.mode ?? "DRIVE" });
}
// Straight-line ("as the crow flies") distance in km between two coordinates (haversine). No network, no key: the
// fallback when Maps is off, and an estimate to show while the route loads. Road distance is usually 20-40% longer.
export function straightLineDistanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)) * 10) / 10;
}

// ---- Google Workspace (Sheets/Calendar/Drive/Gmail). The owner connects the account in the panel; the platform injects the
// token server-side. The `googleCall` talks to any *.googleapis.com endpoint; use the shortcuts for the common cases. ----
export function googleCall<T = unknown>(url: string, opts?: { method?: string; query?: Record<string, unknown>; body?: unknown }): Promise<{ status: number; data: T }> {
  return req<{ status: number; data: T }>("POST", "/api/_google/call", { url, method: opts?.method ?? "GET", query: opts?.query, body: opts?.body });
}
export const google = {
  // It appends a row to a spreadsheet. E.g.: google.sheetsAppend(id, 'Página1!A1', [[name, email]]).
  sheetsAppend: (spreadsheetId: string, range: string, values: unknown[][]) =>
    googleCall(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}:append`,
      { method: "POST", query: { valueInputOption: "USER_ENTERED" }, body: { values } }),
  // It creates an event on Google Calendar. E.g.: google.calendarInsert('primary', { summary, start, end }).
  calendarInsert: (calendarId: string, event: Record<string, unknown>) =>
    googleCall(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      { method: "POST", body: event }),
};

// ---- the administration (it ONLY works for a logged-in user with the 'admin' role): managing the app's users (the roles + the plan). It is
// what the /admin panel uses. An `updateUser(id,{plan:'premium'})` = granting a MANUAL subscription/premium. ----
export const admin = {
  // A reader who lists through the directory RULE (schema `appUser.access`) gets the roster of active users, paged
  // (limit ≤ 200, default 100) and without e-mail unless the owner opted in; an admin gets the whole list.
  listUsers: (opts?: { limit?: number; offset?: number }) =>
    req<AppUser[]>("GET", `/admin/users${opts ? `?limit=${opts.limit ?? 100}&offset=${opts.offset ?? 0}` : ""}`),
  updateUser: (id: string, patch: { roles?: string[]; plan?: string }) =>
    req<AppUser>("PATCH", `/admin/users/${encodeURIComponent(id)}`, patch),
  // It activates a COMPLIMENTARY subscription (free) for a student: it unlocks premium with no charge (an optional `expiresAt` ISO8601). It links it
  // to the `plan` record when a `planId` is given. It does NOT go through the gateway.
  grantSubscription: (userId: string, opts?: { planId?: string; expiresAt?: string }) =>
    req<{ mode: string; user_id: string; plan: string; expires_at: string | null }>(
      "POST", "/admin/subscriptions", { user_id: userId, mode: "comp", plan_id: opts?.planId, expires_at: opts?.expiresAt }),
  // It generates a subscription checkout LINK bound to the student (their email + app_user_id) so they can register their payment
  // method and subscribe. A `planId` (from the `plan` record) or a `priceId` directly; an optional `coupon` (a discount). Send them the URL.
  // The `paymentMethods` (e.g. ['credit_card','pix']) restricts/offers the methods on the hosted link; empty = all of the gateway's.
  subscriptionLink: (userId: string, opts: { planId?: string; priceId?: string; coupon?: string; successUrl: string; cancelUrl: string; paymentMethods?: string[] }) =>
    req<{ mode: string; user_id: string; redirect_url: string }>(
      "POST", "/admin/subscriptions", { user_id: userId, mode: "link", plan_id: opts.planId, price_id: opts.priceId,
        coupon: opts.coupon, success_url: opts.successUrl, cancel_url: opts.cancelUrl, payment_methods: opts.paymentMethods }),
  // It creates a discount coupon on the gateway → { id }. Use the `id` in a subscriptionLink({coupon}) or a useSubscribe({coupon}).
  // A `percentOff` (0-100) OR an `amountOff` (in reais). (Native on Stripe; Pagar.me has no reusable coupon.)
  createCoupon: (opts: { name?: string; percentOff?: number; amountOff?: number; duration?: "once" | "repeating" | "forever" }) =>
    req<{ id: string; provider: string }>("POST", "/admin/coupons",
      { name: opts.name, percent_off: opts.percentOff, amount_off: opts.amountOff, duration: opts.duration ?? "once" }),
  // It INVITES an end user by email: it creates the invitation and sends the mail with the link to `/accept-invite`,
  // where the invitee sets their own name + password and enters already holding `role`. Inviting an email that is
  // already pending RESENDS it. `email_sent: false` means the invitation EXISTS but the mail did not leave (the
  // project's sending email not verified, the provider refusing) — say so and offer the link, do not report success.
  // There is NO name here on purpose: the invitee types their own on the accept page.
  // It CREATES an end user right away — `{ email, name?, role?, profile? }` — active, the email taken as verified, no
  // password anybody knows (they sign in by an emailed code, or set one through "forgot password"). For a list the owner
  // already holds (attendees, students): the account must exist BEFORE the person shows up, because whatever the app
  // grants them points at it. Sends no email. A 409 when the email already has an account.
  createUser: (input: { email: string; name?: string; role?: string; profile?: Record<string, unknown> }) =>
    req<AppUser>("POST", "/admin/users", input),
  // Up to 200 at once (an imported CSV). Row by row: an existing address is `skipped`, a refused row is an `error`
  // with its reason, the rest is created — so the same file can be imported twice safely.
  createUsers: (users: { email: string; name?: string; role?: string; profile?: Record<string, unknown> }[]) =>
    req<{ created: number; skipped: number; errors: number;
          results: { email: string | null; status: "created" | "skipped" | "error"; id?: string; detail?: string }[] }>(
      "POST", "/admin/users/bulk", { users }),
  invite: (email: string, opts?: { role?: string; inviteUrl?: string }) =>
    req<Invite & { email_sent: boolean }>("POST", "/admin/user-invites",
      { email, role: opts?.role, invite_url: opts?.inviteUrl }),
  listInvites: () => req<Invite[]>("GET", "/admin/user-invites"),
  // It DELETES a stored file of this app for good (the object and its row): the retention rule an admin applies
  // ("documents kept 5 years, then discarded"). Pass the file id (`uploadFile`'s `id`). A record still holding it
  // reads null afterwards. Idempotent (`already_deleted: true` the second time); 403 for anyone but an app admin.
  // Only a file the app's users uploaded (`uploadFile`); one the owner attached in the Studio is a 403.
  deleteFile: (fileId: string) =>
    req<{ id: string; deleted: boolean; already_deleted: boolean }>("DELETE", `/api/_files/${encodeURIComponent(fileId)}`),
  revokeInvite: (id: string) => req<void>("DELETE", `/admin/user-invites/${encodeURIComponent(id)}`),
};

/** A pending invitation. `status` is `pending` until it is accepted, revoked or it expires (7 days). */
export type Invite = { id: string; email: string; role: string | null; status: string;
                       created_at: string | null; expires_at: string | null };

// ---- the SHARED auth context ----
type AuthState = { user: AppUser | null; loading: boolean; setUser: (u: AppUser | null) => void; phoneLogin: boolean; emailCodeLogin: boolean };
const AuthCtx = createContext<AuthState | null>(null);

// ---- the i18n context of the READY-MADE PIECES (the app's target locale; 'en' by default — an English-first platform) ----
const LocaleCtx = createContext<string>("en");
/** The ready-made pieces' target locale (ChangePassword/AcceptInvite/PaymentMethods/RequirePlan…). Set by a <FabProvider locale>. */
export function useLocale(): string { return useContext(LocaleCtx); }

// Per-route SEO in the SPA. The STATIC routes are already prerendered by the platform (a dist/<route>/index.html with the right
// head); use the `useSeo`/<FabHead> on the DYNAMIC routes (e.g. /produto/:id) — which have no static HTML — and as a reinforcement
// client-side. It updates title + description + og/twitter in the <head> on every change. Idempotent (reuses the tags).
export function useSeo(seo: { title?: string; description?: string; image?: string }): void {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (seo.title) document.title = seo.title;
    const set = (selector: string, attr: "name" | "property", key: string, val?: string) => {
      if (!val) return;
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, key); document.head.appendChild(el); }
      el.setAttribute("content", val);
    };
    set('meta[name="description"]', "name", "description", seo.description);
    set('meta[property="og:title"]', "property", "og:title", seo.title);
    set('meta[property="og:description"]', "property", "og:description", seo.description);
    set('meta[property="og:image"]', "property", "og:image", seo.image);
    set('meta[name="twitter:title"]', "name", "twitter:title", seo.title);
    set('meta[name="twitter:description"]', "name", "twitter:description", seo.description);
    set('meta[name="twitter:image"]', "name", "twitter:image", seo.image);
  }, [seo.title, seo.description, seo.image]);
}
/** The ready-made SEO piece for a DYNAMIC route: `<FabHead title={product.name} description={product.summary} image={product.photo}/>`.
 * It renders nothing; it only adjusts the <head>. On the static routes the platform already prerenders — it is not needed. */
export function FabHead(props: { title?: string; description?: string; image?: string }): null {
  useSeo(props);
  return null;
}
// A shortcut: it translates one of the pieces' keys in the current locale (with an en fallback). An `override` (the app's prop) beats the dictionary.
function useT() { const loc = useLocale(); return (key: FabI18nKey, override?: string) => override ?? i18n(loc, key); }

// The Meta Pixel: the snippet's injection moved to BUILD TIME (services/lib/analytics.mjs → the dist's head, when the owner
// enables the card in the panel), alongside the GA/AdSense. The per-route PageView (an SPA) is fired by the RouteBridge (App.tsx).
// The `trackEvent` (below) still uses the window.fbq, defined by the build-time snippet. There is no more runtime injection here.

// ---- The social login (OAuth). The owner enables the "Login com Google" in the Integrations panel. The flow: navigate to
// the oauthStartUrl(...) → the user logs in at the provider → they come back to the `redirectUri` with a `?fab_oauth_token=` → call
// completeOAuth() (through the useAuth) on the return page to establish the session. ----
export function oauthStartUrl(provider: string, redirectUri?: string): string {
  const redirect = redirectUri ?? (typeof window !== "undefined" ? window.location.origin + window.location.pathname : "");
  return `${fabConfig.base}/projects/${fabConfig.project}/auth/oauth/${provider}/start?redirect=${encodeURIComponent(redirect)}`;
}

// ---- OAuth INSIDE AN IFRAME (the Studio's preview; a published app embedded in the customer's site) -------------
//
// The provider's consent screen can NOT be framed: Discord, Google, Apple and the like send an X-Frame-Options and the
// browser shows "<provider> refused to connect". That was the bug: `window.location.href` in the iframe navigated the
// iframe ITSELF to the provider.
//
// The solution: when embedded, the flow opens in a NEW TAB — a genuine top-level window, which the provider accepts. The login
// completes there, on the app's origin, cookie and all.
//
// WHY THE SESSION DOES NOT COME BACK TO THE IFRAME. We tried returning the token through a `postMessage` to the `window.opener` and it does
// not work, for two independent reasons:
//   1. Google sends a `Cross-Origin-Opener-Policy: same-origin` on the consent screen → the `opener` becomes null
//      PERMANENTLY (coming back to our origin does not restore it). Discord does not send it, so the bug would be "fixed" for only
//      some providers — worse than not fixing it, because it fails silently.
//   2. the app's return page calls `completeOAuth()` in a useEffect (it is what the codegen's SYSTEM tells it to generate), and a
//      CHILD's effects run before the parent's: the fragment has already been consumed and cleared before any relay.
// A cookie/localStorage cannot be used as a bridge either: the preview's iframe is cross-site and the storage is
// PARTITIONED — it is the same reason the `_memToken` exists (see the getToken above).
// Making the session come back requires a handoff on the SERVER (a nonce in the `state` → the callback stores the token → the iframe fetches
// it by the nonce). That is bigger and stands on its own; it is not here.
//
// ⚠️ The preview needs an `allow-popups-to-escape-sandbox` on the iframe, otherwise the new tab INHERITS the sandbox and the provider's
// page opens restricted. See the <iframe> in studio/src/editor/Editor.tsx.

/** It fires a Meta Pixel event (e.g. trackEvent('Purchase',{value,currency})). A no-op when the Pixel is not active. */
export function trackEvent(name: string, params?: Record<string, unknown>) {
  const fbq = (typeof window !== "undefined" ? (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq : undefined);
  if (fbq) fbq("track", name, params);
}

// THE PREVIEW'S AUTO-LOGIN: the Studio embeds the app ALREADY LOGGED IN as the owner (an app-user owner+admin), passing a token in the
// fragment (a #fab_preview_token=). Consumed ONCE at boot, ONLY when embedded (window.parent !== window) — the PUBLISHED
// app (top-level) never receives that token. It writes the cookie and clears the URL (the fragment does not go to the server).
function consumePreviewToken(): boolean {
  if (typeof window === "undefined" || window.parent === window) return false;
  try {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    const pt = new URLSearchParams(hash).get("fab_preview_token");
    if (!pt) return false;
    setToken(pt);
    window.history.replaceState({}, "", window.location.pathname + window.location.search);
    return true;
  } catch { return false; }
}
// THE AUTO-LOGIN AFTER THE OAUTH: the callback returns the token in the return page's fragment (a #fab_oauth_token=). Until
// now, the one consuming it was the GENERATED CODE, calling `completeOAuth()` in a useEffect — and when the AI did not write
// that useEffect the login failed SILENTLY: the user came back from the provider with a VALID token in the URL and kept
// seeing the login screen. It happened in production. The platform cannot depend on the app remembering to do that, so the
// consumption becomes automatic at boot — the same way the preview's token already was.
// The `completeOAuth()` still exists and works (see the useAuth): apps that already call it do not break.
function consumeOAuthToken(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    const t = new URLSearchParams(hash).get("fab_oauth_token");
    if (!t) return false;
    setToken(t);
    window.history.replaceState({}, "", window.location.pathname + window.location.search);  // it strips the token out of the URL
    return true;
  } catch { return false; }
}
// The FAILED return: the callback sends `#fab_oauth_error=<code>` instead of a dead-end error page (inside the store
// shell there is no way back from one). The fragment carries a CODE from a closed set (router.py `_OAUTH_ERROR_CODES`),
// never a sentence: the app's own words in its own language are shown, so a crafted link cannot put text on the screen.
const OAUTH_ERROR_KEYS: Record<string, FabI18nKey> = {
  cancelled: "auth.oauthCancelled", refused: "auth.oauthRefused", unavailable: "auth.oauthUnavailable", failed: "auth.oauthFailed",
};
function consumeOAuthError(): FabI18nKey | null {
  if (typeof window === "undefined") return null;
  try {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    const code = new URLSearchParams(hash).get("fab_oauth_error");
    if (!code) return null;
    window.history.replaceState({}, "", window.location.pathname + window.location.search);
    return OAUTH_ERROR_KEYS[code] ?? "auth.oauthFailed";
  } catch { return null; }
}
function hasOAuthToken(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    return !!new URLSearchParams(hash).get("fab_oauth_token");
  } catch { return false; }
}
// THE AUTOMATIC EMAIL VERIFICATION. The email's link carries a `?token=` on a page of the app, and until now it was only consumed
// if the generated code built a page for it. It is the SAME trap as the social login's (see the consumeOAuthToken): the
// user clicks the link, arrives at the app and nothing happens — and the SYSTEM does not even tell it to generate that page (it only teaches the
// reset one). Since verifying is a SINGLE action with no input, the boot does it by itself.
//
// The `?token=` is shared with the RESET and the INVITE, which need a form and can NOT be consumed here. The
// JWT carries a `purpose` ("verify" | "reset"), so we read the payload (base64, WITHOUT validating the signature — the one who validates is
// the server) only to know whether it is ours. An opaque/unreadable token → it is not ours, let it through.
function purposeOf(token: string): string | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return (JSON.parse(json) as { purpose?: string }).purpose ?? null;
  } catch { return null; }
}

/** It consumes an email VERIFICATION `?token=`. It returns the token, or null when it is not for that purpose. */
function takeVerifyToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const url = new URL(window.location.href);
    const t = url.searchParams.get("token");
    if (!t || purposeOf(t) !== "verify") return null;
    url.searchParams.delete("token");
    window.history.replaceState({}, "", url.pathname + (url.search || "") + url.hash);
    return t;
  } catch { return null; }
}
function hasPreviewToken(): boolean {
  if (typeof window === "undefined" || window.parent === window) return false;
  try {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    return !!new URLSearchParams(hash).get("fab_preview_token");
  } catch { return false; }
}

// THE RACE THAT MADE THE FIRST PAINT LOOK EMPTY. Both consumers above ran ONLY inside the FabProvider's effect — and
// in React a CHILD's effect runs BEFORE its parent's. Every page the AI writes fetches on mount
// (`useEffect(() => { collection('x').list()… }, [])`), so that request went out BEFORE the token existed, came back
// 403, and the page rendered its EMPTY STATE — which reads exactly like "you have no data". Navigating away and back
// appeared to "fix" it because by the second mount the token was finally in. It cost a bug report on an app whose
// data was there the whole time; the same shape hits ANY app opened in the preview iframe or returning from a social
// login. These functions only read `location.hash` and write the token, and they are idempotent — so the honest
// place for them is module load, which runs before any component of the app mounts. The FabProvider still calls
// them (a second call finds no fragment and returns false), and `loading` still starts true because `getToken()`
// now answers.
if (typeof window !== "undefined") {
  consumeOAuthToken();
  consumePreviewToken();
}

// ---- Consent Mode v2 / the cookie banner (LGPD/GDPR) -------------------------------------------------------
// Turned on by the "Consentimento de cookies" card: the build injects the default consent (everything DENIED) + the gate runtime
// BEFORE the tags, and it exposes the window.__FAB_CONSENT__. This banner asks for the acceptance and, in the `updateConsent`, (a) it calls
// gtag('consent','update',…) p/ as tags do GOOGLE (GA/AdSense/GTM) e (b) `__fabConsentGrant()` p/ liberar as tags
// NON-Google ones (the Meta Pixel/Clarity/Hotjar/chat) that the build left queued — they only load AFTER the acceptance. The
// choice is kept in the localStorage (it does not ask again). Internal (not exported): only the FabProvider renders it.
const CONSENT_TEXT: Record<string, { msg: string; accept: string; reject: string }> = {
  en: { msg: "We use cookies to analyze traffic and improve your experience.", accept: "Accept", reject: "Reject" },
  "pt-BR": { msg: "Usamos cookies para analisar o tráfego e melhorar sua experiência.", accept: "Aceitar", reject: "Recusar" },
  es: { msg: "Usamos cookies para analizar el tráfico y mejorar tu experiencia.", accept: "Aceptar", reject: "Rechazar" },
  fr: { msg: "Nous utilisons des cookies pour analyser le trafic et améliorer votre expérience.", accept: "Accepter", reject: "Refuser" },
  de: { msg: "Wir verwenden Cookies, um den Traffic zu analysieren und deine Erfahrung zu verbessern.", accept: "Akzeptieren", reject: "Ablehnen" },
};
const CONSENT_KEY = "__fab_consent";
function updateConsent(granted: boolean) {
  const w = window as unknown as { gtag?: (...a: unknown[]) => void; __fabConsentGrant?: () => void };
  const v = granted ? "granted" : "denied";
  // Google (Consent Mode v2): it allows/denies the storage+ads for the gtag/AdSense/GTM.
  try { w.gtag?.("consent", "update", { ad_storage: v, ad_user_data: v, ad_personalization: v, analytics_storage: v }); } catch { /* gtag is missing */ }
  // The NON-Google ones (the Meta Pixel/Clarity/Hotjar/chat): only on the ACCEPTANCE, it releases the tags the build left queued.
  if (granted) { try { w.__fabConsentGrant?.(); } catch { /* the runtime is missing */ } }
}
function CookieConsent() {
  const loc = useLocale();
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      const on = !!(window as unknown as { __FAB_CONSENT__?: unknown }).__FAB_CONSENT__;
      if (!on) return;
      const decided = localStorage.getItem(CONSENT_KEY);
      // A visitor who has ALREADY decided does not see the banner again, BUT the decision has to be REAPPLIED on every load: the default
      // consent is always "denied", so without this a visitor who accepted would come back with the gtag stuck at denied (the F3 bug).
      if (decided === "granted") updateConsent(true);
      else if (!decided) setShow(true);      // they have not decided yet → it shows the banner ("denied" = it keeps the default)
    } catch { /* no storage */ }
  }, []);
  if (!show) return null;
  const t = CONSENT_TEXT[loc] || CONSENT_TEXT.en;
  const decide = (granted: boolean) => {
    updateConsent(granted);
    try { localStorage.setItem(CONSENT_KEY, granted ? "granted" : "denied"); } catch { /* no storage */ }
    setShow(false);
  };
  return (
    <div role="dialog" aria-live="polite" aria-label={t.msg}
      style={{ position: "fixed", left: 12, right: 12, bottom: 12, zIndex: 2147483000, display: "flex", flexWrap: "wrap",
        alignItems: "center", justifyContent: "center", gap: 12, maxWidth: 720, margin: "0 auto", background: "#111827",
        color: "#fff", padding: "12px 16px", borderRadius: 12, boxShadow: "0 8px 30px rgba(0,0,0,.25)",
        font: "14px/1.4 var(--fab-font, system-ui, sans-serif)" }}>
      <span style={{ flex: "1 1 220px", minWidth: 0 }}>{t.msg}</span>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button type="button" onClick={() => decide(false)}
          style={{ minHeight: 40, padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,.35)", background: "transparent", color: "#fff", fontWeight: 600, cursor: "pointer" }}>{t.reject}</button>
        <button type="button" onClick={() => decide(true)}
          style={{ minHeight: 40, padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--fab-primary, #742FC2)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>{t.accept}</button>
      </div>
    </div>
  );
}

export function FabProvider({ children, locale = "en" }: { children: ReactNode; locale?: string }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [phoneLogin, setPhoneLogin] = useState<boolean>(false);
  const [emailCodeLogin, setEmailCodeLogin] = useState<boolean>(false);
  // the loading starts true when there is already a session (a cookie) OR when a preview token is coming to be consumed — it avoids a "logged out" flash.
  const [loading, setLoading] = useState<boolean>(typeof document !== "undefined" && (!!getToken() || hasPreviewToken() || hasOAuthToken()));
  // THE SIGNUP TRIAL'S DEADLINE. The server ends the trial at `plan_expires_at`, but the cached user would keep
  // `isPremium` true until something re-read `/auth/me`: `RequirePlan` kept rendering the premium screens and every
  // data call answered 403. It lives HERE, once per app, so it runs whether or not a screen mounts `useEntitlement`
  // (an app that gates only through `plan:premium` in the schema) and makes one call, not one per mounted hook.
  // Keyed on the deadline string: the re-read either ends the trial (the key becomes null) or returns the same string,
  // so it never re-arms in a loop. (setTimeout caps at ~24.8 days; trials are <= 30, the visibility check covers it.)
  const trialEnd = user?.plan === "premium" && user?.plan_source === "trial" && typeof user?.plan_expires_at === "string"
    ? user.plan_expires_at : null;
  useEffect(() => {
    if (!trialEnd) return;
    const end = Date.parse(trialEnd);
    if (Number.isNaN(end)) return;
    let alive = true;
    let busy = false;
    let retry: ReturnType<typeof setInterval> | undefined;
    const stop = () => { alive = false; if (retry !== undefined) clearInterval(retry); };
    const reread = () => {
      if (!alive || busy) return;
      busy = true;
      req<AppUser>("GET", "/auth/me")
        // `alive`: a sign-out while this was in flight must not bring the user back.
        .then((u) => { if (alive) setUser(u); })
        // A dead session will not answer later either: stop polling instead of every minute forever. Dead = the
        // renewal was REFUSED and `renew` cleared the cookies. A 401 with the token still in hand is a renewal that
        // could not reach the server (offline at the deadline): stopping there would leave the cached premium on
        // screen for good, the visibility re-read included, so it keeps trying once a minute.
        .catch((e) => { if (e instanceof ApiError && e.status === 401 && !getToken()) stop(); })
        .finally(() => { busy = false; });
    };
    // After the deadline it keeps re-reading once a minute until the server answers without the trial: a phone clock
    // running ahead of the server's would otherwise spend its one re-read before the cut and never try again.
    const wait = end - Date.now() + 1000;
    const id = wait <= 2_000_000_000 ? setTimeout(() => {
      reread();
      if (alive) retry = setInterval(reread, 60_000);
    }, Math.max(wait, 0)) : undefined;
    // A phone that slept through the deadline: timers in a backgrounded WebView do not fire reliably, so coming back
    // to the app re-reads the plan once the deadline is behind us.
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() >= end) reread();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stop();
      if (id !== undefined) clearTimeout(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [trialEnd]);
  useEffect(() => {
    let alive = true;
    consumeOAuthToken();    // the return from the social login: the fragment → the session, without depending on the generated code
    const oauthError = consumeOAuthError();   // a failed social login comes back here instead of a dead-end page
    if (oauthError) setTimeout(() => toast.error(i18n(locale, oauthError)), 0);
    const verifyTok = takeVerifyToken();   // the email verification link: the same (the `verify` purpose only)
    consumePreviewToken();  // the preview: the fragment → the cookie (before the getToken below)
    // the project's public config (the Meta Pixel + the phone login etc.) — it injects the pixel when configured and
    // publishes the `phoneLogin` in the context (the app decides whether to show an "Entrar com telefone").
    fetch(`${fabConfig.base}/projects/${fabConfig.project}/api/_config`).then((r) => r.json())
      .then((c) => { if (!alive) return; setPhoneLogin(!!c?.phoneLogin); setEmailCodeLogin(c?.emailCodeLogin === true); }).catch(() => {});   // the Meta Pixel is now build time
    if (!getToken()) {
      // NO session and a verification token in hand: confirm it anyway. `/auth/verify-email` authenticates by the
      // PURPOSE token, never by the session — returning here read the token, stripped it from the URL and threw it
      // away, so clicking the confirmation link on another device (or after the session expired) silently did
      // nothing, and the retry did nothing either because the token was already gone from the address bar.
      if (verifyTok) {
        req<AppUser>("POST", "/auth/verify-email", { token: verifyTok })
          .catch(() => {}).finally(() => alive && setLoading(false));
      } else {
        setLoading(false);
      }
      return () => { alive = false; };
    }
    // it verifies the email BEFORE loading the user, so the `user.email_verified` already comes updated (otherwise the screen
    // would show the "confirm your email" notice right after the user clicked the very link that confirms it).
    const load = () => req<AppUser>("GET", "/auth/me").then((u) => alive && setUser(u))
      .catch(() => alive && setUser(null)).finally(() => alive && setLoading(false));
    if (verifyTok) req<AppUser>("POST", "/auth/verify-email", { token: verifyTok }).catch(() => {}).finally(load);
    else load();
    return () => { alive = false; };
  }, []);
  return <LocaleCtx.Provider value={locale}><AuthCtx.Provider value={{ user, loading, setUser, phoneLogin, emailCodeLogin }}>{children}<Toaster /><CookieConsent /></AuthCtx.Provider></LocaleCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth: envolva o app em <FabProvider>");
  const { user, loading, setUser, phoneLogin, emailCodeLogin } = ctx;
  return {
    user, isLoggedIn: !!user, isLoading: loading,
    // true when the owner has connected the Twilio → the app can show an "Entrar com telefone" / a password recovery by SMS.
    phoneLogin,
    // true when the owner turned on sign-in by a code sent to the EMAIL → the app can offer "email me a code" (no password).
    emailCodeLogin,
    // `email` may also be the app's profile identifier (a CPF…) when `auth.login_identifier` is set: it travels as both
    // keys, so the API decides by the "@" and an older API, which reads only `email`, keeps working.
    login: async (email: string, password: string) => { const u = await loginFlow("/auth/login", { email, identifier: email, password }); setUser(u); return u; },
    signup: async (input: { email: string; name?: string; password: string; passwordConfirmation?: string; profile?: Row }) => {
      const u = await loginFlow("/auth/signup", { email: input.email, name: input.name, password: input.password, password_confirmation: input.passwordConfirmation, profile: input.profile });
      setUser(u); return u;
    },
    // ⚠️ SIGNING OUT NOW ENDS THE SESSION ON THE SERVER, and does not merely delete a cookie. Before, the token
    // stayed valid until it expired: whoever copied the cookie from a shared computer was still inside the app
    // after the click on "sign out". The screen is cleared FIRST and the server is told without waiting —
    // signing out cannot depend on the network.
    logout: (everywhere = false) => {
      const refresh = getRefresh();
      const token = getToken();
      setToken(undefined); setRefresh(undefined); setUser(null);
      if (token) {
        void fetch(`${fabConfig.base}/projects/${fabConfig.project}/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(everywhere ? { everywhere: true } : { refresh_token: refresh }),
        }).catch(() => { /* signing out is local; the network cannot prevent it */ });
      }
    },
    // The social login: it navigates to the provider's consent screen (e.g. 'google'). The `redirectUri` = where to come back to
    // (the default: the current page). On coming back, the page must call `completeOAuth()`.
    loginWithProvider: (provider: string, redirectUri?: string) => {
      if (typeof window === "undefined") return;
      const url = oauthStartUrl(provider, redirectUri);
      if (!_inFrame()) { window.location.href = url; return; }   // the published app (top-level): the normal flow, untouched
      // EMBEDDED: a new tab (the provider refuses to be framed). A tab, not a popup: with no session relay the user
      // finishes the flow IN IT, and a little 520px window only gets in the way. Blocked by the browser → it falls back to the old
      // behavior, so the app owner at least sees the provider's error instead of a click that does nothing.
      // WITHOUT a `noopener`: by specification, a `window.open` with noopener ALWAYS returns null — the `if (!win)` below
      // would fire on EVERY click and the iframe would navigate to the provider along with the tab, reproducing the "refused to
      // connect" this function exists to avoid. We do not need the opener (the session does not come back through it), and the return
      // value is precisely what tells "the tab opened" apart from "the browser blocked it".
      const win = window.open(url, "_blank");
      if (!win) window.location.href = url;
    },
    // It establishes the session after the provider's redirect: it reads the `?fab_oauth_token=` from the URL, saves the cookie, clears the URL and
    // loads the user. It returns the user or null (when there is no token in the URL). Call it in a useEffect of the return page.
    completeOAuth: async (): Promise<AppUser | null> => {
      if (typeof window === "undefined") return null;
      // the token comes back in the FRAGMENT (a #fab_oauth_token=) — it is not sent to the server (it does not leak in logs/a Referer)
      consumeOAuthToken();
      // The BOOT already consumes the fragment (see the consumeOAuthToken), so by this point it is usually empty. Returning
      // `null` there would break whoever does an `if (await completeOAuth()) navigate("/")` — the app would stop redirecting
      // after a login that SUCCEEDED. That is why the answer is "the session that exists now", not "I found a token".
      if (!getToken()) return null;
      const u = await req<AppUser>("GET", "/auth/me").catch(() => null);
      setUser(u); return u;
    },
    // It edits the logged-in user's OWN profile (the name + the profile fields: the avatar/phone/bio/custom ones). The `name` goes into the
    // name; ANY other key becomes a profile field and comes back FLATTENED on the `user` (e.g. `user.avatar`). It updates the shared
    // state → the header/screens re-render right away. This is HOW an avatar is saved — NEVER use a collection('app_user').
    updateProfile: async (patch: { name?: string; [k: string]: unknown }) => {
      const { name, ...profile } = patch;
      const u = await req<AppUser>("PATCH", "/auth/me", { name, profile });
      setUser(u); return u;
    },
    forgotPassword: (email: string, resetUrl?: string) => req<void>("POST", "/auth/forgot-password", { email, identifier: email, reset_url: resetUrl }),
    resetPassword: async (token: string, password: string, confirm?: string) => { const u = await loginFlow("/auth/reset-password", { token, password, password_confirmation: confirm }); setUser(u); return u; },
    // FIRST ACCESS in place (when `auth.first_access_check` names a field of the list, e.g. a birth date): ask
    // firstAccessCheck(identifier) after the person types the CPF/e-mail; `firstAccess: true` → show the checked field
    // (`type` 'date' or 'text') + new password instead of the password field, then firstAccess(...) sets it and signs in.
    // A mismatch, an unknown identifier and an account already used are the same 401.
    firstAccessCheck: (identifier: string) =>
      req<{ first_access: boolean; field: string | null; type: "date" | "text" | null }>("POST", "/auth/first-access/check", { identifier })
        .then((r) => ({ firstAccess: !!r.first_access, field: r.field ?? null, type: r.type ?? null })),
    firstAccess: async (identifier: string, value: string, password: string, confirm?: string) => {
      const u = await loginFlow("/auth/first-access", { identifier, value, password, password_confirmation: confirm }); setUser(u); return u;
    },
    verifyEmail: async (token: string) => { const u = await req<AppUser>("POST", "/auth/verify-email", { token }); setUser(u); return u; },
    resendVerification: (verifyUrl?: string) => req<void>("POST", "/auth/resend-verification", { verify_url: verifyUrl }),
    // It accepts an invite (the email's token) by setting the password → it creates the account with the invite's role and logs in right away.
    acceptInvite: async (token: string, name: string, password: string) => { const u = await loginFlow("/auth/accept-invite", { token, name, password }); setUser(u); return u; },
    // It changes the logged-in user's password. On the 1st access (user.must_change_password) the `current` is not required.
    changePassword: async (newPassword: string, current?: string) => { await req<{ ok: boolean }>("POST", "/auth/change-password", { new_password: newPassword, current_password: current }); const u = await req<AppUser>("GET", "/auth/me"); setUser(u); return u; },
    // ---- The SIGN-IN by EMAIL CODE (no password). Only available when `emailCodeLogin`. Ask for the address, call
    // sendEmailCode(email), then an <OTPInput> for the 6 digits and loginWithEmailCode(email, code). The send answers the
    // same 200 whether or not the address has an account (anti enumeration) — so the screen says "if this address is
    // registered, a code is on its way", never "code sent". A wrong/expired code is a 400: offer to send a new one. ----
    sendEmailCode: (email: string) => req<void>("POST", "/auth/email/send-code", { email }),
    loginWithEmailCode: async (email: string, code: string) => { const u = await loginFlow("/auth/email/verify", { email, code }); setUser(u); return u; },
    // ---- The LOGIN / RECOVERY by PHONE (SMS). Only available when `phoneLogin` (the Twilio is connected). Use a <PhoneInput>
    // for the number (E.164) and an <OTPInput> for the 6-digit code. It always answers 200 on the send (anti enumeration). ----
    // It sends a code by SMS. The purpose 'login' (the default) to sign in; 'reset' to recover the password.
    sendPhoneCode: (phone: string, purpose: "login" | "reset" = "login") => req<void>("POST", "/auth/phone/send-code", { phone, purpose }),
    // It confirms the LOGIN code → it creates the account when the phone is new (allow_signup) and establishes the session. It returns the user.
    loginWithPhone: async (phone: string, code: string) => { const u = await loginFlow("/auth/phone/verify", { phone, code, purpose: "login" }); setUser(u); return u; },
    // It resets the password by SMS in one step: the phone + the code (requested with a sendPhoneCode(phone,'reset')) + the new password. It logs in right away.
    resetPasswordSms: async (phone: string, code: string, newPassword: string) => { const u = await loginFlow("/auth/phone/reset", { phone, code, new_password: newPassword }); setUser(u); return u; },
    // LINKING a phone to the LOGGED-IN user's account (e.g. the Profile screen): (1) a linkPhone(phone) sends the SMS; (2) a
    // verifyPhoneLink(phone, code) confirms and writes the number → the account can then sign in/recover its password by SMS.
    linkPhone: (phone: string) => req<void>("POST", "/auth/phone/link", { phone }),
    verifyPhoneLink: async (phone: string, code: string) => { const u = await req<AppUser>("POST", "/auth/phone/link/verify", { phone, code }); setUser(u); return u; },
  };
}

/**
 * <ChangePassword/> — the READY-MADE password change SCREEN. When `user.must_change_password` is true (a user created by the
 * admin), it does NOT ask for the current password (the 1st access); otherwise it does. Use it in `src/pages/ChangePassword.tsx` on the
 * `/change-password` route and/or render it conditionally when `user.must_change_password`. The texts localized by the
 * <FabProvider>'s locale; any of them can be overridden by a prop. A platform component — do not recreate it.
 */
export function ChangePassword({ redirectTo = "/", title, subtitle }: { redirectTo?: string; title?: string; subtitle?: string }) {
  const { user, changePassword } = useAuth();
  const T = useT();
  const mustChange = user?.must_change_password === true;
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try { await changePassword(next, mustChange ? undefined : current); setOk(true); if (redirectTo) window.location.href = redirectTo; }
    catch (err) { setError(err instanceof ApiError ? err.message : T("cp.error")); setBusy(false); }
  }
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center gap-4 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold">{title ?? T(mustChange ? "cp.titleMust" : "cp.titleChange")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle ?? T(mustChange ? "cp.subMust" : "cp.subChange")}</p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-3">
        {!mustChange && <input value={current} onChange={(e) => setCurrent(e.target.value)} type="password" placeholder={T("cp.current")} autoComplete="current-password" required className="h-11 rounded-lg border px-3 text-sm outline-none focus:border-primary" />}
        <input value={next} onChange={(e) => setNext(e.target.value)} type="password" placeholder={T("cp.new")} autoComplete="new-password" required minLength={6} className="h-11 rounded-lg border px-3 text-sm outline-none focus:border-primary" />
        {error && <p className="text-sm text-destructive">{error}</p>}
        {ok && <p className="text-sm text-emerald-600">{T("cp.updated")}</p>}
        <button type="submit" disabled={busy || !next} className="h-11 rounded-lg bg-primary font-semibold text-primary-foreground disabled:opacity-50">{busy ? T("cp.saving") : T("cp.save")}</button>
      </form>
    </div>
  );
}

/**
 * <AcceptInvite/> — the READY-MADE invite acceptance PAGE. It reads the `?token=` from the URL, the invitee sets a name + a password → they get in
 * already with the invite's role. Use it in `src/pages/AcceptInvite.tsx` on the `/accept-invite` route:
 * `export default function P(){ return <AcceptInvite/> }`. ALWAYS include this route when the app has a login
 * (mandatory or optional). The texts localized by the <FabProvider>'s locale; overridable by a prop. Do not recreate it.
 */
export function AcceptInvite({ redirectTo = "/", title, subtitle }: { redirectTo?: string; title?: string; subtitle?: string }) {
  const { acceptInvite } = useAuth();
  const T = useT();
  const [token, setToken] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setToken(new URLSearchParams(window.location.search).get("token") || ""); }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try { await acceptInvite(token, name, password); window.location.href = redirectTo; }
    catch (err) { setError(err instanceof ApiError ? err.message : T("ai.error")); setBusy(false); }
  }
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center gap-4 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold">{title ?? T("ai.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle ?? T("ai.subtitle")}</p>
      </div>
      {!token ? (
        <p className="text-sm text-destructive">{T("ai.invalid")}</p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={T("ai.name")} autoComplete="name"
                 className="h-11 rounded-lg border px-3 text-sm outline-none focus:border-primary" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder={T("ai.password")} autoComplete="new-password" required minLength={6}
                 className="h-11 rounded-lg border px-3 text-sm outline-none focus:border-primary" />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button type="submit" disabled={busy || !password}
                  className="h-11 rounded-lg bg-primary font-semibold text-primary-foreground disabled:opacity-50">
            {busy ? T("ai.submitting") : T("ai.submit")}
          </button>
        </form>
      )}
    </div>
  );
}

export function useEntitlement() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useEntitlement: envolva o app em <FabProvider>");
  const { user, setUser } = ctx;
  const plan = user?.plan ?? "free";
  // `refresh` re-reads the plan the SERVER holds (it re-checks the deadline on every request). It did not exist:
  // generated screens called `useEntitlement().refresh?.()` for "Restore purchases" and got `undefined`, so the
  // button did nothing at all (Querido Autista, 2026-10-21).
  const refresh = useCallback(async () => {
    const u = await req<AppUser>("GET", "/auth/me").catch(() => null);
    if (u) setUser(u);
    return u;
  }, [setUser]);
  // `restore` is the store's "Restore purchases": inside the native shell it re-submits what the STORE holds for this
  // device to the server (which re-verifies each one with the owner's key), then re-reads the plan. In a browser there
  // is nothing on the device to restore, so it is the same as `refresh`.
  const restore = useCallback(async () => {
    const out = await restorePurchases(user?.id || "");
    await refresh();
    return out;
  }, [user?.id, refresh]);
  // The SERVER's signup trial (`auth.signup_trial_hours`): free Premium for a new account until `trialEndsAt`. The app
  // only SHOWS it (a countdown, a "subscribe now" that stays available); it never grants or extends one itself.
  const isTrial = plan === "premium" && user?.plan_source === "trial";
  const trialEndsAt = isTrial && typeof user?.plan_expires_at === "string" ? user.plan_expires_at : null;
  // `trialUsed`: this person already had the trial (running OR ended). After the deadline the server clears the
  // trial's source, so `isTrial` alone cannot tell "your free access ended" from "never had one"; this can.
  const trialUsed = isTrial || user?.trial_used === true;
  // The re-read at the deadline lives in `FabProvider` (once per app, whether or not a screen mounts this hook).
  return { plan, isPremium: plan === "premium", isTrial, trialEndsAt, trialUsed, refresh, restore };
}

// ---- IN-APP notifications (a bell/badge). The notifications are CREATED by the AUTOMATIONS (fab.automations.json) —
// here the app only DISPLAYS them and marks them read. It is a Record of the canonical model `notification` (user/title/body/read/
// link/created_at), scoped by owner (each person only sees their own). It requires a logged-in user. ----
export type Notification = Row & { title?: string; body?: string; read?: boolean; link?: string | null };
/**
 * useNotifications() — the logged-in user's notification BELL. It returns `{ items, unread, markRead, markAllRead, refresh }`.
 * Build a bell icon with the `unread` badge, a dropdown/sheet with the `items` and call markRead/markAllRead on opening.
 * It reloads when the user signs in/out. A platform component — do not recreate the logic with a collection('notification').
 */
export function useNotifications() {
  const { isLoggedIn } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const col = collection<Notification>("notification");
  const refresh = useCallback(async () => {
    if (!isLoggedIn) { setItems([]); return; }
    try {
      setItems(await col.list({ sort: "-created_at", limit: 50 }));
    } catch { setItems([]); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);
  useEffect(() => { refresh(); }, [refresh]);
  const markRead = useCallback(async (id: string) => {
    await col.update(id, { read: true } as Partial<Notification>);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const markAllRead = useCallback(async () => {
    const unreadItems = items.filter((n) => !n.read);
    await Promise.all(unreadItems.map((n) => col.update(n.id, { read: true } as Partial<Notification>)));
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);
  const unread = items.reduce((acc, n) => acc + (n.read ? 0 : 1), 0);
  return { items, unread, markRead, markAllRead, refresh };
}

/**
 * <RequirePlan> — the READY-MADE GUARD for a whole-app paywall. If the user does NOT have an active subscription
 * (`useEntitlement().isPremium === false`), it redirects to the `redirectTo` ('/subscribe' by default) OR it renders the
 * `fallback` (when given, it takes priority over the redirect). When premium, it renders the `children`. Analogous to the
 * `RequireAuth` the SYSTEM suggests. Wrap the premium area: `<RequirePlan><Route.../></RequirePlan>`. While the
 * auth is loading, it decides nothing (it avoids a flash). The fallback's texts are localized; overridable by a prop.
 */
export function RequirePlan({ children, redirectTo = "/subscribe", fallback, title, subtitle, cta }:
  { children: ReactNode; redirectTo?: string; fallback?: ReactNode; title?: string; subtitle?: string; cta?: string }) {
  const { isPremium } = useEntitlement();
  const { isLoading } = useAuth();
  const T = useT();
  const navigate = useNavigate();
  useEffect(() => {
    if (!isLoading && !isPremium && !fallback && redirectTo) navigate(redirectTo);
  }, [isLoading, isPremium, fallback, redirectTo, navigate]);
  if (isLoading) return null;
  if (isPremium) return <>{children}</>;
  if (fallback) return <>{fallback}</>;
  // the default fallback while the redirect has not happened (or when the app prefers to show it without navigating)
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center gap-3 px-4 py-10 text-center">
      <h1 className="text-2xl font-bold">{title ?? T("rp.title")}</h1>
      <p className="text-sm text-muted-foreground">{subtitle ?? T("rp.subtitle")}</p>
      <button onClick={() => navigate(redirectTo)} className="h-11 rounded-lg bg-primary px-6 font-semibold text-primary-foreground">{cta ?? T("rp.cta")}</button>
    </div>
  );
}

// ---- THE LOGIN GUARD. Before 2026-10-16 the SYSTEM told the model to write its own `RequireAuth` "if it repeats"; it
// never did, and a private app came out with every screen swapped for a "sign in to see your stock" notice with a
// button (Estoque Fácil, four screens, zero redirects). The guard is the platform's now, and it does the three things
// the hand-written ones kept missing: it decides NOTHING while the session is being restored (no login flash on a
// refresh), it redirects with `replace` (Back never lands on the guarded screen), and it remembers where the person
// was going, so the login screen can send them back there. The server enforces access anyway; this is the UX half. ----
const AUTH_ROUTES = /^\/(login|signup|forgot-password|reset-password|accept-invite|change-password)(\/|\?|#|$)/;
/** The path a `<RequireAuth>` redirect came from (`location.state.from`), when it is a safe in-app path; else `fallback`.
 *  Only a RELATIVE path is honoured ("/x", never "//evil", "/\\evil" or "https://…"), and never an auth screen (a loop). */
export function useReturnTo(fallback = "/"): string {
  const location = useLocation();
  const from = (location.state as { from?: unknown } | null)?.from;
  if (typeof from !== "string" || !from.startsWith("/") || from.startsWith("//") || from.includes("\\") || AUTH_ROUTES.test(from)) return fallback;
  return from;
}
function RouteFallback() {
  return <div className="fab-route-fallback" aria-busy="true" aria-live="polite"><i /><i /><i /><i /></div>;
}
/**
 * <RequireAuth> — the READY-MADE login guard. Use it as a LAYOUT ROUTE around every private route:
 * `<Route element={<RequireAuth/>}><Route element={<Layout/>}><Route path='/' element={<Home/>}/>…</Route></Route>`
 * (it renders the `<Outlet/>`; with children it renders them instead). While the session is being restored it shows
 * the route skeleton and decides nothing; signed out, it redirects to `redirectTo` ('/login') with `replace` and
 * remembers the path in `state.from` (the login screen reads it with `useReturnTo()`); `roles` restricts further
 * (`<RequireAuth roles={['admin']} redirectTo='/'>`). A screen inside it never checks `isLoggedIn` itself and never
 * renders a "sign in to continue" notice: the person is sent to the login BEFORE seeing the screen.
 */
export function RequireAuth({ children, redirectTo = "/login", roles }:
  { children?: ReactNode; redirectTo?: string; roles?: string[] }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <RouteFallback />;
  if (!user) return <Navigate to={redirectTo} replace state={{ from: location.pathname + location.search + location.hash }} />;
  if (roles && roles.length && !roles.some((r) => (user.roles || []).includes(r))) {
    const dest = redirectTo === "/login" ? "/" : redirectTo;
    // the fail-safe: when the destination is THIS route (the app put `/` under the same role guard), a redirect would
    // re-render here forever; the person is signed in and lacks the role, so a blank is the honest outcome
    return dest === location.pathname ? null : <Navigate to={dest} replace />;
  }
  return children ? <>{children}</> : <Outlet />;
}
/**
 * <GuestOnly> — the mirror guard for /login and /signup: a person who is ALREADY signed in is sent on (to where the
 * guard remembered, else `to`, '/') instead of seeing the form again. `<Route path='/login' element={<GuestOnly><Login/></GuestOnly>}/>`.
 */
export function GuestOnly({ children, to = "/" }: { children?: ReactNode; to?: string }) {
  const { user, isLoading } = useAuth();
  const returnTo = useReturnTo(to);
  if (isLoading) return <RouteFallback />;
  if (user) return <Navigate to={returnTo} replace />;
  return children ? <>{children}</> : <Outlet />;
}

// ---- The USAGE QUOTA (the app's freemium): "N free per day/month" of a named ACTION (e.g. summarizing, solving a question).
// Premium (`useEntitlement().isPremium`) is UNLIMITED (the backend bypasses it). It requires a logged-in user. ----
export type QuotaState = {
  remaining: number | null;   // null = unlimited (premium)
  unlimited: boolean;
  allowed: boolean;           // can they still consume?
  loading: boolean;
  consume: () => Promise<boolean>;   // it consumes 1 (it returns false when blocked) — call it BEFORE the gated action
  refresh: () => void;
};
/**
 * useQuota — the logged-in user's usage quota for an ACTION. `const q = useQuota('summarize', { limit: 3, period: 'month' })`.
 * Before running the action (e.g. calling the invokeLLM), do an `if (!(await q.consume())) return;` — premium always goes through.
 * Show the limit with a `<QuotaGate quota={q}>…</QuotaGate>` or display the `q.remaining`. It requires a login.
 */
export function useQuota(key: string, opts: { limit: number; period?: "day" | "month" }): QuotaState {
  const { isLoggedIn } = useAuth();
  const period = opts.period || "day";
  const limit = opts.limit;
  const [st, setSt] = useState<{ remaining: number | null; unlimited: boolean; loading: boolean }>({ remaining: null, unlimited: false, loading: true });
  const refresh = useCallback(() => {
    if (!isLoggedIn) { setSt({ remaining: 0, unlimited: false, loading: false }); return; }
    req<{ remaining: number | null; unlimited: boolean }>("GET", `/usage/${encodeURIComponent(key)}?limit=${limit}&period=${period}`)
      .then((r) => setSt({ remaining: r.remaining, unlimited: r.unlimited, loading: false }))
      .catch(() => setSt((s) => ({ ...s, loading: false })));
  }, [isLoggedIn, key, limit, period]);
  useEffect(() => { refresh(); }, [refresh]);
  const consume = useCallback(async (): Promise<boolean> => {
    try {
      const r = await req<{ allowed: boolean; remaining: number | null; unlimited: boolean }>("POST", "/usage/consume", { key, limit, period });
      setSt({ remaining: r.remaining, unlimited: r.unlimited, loading: false });
      return r.allowed;
    } catch { return false; }
  }, [key, limit, period]);
  return { remaining: st.remaining, unlimited: st.unlimited, allowed: st.unlimited || (st.remaining ?? 0) > 0, loading: st.loading, consume, refresh };
}

/**
 * <QuotaGate> — the READY-MADE paywall for a LIMIT reached. Pass the `quota` from the `useQuota`: while there is balance left (or premium)
 * it renders the `children`; when it runs out, it shows the limit screen (the title/subtitle/cta → the `redirectTo`) or the `fallback`.
 * A platform component — do not recreate it. The texts are localized; overridable by a prop.
 */
export function QuotaGate({ quota, children, redirectTo = "/subscribe", fallback, title, subtitle, cta }:
  { quota: QuotaState; children?: ReactNode; redirectTo?: string; fallback?: ReactNode; title?: string; subtitle?: string; cta?: string }) {
  const T = useT();
  const navigate = useNavigate();
  if (quota.loading || quota.allowed) return <>{children}</>;
  if (fallback) return <>{fallback}</>;
  return (
    <div className="mx-auto flex min-h-[40vh] max-w-sm flex-col items-center justify-center gap-3 px-4 py-10 text-center">
      <h1 className="text-2xl font-bold">{title ?? T("qt.title")}</h1>
      <p className="text-sm text-muted-foreground">{subtitle ?? T("qt.subtitle")}</p>
      <button onClick={() => navigate(redirectTo)} className="h-11 rounded-lg bg-primary px-6 font-semibold text-primary-foreground">{cta ?? T("qt.cta")}</button>
    </div>
  );
}

// The `paymentMethods` (e.g. ['credit_card','pix']) chooses the methods offered at the checkout; empty = all of the gateway's (PIX included in BR).
// A one-off purchase: prefer the `product_id` (the `product` record's id) — the AMOUNT is resolved on the server (safe; it works the same
// on Stripe and on Pagar.me). The `price_id`/`amount` remain for advanced cases.
// A checkout item: reference a RECORD of the app's and the PRICE is resolved on the server (the client never sets it).
// The `product_id` is the shortcut for the `product` model; to charge ANY other model with a `price` field (a service,
// course, ticket, session…), use `model_id` + `record_id`.
// `installments`: card installments of a Pagar.me subscription (1 = in full). Offer only what `useInstallments` lists:
// the server prices the interest and refuses any other count.
type CheckoutInput = { items: { product_id?: string; model_id?: string; record_id?: string; price_id?: string; quantity?: number; amount?: number }[]; successUrl: string; cancelUrl: string; metadata?: Record<string, unknown>; coupon?: string; paymentMethods?: string[]; installments?: number };
/** A sale this app is not allowed to make from where it is running — see the invariant in `fab-shell`. It is an ERROR
 *  and not an empty result on purpose: the caller's next line is usually `location.href = r.redirect_url`, and handing
 *  back an object with no URL would navigate the app to garbage. A rejected promise stops there. */
export class SubscribeUnavailable extends Error {
  readonly origin: SaleOrigin;
  constructor(origin: SaleOrigin = "none") {
    super("this app cannot sell a subscription here");
    this.name = "SubscribeUnavailable";
    this.origin = origin;
  }
}

function checkout(input: CheckoutInput & { mode: "payment" | "subscription" }, userId = "") {
  // THE STORE-POLICY GUARD. Inside the native shell a gateway checkout is a payment link INSIDE the app, which is the
  // literal example in Google Play's payments policy — the app gets rejected, or pulled with subscribers inside.
  //
  // ⚠️ ONLY `subscription`. A one-off `payment` may well be a PHYSICAL good (the product/order blueprint), which the
  // policies explicitly exempt — blocking it here would break every legitimate store app to fix a subscription
  // problem. A one-off purchase OF A PLAN is digital and is the gap this leaves open; it needs the record's type,
  // which only the server has, and it closes server-side with `/checkout/options`.
  //
  // Rejecting (not throwing) so a caller that never awaits still lands in `.catch` instead of blowing up the render.
  if (input.mode === "subscription") {
    const origem = saleOrigin(currentShell());
    if (origem === "none") return Promise.reject(new SubscribeUnavailable("none"));
    // ⚠️ EVERY origin is handled explicitly, and `iap` gets its own branch even while that branch only refuses.
    // The first version tested for `"none"` and let everything else fall through to the gateway — which reads as
    // correct today only because no shell announces `iap` yet. The day the capability is switched on, that
    // fall-through would send a shell WITH store billing to the gateway: a payment link inside a published app,
    // which is the violation this whole module exists to prevent. An unreachable branch that refuses is cheap; a
    // silent fall-through that becomes a violation on a config change is not.
    if (origem === "iap") return storeSubscribe(input, userId);
  }
  return req<{ redirect_url: string }>("POST", "/checkout", { mode: input.mode, items: input.items, success_url: input.successUrl, cancel_url: input.cancelUrl, metadata: input.metadata ?? {}, coupon: input.coupon ?? "", payment_methods: input.paymentMethods, installments: input.installments ?? 1 });
}

/** One way to pay a subscription plan: `installments` × `installmentAmount` = `total`, all in CENTS. `interest` is
 *  what the buyer pays on top of the plan price (0 when paid in full). */
export type InstallmentOption = { installments: number; total: number; installmentAmount: number; interest: number };

/**
 * The installment options of a plan, priced by the server from the owner's fee table, for the screen that shows
 * "6x de R$ 20,01" before subscribing. Pass the same item (and coupon) the `useSubscribe()` call will send, then send
 * the picked `installments` with it. Only a Pagar.me subscription parcels: before the owner set the fees the list
 * holds just the single payment (`installments: 1`); on another gateway, and inside a store app, it is empty.
 */
export function useInstallments(item: CheckoutInput["items"][number] | null | undefined, opts: { coupon?: string } = {}) {
  const { isLoggedIn } = useAuth();
  const key = item ? JSON.stringify(item) : "";
  const coupon = opts.coupon ?? "";
  const [st, setSt] = useState<{ options: InstallmentOption[]; loading: boolean; error: string }>({ options: [], loading: !!key, error: "" });
  useEffect(() => {
    // a store app sells through the store at the store's price: a gateway "6x de" there would quote a sale that
    // cannot happen (and `checkout()` refuses the gateway there anyway)
    if (!key || !isLoggedIn || saleOrigin(currentShell()) !== "gateway") { setSt({ options: [], loading: false, error: "" }); return; }
    let alive = true;
    setSt({ options: [], loading: true, error: "" });
    req<{ options: { installments: number; total: number; installment_amount: number; interest: number }[] }>(
      "POST", "/checkout/installments", { items: [JSON.parse(key)], coupon })
      .then((r) => { if (alive) setSt({ options: (r.options || []).map((o) => ({ installments: o.installments, total: o.total, installmentAmount: o.installment_amount, interest: o.interest })), loading: false, error: "" }); })
      .catch((e: unknown) => { if (alive) setSt({ options: [], loading: false, error: e instanceof Error ? e.message : String(e) }); });
    return () => { alive = false; };
  }, [key, coupon, isLoggedIn]);
  return st;
}
export function useCheckout() { return (input: CheckoutInput) => checkout({ ...input, mode: "payment" }); }
export function useSubscribe() {
  // It reads the logged-in user because a STORE purchase has to carry an account id: without it the purchase belongs
  // to a Google/Apple account and nothing maps it back to whoever is signed into the app. On the gateway path the
  // server injects the same id from the token, so nothing changes there.
  const { user } = useAuth();
  return (input: CheckoutInput) => checkout({ ...input, mode: "subscription" }, user?.id || "");
}

/** The store purchase, end to end. Four steps and none of them optional:
 *
 *  1. ASK THE SERVER. The shell knows what it CAN do; only the server knows what is READY — a base plan still in
 *     draft, an owner mid-setup, a buyer already subscribed elsewhere. Anything other than `iap` is a refusal, and
 *     that includes `gateway`: we are inside a published app, so falling back to the web checkout would be the
 *     violation this module exists to prevent.
 *  2. READ THE OFFER. Android buys an OFFER of a base plan, not the product, so the offerToken comes from the store.
 *  3. BUY, then hand the purchase to the server, which verifies it with the OWNER's own store credential and grants.
 *  4. ⚠️ ONLY THEN ACKNOWLEDGE. Google auto-refunds an Android purchase not finalized within three days — but
 *     acknowledging BEFORE the server verified would close a transaction that granted nothing, with no retry left. */
async function storeSubscribe(input: CheckoutInput, userId: string): Promise<{ redirect_url: string }> {
  const shell = currentShell();
  const item = input.items?.[0] || {};
  const planId = String(item.record_id || item.product_id || item.price_id || "");
  const opt = await req<{ origin: string; sku: string; base_plan: string; reason: string }>(
    "POST", "/checkout/options", { native: true, platform: shell.platform || "", plan_id: planId });
  if (opt.origin !== "iap" || !opt.sku) throw new SubscribeUnavailable("none");
  if (!userId) throw new SubscribeUnavailable("none");

  const [produto] = await storeProducts([opt.sku]);
  // ⚠️ THE STORE NOT KNOWING THE SKU IS A REFUSAL, not a missing offer token. Buying on regardless asked StoreKit
  // (or Play) for a product it had never heard of, and what the caller got back was a raw `Error` — or, on iOS, a
  // request that simply never settles — instead of the `SubscribeUnavailable` every subscribe screen already
  // catches. It became reachable the day the server started allowing a sale over an Apple product still awaiting
  // review: that product IS in the sandbox and is NOT in production, so this is exactly the line a real buyer of a
  // not-yet-approved plan lands on.
  if (!produto) throw new SubscribeUnavailable("iap");
  const compra = await storePurchase(opt.sku, userId, produto.offerToken || "");
  // THE TWO STORES ARE ADDRESSED BY DIFFERENT THINGS: Google verifies an opaque `purchaseToken`, Apple's Server API
  // is addressed by a `transactionId`. The iOS `purchaseToken` is deliberately NOT forwarded: it is the whole signed
  // JWS, worth kilobytes in every request log, and the server has no use for it — it re-queries Apple either way.
  const ios = (shell.platform || "") === "ios";
  const r = await req<{ acknowledge?: boolean }>(
    "POST", "/checkout/store", { purchase_token: ios ? "" : compra.purchaseToken,
                                 transaction_id: compra.transactionId || "", sku: opt.sku,
                                 platform: shell.platform || "android" });
  if (r?.acknowledge) await storeFinish(compra.purchaseToken, compra.transactionId);

  // The contract is redirect-shaped because every app generated so far does `location.href = r.redirect_url`. There
  // is no URL in a store purchase, so this reloads the current screen — ugly, and correct: the reload is what
  // refreshes `useEntitlement` right after the grant. New apps `await subscribe()` and never read the field.
  return { redirect_url: typeof location !== "undefined" ? location.href : "" };
}

/** "Restore purchases", end to end. The App Store REQUIRES it on any subscription screen and App Review taps it.
 *
 *  It asks the STORE what it still holds for this device and hands each purchase to the server, which re-verifies it
 *  with the owner's own key and grants (or refuses) — the device never decides, exactly as on a fresh purchase. Two
 *  jobs it covers that a reload of the session cannot: a purchase whose verification never reached the server (the
 *  app was closed, the network dropped) and a reinstall on a device where nothing was granted yet.
 *
 *  ⚠️ IT EXISTED ONLY HALF-WAY until 2026-10-21. The shell answered `iap.restore` and nothing in the SDK ever called
 *  it, so every generated "Restore purchases" button only re-read the session.
 *
 *  Each purchase is independent: one refused (another account's, an expired one) must not stop the rest, and the
 *  answer counts both so the screen can say something true. Outside a shell with store billing it does nothing. */
export async function restorePurchases(userId: string): Promise<{ checked: number; restored: number }> {
  const shell = currentShell();
  if (saleOrigin(shell) !== "iap" || !userId) return { checked: 0, restored: 0 };
  const ios = (shell.platform || "") === "ios";
  let purchases: Awaited<ReturnType<typeof storeRestore>> = [];
  try { purchases = await storeRestore(); } catch { return { checked: 0, restored: 0 }; }
  let restored = 0;
  for (const c of purchases || []) {
    try {
      const r = await req<{ acknowledge?: boolean }>(
        "POST", "/checkout/store", { purchase_token: ios ? "" : c.purchaseToken, transaction_id: c.transactionId || "",
                                     sku: c.sku, platform: shell.platform || "android" });
      restored += 1;
      if (r?.acknowledge) await storeFinish(c.purchaseToken, c.transactionId).catch(() => {});
    } catch { /* refused by the server (another account, not active): the next one may still be valid */ }
  }
  return { checked: (purchases || []).length, restored };
}

/** Wraps whatever SELLS (a plan card, a price table, a subscribe button) so it simply is not there when this app may
 *  not sell from where it runs. Use it instead of hiding the button by hand — the rule is one line here and a policy
 *  violation everywhere it is forgotten.
 *
 *  ⚠️ The mute state carries NO price, NO link and NO "subscribe on our website". Each of those is the same
 *  anti-steering violation wearing different clothes; the owner tells people how to subscribe OUTSIDE the app. */
export function SubscribeGate({ children, title, subtitle, fallback }:
  { children?: ReactNode; title?: string; subtitle?: string; fallback?: ReactNode }) {
  const T = useT();
  if (saleOrigin(currentShell()) !== "none") return <>{children}</>;
  if (fallback) return <>{fallback}</>;
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center justify-center gap-2 px-4 py-8 text-center">
      <p className="text-base font-semibold">{title ?? T("sg.title")}</p>
      <p className="text-sm text-muted-foreground">{subtitle ?? T("sg.body")}</p>
    </div>
  );
}

// ---- the rich text (a post editor + a renderer). The TipTap lives in separate modules and is loaded on demand
// (code-split through a React.lazy) — it never goes into the shared chunk. The app USES these, it does not import the TipTap directly.
// In Vite there is no SSR: both become client-side lazy ones, with a <Suspense> to hold the 1st render while the chunk downloads. ----
type RichTextEditorProps = ComponentProps<typeof import("./rich-text-editor").RichTextEditor>;
type RichTextProps = ComponentProps<typeof import("./rich-text-view").RichText>;
const LazyRichTextEditor = lazy(() => import("./rich-text-editor").then((m) => ({ default: m.RichTextEditor })));
const LazyRichText = lazy(() => import("./rich-text-view").then((m) => ({ default: m.RichText })));
// The editor: it needs the DOM (client only). An image upload built in through the uploadFile (the curated files integration).
export function RichTextEditor(props: RichTextEditorProps) {
  return <Suspense fallback={null}><LazyRichTextEditor {...props} /></Suspense>;
}
// The renderer of the saved HTML (sanitized with DOMPurify).
export function RichText(props: RichTextProps) {
  return <Suspense fallback={null}><LazyRichText {...props} /></Suspense>;
}

// ---- <Chat/> — realtime messaging (the "messaging" blueprint). Code-split: it only enters the bundle on the 1st render.
// It consumes the canonical models `conversation`/`message` through the SDK (a light poll). The app USES the <Chat/>, it does not recreate it. ----
type ChatProps = ComponentProps<typeof import("./fab-chat").Chat>;
const LazyChat = lazy(() => import("./fab-chat").then((m) => ({ default: m.Chat })));
export function Chat(props: ChatProps) {
  return <Suspense fallback={null}><LazyChat {...props} /></Suspense>;
}

// ---- <VideoPlayer/> — video (hosted HLS/MP4 or YouTube/Vimeo). Code-split: the hls.js only comes in when there is a video. ----
type VideoPlayerProps = ComponentProps<typeof import("./fab-video-player").VideoPlayer>;
const LazyVideoPlayer = lazy(() => import("./fab-video-player").then((m) => ({ default: m.VideoPlayer })));
export function VideoPlayer(props: VideoPlayerProps) {
  return <Suspense fallback={null}><LazyVideoPlayer {...props} /></Suspense>;
}

// ---- <SlotPicker/> — scheduling (the "booking" blueprint). Code-split. It consumes service/availability/booking. ----
type SlotPickerProps = ComponentProps<typeof import("./fab-booking").SlotPicker>;
const LazySlotPicker = lazy(() => import("./fab-booking").then((m) => ({ default: m.SlotPicker })));
export function SlotPicker(props: SlotPickerProps) {
  return <Suspense fallback={null}><LazySlotPicker {...props} /></Suspense>;
}

// ---- <Feed/> — a social feed (blueprint "social"). Code-split. Consumes post/comment/like. ----
type FeedProps = ComponentProps<typeof import("./fab-feed").Feed>;
const LazyFeed = lazy(() => import("./fab-feed").then((m) => ({ default: m.Feed })));
export function Feed(props: FeedProps) {
  return <Suspense fallback={null}><LazyFeed {...props} /></Suspense>;
}

// ---- <Rating/> — reviews & ratings (the "reviews" blueprint). Code-split. It consumes the `review` model. ----
type RatingProps = ComponentProps<typeof import("./fab-rating").Rating>;
const LazyRating = lazy(() => import("./fab-rating").then((m) => ({ default: m.Rating })));
export function Rating(props: RatingProps) {
  return <Suspense fallback={null}><LazyRating {...props} /></Suspense>;
}

// ---- <Chart/> — a simple data-driven chart (line/bar/area/donut) for dashboards. Code-split. With no blueprint
// (it renders data computed by the app). Combine it with a <StatCard/> (from @/components/ui/stat-card) for KPIs. ----
type ChartProps = ComponentProps<typeof import("./fab-charts").Chart>;
const LazyChart = lazy(() => import("./fab-charts").then((m) => ({ default: m.Chart })));
export function Chart(props: ChartProps) {
  return <Suspense fallback={null}><LazyChart {...props} /></Suspense>;
}

// ---- <OrgSwitcher/> + <Members/> — multi-tenant (blueprint "orgs"). Code-split. organization/membership. ----
type OrgSwitcherProps = ComponentProps<typeof import("./fab-org").OrgSwitcher>;
const LazyOrgSwitcher = lazy(() => import("./fab-org").then((m) => ({ default: m.OrgSwitcher })));
export function OrgSwitcher(props: OrgSwitcherProps) {
  return <Suspense fallback={null}><LazyOrgSwitcher {...props} /></Suspense>;
}
type MembersProps = ComponentProps<typeof import("./fab-org").Members>;
const LazyMembers = lazy(() => import("./fab-org").then((m) => ({ default: m.Members })));
export function Members(props: MembersProps) {
  return <Suspense fallback={null}><LazyMembers {...props} /></Suspense>;
}
// <PairingGate/> (the door of the shared space / a couple by code) + <InviteCode/> (it shows the code). Code-split.
// The `useSpace()` (a hook, not a component) is re-exported directly — it needs the <PairingGate/>'s provider above it in the tree.
type PairingGateProps = ComponentProps<typeof import("./fab-org").PairingGate>;
const LazyPairingGate = lazy(() => import("./fab-org").then((m) => ({ default: m.PairingGate })));
export function PairingGate(props: PairingGateProps) {
  return <Suspense fallback={null}><LazyPairingGate {...props} /></Suspense>;
}
type InviteCodeProps = ComponentProps<typeof import("./fab-org").InviteCode>;
const LazyInviteCode = lazy(() => import("./fab-org").then((m) => ({ default: m.InviteCode })));
export function InviteCode(props: InviteCodeProps) {
  return <Suspense fallback={null}><LazyInviteCode {...props} /></Suspense>;
}

// ---- <CsvImport/> + <CsvExport/> — a CSV import/export over an existing collection (with no model of its own). Code-split. ----
type CsvImportProps = ComponentProps<typeof import("./fab-csv").CsvImport>;
const LazyCsvImport = lazy(() => import("./fab-csv").then((m) => ({ default: m.CsvImport })));
export function CsvImport(props: CsvImportProps) {
  return <Suspense fallback={null}><LazyCsvImport {...props} /></Suspense>;
}
type CsvExportProps = ComponentProps<typeof import("./fab-csv").CsvExport>;
const LazyCsvExport = lazy(() => import("./fab-csv").then((m) => ({ default: m.CsvExport })));
export function CsvExport(props: CsvExportProps) {
  return <Suspense fallback={null}><LazyCsvExport {...props} /></Suspense>;
}

// ---- <DocTemplate/> — a printable document (a receipt/certificate/report) → a PDF through printing. Code-split. ----
type DocTemplateProps = ComponentProps<typeof import("./fab-doc").DocTemplate>;
const LazyDocTemplate = lazy(() => import("./fab-doc").then((m) => ({ default: m.DocTemplate })));
export function DocTemplate(props: DocTemplateProps) {
  return <Suspense fallback={null}><LazyDocTemplate {...props} /></Suspense>;
}

// ---- <QRCode/> (it generates) + <QRScanner/> (it reads through the camera). Code-split (the `qrcode` lib only loads on the 1st use). ----
type QRCodeProps = ComponentProps<typeof import("./fab-qr").QRCode>;
const LazyQRCode = lazy(() => import("./fab-qr").then((m) => ({ default: m.QRCode })));
export function QRCode(props: QRCodeProps) {
  return <Suspense fallback={null}><LazyQRCode {...props} /></Suspense>;
}
type QRScannerProps = ComponentProps<typeof import("./fab-qr").QRScanner>;
const LazyQRScanner = lazy(() => import("./fab-qr").then((m) => ({ default: m.QRScanner })));
export function QRScanner(props: QRScannerProps) {
  return <Suspense fallback={null}><LazyQRScanner {...props} /></Suspense>;
}

// ---- <TwoFactor/> (the 2FA setup/verify) + <MagicLink/> (the "link sent" screen). Presentational. Code-split. ----
type TwoFactorProps = ComponentProps<typeof import("./fab-auth-extra").TwoFactor>;
const LazyTwoFactor = lazy(() => import("./fab-auth-extra").then((m) => ({ default: m.TwoFactor })));
export function TwoFactor(props: TwoFactorProps) {
  return <Suspense fallback={null}><LazyTwoFactor {...props} /></Suspense>;
}
type MagicLinkProps = ComponentProps<typeof import("./fab-auth-extra").MagicLink>;
const LazyMagicLink = lazy(() => import("./fab-auth-extra").then((m) => ({ default: m.MagicLink })));
export function MagicLink(props: MagicLinkProps) {
  return <Suspense fallback={null}><LazyMagicLink {...props} /></Suspense>;
}

// ---- <PdfReader/> — in-app PDF reading (saving the page + the bookmarks). Code-split (the react-pdf/pdf.js only on the 1st use). ----
type PdfReaderProps = ComponentProps<typeof import("./fab-pdf").PdfReader>;
const LazyPdfReader = lazy(() => import("./fab-pdf").then((m) => ({ default: m.PdfReader })));
export function PdfReader(props: PdfReaderProps) {
  return <Suspense fallback={null}><LazyPdfReader {...props} /></Suspense>;
}

// ---- <AgendaBoard/> — the provider's agenda (booking, the owner's side). Code-split. It complements the client's <SlotPicker/>. ----
type AgendaBoardProps = ComponentProps<typeof import("./fab-agenda").AgendaBoard>;
const LazyAgendaBoard = lazy(() => import("./fab-agenda").then((m) => ({ default: m.AgendaBoard })));
export function AgendaBoard(props: AgendaBoardProps) {
  return <Suspense fallback={null}><LazyAgendaBoard {...props} /></Suspense>;
}

// ---- <AvailabilityManager/> — the CRUD of the availability windows (booking, the owner's side). Code-split. The <SlotPicker/>'s pair. ----
type AvailabilityManagerProps = ComponentProps<typeof import("./fab-availability").AvailabilityManager>;
const LazyAvailabilityManager = lazy(() => import("./fab-availability").then((m) => ({ default: m.AvailabilityManager })));
export function AvailabilityManager(props: AvailabilityManagerProps) {
  return <Suspense fallback={null}><LazyAvailabilityManager {...props} /></Suspense>;
}

// ---- the card vault (the logged-in user's saved payment methods) ----
export type PayMethod = { id: string; brand: string; last4: string; exp_month?: number; exp_year?: number };
export const paymentMethods = {
  list: () => req<PayMethod[]>("GET", "/me/payment-methods"),
  setup: () => req<{ mode: string; client_secret?: string; customer_id: string }>("POST", "/me/payment-methods/setup"),
  // `billing`: what Pagar.me's antifraud requires to charge the card (CPF/CNPJ, phone, address); a bare string is the
  // CPF/CNPJ alone (the first shape). The other gateways ignore it.
  add: (token: string, billing?: BillingInput | string) =>
    req<PayMethod>("POST", "/me/payment-methods", { token, ...(typeof billing === "string" ? { document: billing } : billing ?? {}) }),
  remove: (id: string) => req<void>("DELETE", `/me/payment-methods/${encodeURIComponent(id)}`),
};

// Billing details. Pagar.me refuses a card charge unless the customer has a document, a phone and an address, and it
// refuses at CHARGE time, one field per attempt. The server answers what is still missing (`/me/billing-profile`)
// so the form asks for all of it at once, and only what the app does not already hold.
type BillingField = "document" | "phone" | "address" | "email";
type BillingAddress = { zip_code: string; street: string; number: string; neighborhood: string; city: string; state: string; complement?: string };
type BillingInput = { document?: string; phone?: string; address?: BillingAddress };
const billingProfile = {
  get: () => req<{ provider: string; missing: BillingField[] }>("GET", "/me/billing-profile"),
  save: (input: BillingInput) => req<{ provider: string; missing: BillingField[] }>("PUT", "/me/billing-profile", input),
};
const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");
/** A Brazilian phone with its area code: 10 or 11 digits, after dropping +55 or a leading trunk 0. It mirrors the
 *  server's check (`pagarme_customer.phone_fields`): what passes here must not come back as a 422 after the card
 *  was tokenized. */
function isBrPhone(value: string): boolean {
  let d = value.replace(/[^0-9]/g, "");
  if (value.trim().startsWith("+")) {
    if (!d.startsWith("55")) return false;
    d = d.slice(2);
  } else if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  else if ((d.length === 11 || d.length === 12) && d.startsWith("0")) d = d.slice(1);
  if (d.length !== 10 && d.length !== 11) return false;
  if (d.length === 11 && d[2] !== "9") return false;   // a 9-digit number is a mobile, and every mobile starts with 9
  return Number(d.slice(0, 2)) >= 11 && d[1] !== "0";
}
type BillingDraft = { doc: string; phone: string; zip: string; street: string; number: string; district: string; city: string; state: string; complement: string };
const EMPTY_BILLING: BillingDraft = { doc: "", phone: "", zip: "", street: "", number: "", district: "", city: "", state: "", complement: "" };

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") return resolve();
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script"); s.src = src; s.async = true;
    s.onload = () => resolve(); s.onerror = () => reject(new Error("falha ao carregar " + src));
    document.head.appendChild(s);
  });
}
async function fetchPayConfig(): Promise<{ provider: string; publishableKey: string } | null> {
  try {
    const c = await fetch(`${fabConfig.base}/projects/${fabConfig.project}/api/_config`).then((r) => r.json());
    if (c?.payments?.provider) return { provider: String(c.payments.provider), publishableKey: String(c.payments.publishableKey || "") };
  } catch { /* no config */ }
  return null;
}

/**
 * <PaymentMethods/> — the READY-MADE payment methods SCREEN (the saved cards) of the logged-in user. The card is collected
 * securely in the browser (Stripe.js Elements / a Pagar.me tokenization with the public key) — the number NEVER goes through our
 * server. A platform component: a screen takes it from `@/lib/fab-client` and uses it directly — do not recreate it.
 * (The path is named in prose, not as a ready import line: a file that shows an import of ITSELF gets that line copied
 * into itself on the next edit. See `ui/sonner.tsx`, and `test_self_import.py` for the 38 apps it cost.)
 */
export function PaymentMethods() {
  const T = useT();
  const [cards, setCards] = useState<PayMethod[]>([]);
  const [cfg, setCfg] = useState<{ provider: string; publishableKey: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const stripeRef = useRef<any>(null);           // eslint-disable-line @typescript-eslint/no-explicit-any
  const cardElRef = useRef<any>(null);           // eslint-disable-line @typescript-eslint/no-explicit-any
  const mpRef = useRef<any>(null);               // eslint-disable-line @typescript-eslint/no-explicit-any — the mercadopago.js instance
  const mpFieldsRef = useRef<any[]>([]);         // eslint-disable-line @typescript-eslint/no-explicit-any — MP's Secure Fields (iframes)
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [pg, setPg] = useState({ number: "", holder_name: "", exp_month: "", exp_year: "", cvv: "", doc: "" });
  const [bill, setBill] = useState<BillingDraft>(EMPTY_BILLING);
  const [missing, setMissing] = useState<BillingField[]>([]);
  // Until the server has answered what is missing, the Pagar.me card cannot be saved: saving it then would send no
  // billing details at all, and the buyer would only find out at subscribe.
  const [missingKnown, setMissingKnown] = useState(false);
  const [billBusy, setBillBusy] = useState(false);
  const [billError, setBillError] = useState("");
  const zipLookupRef = useRef("");               // the CEP of the latest lookup (drops an out-of-order answer)
  const zipFilledRef = useRef({ street: "", district: "", city: "", state: "" });   // what the last lookup filled in

  const refresh = useCallback(() => { paymentMethods.list().then(setCards).catch(() => setCards([])); }, []);
  // On a failed read every field is asked: an extra field costs a few seconds, a missing one costs the charge.
  const refreshMissing = useCallback(() => {
    billingProfile.get().then((r) => setMissing(r.missing || [])).catch(() => setMissing(["document", "phone", "address"]))
      .finally(() => setMissingKnown(true));
  }, []);
  useEffect(() => { let a = true; fetchPayConfig().then((c) => { if (a) { setCfg(c); setLoading(false); } }); refresh(); return () => { a = false; }; }, [refresh]);
  useEffect(() => { if (cfg?.provider === "pagarme") refreshMissing(); }, [cfg, refreshMissing]);

  /** The billing details the form shows, checked; throws the first problem in the buyer's language. */
  function billingInput(): BillingInput {
    const out: BillingInput = {};
    if (missing.includes("document")) {
      const taxId = normalizeTaxId(bill.doc);
      if (!isValidCpf(taxId) && !isValidCnpj(taxId)) throw new Error(T("pm.errTaxId"));
      out.document = taxId;
    }
    if (missing.includes("phone")) {
      if (!isBrPhone(bill.phone)) throw new Error(T("pm.errPhone"));
      out.phone = bill.phone;
    }
    if (missing.includes("address")) {
      const zip = bill.zip.replace(/\D/g, "");
      const uf = bill.state.trim().toUpperCase();
      if (zip.length !== 8 || !bill.street.trim() || !bill.number.trim() || !bill.district.trim() || !bill.city.trim() || !UFS.includes(uf)) {
        throw new Error(T("pm.errAddress"));
      }
      out.address = { zip_code: zip, street: bill.street.trim(), number: bill.number.trim(), neighborhood: bill.district.trim(),
        city: bill.city.trim(), state: uf, ...(bill.complement.trim() ? { complement: bill.complement.trim() } : {}) };
    }
    return out;
  }
  // The CEP fills the rest (ViaCEP, best effort). A field is filled when it is empty or still holds what the previous
  // lookup put there (a corrected CEP replaces the first one's street); what the buyer typed is never overwritten,
  // and a failure leaves the fields to the buyer.
  async function lookupZip(value: string) {
    const zip = value.replace(/\D/g, "");
    if (zip.length !== 8) return;
    zipLookupRef.current = zip;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${zip}/json/`).then((x) => x.json());
      if (zipLookupRef.current !== zip) return;   // a newer lookup started meanwhile: this answer is stale
      if (!r || r.erro) return;
      const prev = zipFilledRef.current;
      const next = { street: String(r.logradouro || ""), district: String(r.bairro || ""), city: String(r.localidade || ""), state: String(r.uf || "") };
      zipFilledRef.current = next;
      const pick = (cur: string, was: string, now: string) => (!cur || cur === was ? now || cur : cur);
      setBill((b) => ({ ...b, street: pick(b.street, prev.street, next.street), district: pick(b.district, prev.district, next.district),
        city: pick(b.city, prev.city, next.city), state: pick(b.state, prev.state, next.state) }));
    } catch { /* offline or blocked: typed by hand */ }
  }
  async function saveBilling() {
    setBillBusy(true); setBillError("");
    try {
      const r = await billingProfile.save(billingInput());
      setMissing(r.missing || []); setBill(EMPTY_BILLING);
    } catch (e) {
      setBillError((e instanceof Error ? e.message : "") || T("pm.errAdd"));
    } finally { setBillBusy(false); }
  }
  const input = "rounded-md border p-2 text-sm";
  const billingFields = (
    <>
      {missing.includes("document") && (
        <input className={input} inputMode="text" autoComplete="off" placeholder={T("pm.taxIdPh")} aria-label={T("pm.taxIdPh")} value={bill.doc} onChange={(e) => setBill({ ...bill, doc: formatTaxId(e.target.value) })} />
      )}
      {missing.includes("phone") && (
        <input className={input} type="tel" inputMode="tel" autoComplete="tel" placeholder={T("pm.phonePh")} aria-label={T("pm.phonePh")} value={bill.phone} onChange={(e) => setBill({ ...bill, phone: e.target.value })} />
      )}
      {missing.includes("address") && (
        <>
          <input className={input} inputMode="numeric" autoComplete="postal-code" placeholder={T("pm.zipPh")} aria-label={T("pm.zipPh")} value={bill.zip} onChange={(e) => setBill({ ...bill, zip: e.target.value })} onBlur={(e) => lookupZip(e.target.value)} />
          <input className={input} autoComplete="address-line1" placeholder={T("pm.streetPh")} aria-label={T("pm.streetPh")} value={bill.street} onChange={(e) => setBill({ ...bill, street: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <input className={input} placeholder={T("pm.addrNumberPh")} aria-label={T("pm.addrNumberPh")} value={bill.number} onChange={(e) => setBill({ ...bill, number: e.target.value })} />
            <input className={input} autoComplete="address-line2" placeholder={T("pm.complementPh")} aria-label={T("pm.complementPh")} value={bill.complement} onChange={(e) => setBill({ ...bill, complement: e.target.value })} />
          </div>
          <input className={input} placeholder={T("pm.districtPh")} aria-label={T("pm.districtPh")} value={bill.district} onChange={(e) => setBill({ ...bill, district: e.target.value })} />
          <div className="grid grid-cols-3 gap-2">
            <input className={`${input} col-span-2`} autoComplete="address-level2" placeholder={T("pm.cityPh")} aria-label={T("pm.cityPh")} value={bill.city} onChange={(e) => setBill({ ...bill, city: e.target.value })} />
            <input className={input} autoComplete="address-level1" maxLength={2} placeholder={T("pm.statePh")} aria-label={T("pm.statePh")} value={bill.state} onChange={(e) => setBill({ ...bill, state: e.target.value.toUpperCase() })} />
          </div>
        </>
      )}
      {missing.includes("email") && <p className="text-sm text-destructive">{T("pm.errEmail")}</p>}
    </>
  );
  const asksBilling = missing.some((f) => f !== "email");

  useEffect(() => {
    if (!adding || cfg?.provider !== "stripe" || !cfg.publishableKey) return;
    let alive = true;
    (async () => {
      await loadScript("https://js.stripe.com/v3");
      const Stripe = (window as unknown as { Stripe?: (k: string) => any }).Stripe;   // eslint-disable-line @typescript-eslint/no-explicit-any
      if (!alive || !Stripe) return;
      const stripe = stripeRef.current || Stripe(cfg.publishableKey);
      stripeRef.current = stripe;
      const el = stripe.elements().create("card");
      if (mountRef.current) { el.mount(mountRef.current); cardElRef.current = el; }
    })();
    return () => { alive = false; try { cardElRef.current?.unmount(); } catch { /* */ } };
  }, [adding, cfg]);

  // Mercado Pago = Secure Fields: the number/expiry/CVV live in MP's IFRAMES (PCI) — the PAN never touches the app's DOM.
  // We mount the 3 fields into the containers when the form opens (it mirrors the Stripe Elements).
  useEffect(() => {
    if (!adding || cfg?.provider !== "mercadopago" || !cfg.publishableKey) return;
    let alive = true;
    (async () => {
      await loadScript("https://sdk.mercadopago.com/js/v2");
      const MP = (window as unknown as { MercadoPago?: new (k: string) => any }).MercadoPago;   // eslint-disable-line @typescript-eslint/no-explicit-any
      if (!alive || !MP) return;
      const mp = mpRef.current || new MP(cfg.publishableKey);
      mpRef.current = mp;
      mpFieldsRef.current = [];
      const specs: [string, { placeholder: string }, string][] = [
        ["cardNumber", { placeholder: T("pm.numberPh") }, "fab-mp-number"],
        ["expirationDate", { placeholder: T("pm.mmPh") + "/" + T("pm.yyyyPh") }, "fab-mp-exp"],
        ["securityCode", { placeholder: T("pm.cvvPh") }, "fab-mp-cvv"],
      ];
      try {
        // it registers EACH mounted field BEFORE the next → if the 2nd/3rd fails, the cleanup still unmounts the ones that got in
        for (const [type, opts, id] of specs) mpFieldsRef.current.push(mp.fields.create(type, opts).mount(id));
      } catch { /* a partial mount: the cleanup unmounts whatever already got into the mpFieldsRef */ }
    })();
    return () => { alive = false; try { mpFieldsRef.current.forEach((f) => f?.unmount?.()); mpFieldsRef.current = []; } catch { /* */ } };
    // the T is recreated on every render (not stable) → out of the deps so it does not remount the iframes and lose what was already typed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adding, cfg]);

  async function addStripe() {
    const stripe = stripeRef.current, card = cardElRef.current;
    if (!stripe || !card) throw new Error(T("pm.errCardNotLoaded"));
    const { client_secret } = await paymentMethods.setup();
    const r = await stripe.confirmCardSetup(client_secret, { payment_method: { card } });
    if (r.error) throw new Error(r.error.message || T("pm.errSaveFailed"));
    await paymentMethods.add(String(r.setupIntent.payment_method));
  }
  async function addPagarme() {
    if (!cfg?.publishableKey) throw new Error(T("pm.errNoGateway"));
    // Checked BEFORE the card is tokenized: a token spent on a form that is then refused is a second card entry.
    const billing = billingInput();
    const r = await fetch(`https://api.pagar.me/core/v5/tokens?appId=${encodeURIComponent(cfg.publishableKey)}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "card", card: { number: pg.number.replace(/\s/g, ""), holder_name: pg.holder_name,
        exp_month: Number(pg.exp_month), exp_year: Number(pg.exp_year), cvv: pg.cvv } }),
    }).then((x) => x.json());
    if (!r?.id) throw new Error(T("pm.errCardInvalid"));
    await paymentMethods.add(String(r.id), billing);
    refreshMissing();
  }
  async function addMercadoPago() {
    // Secure Fields (v2): the number/expiry/CVV are read from MP's IFRAMES; here we only pass the name and the CPF (optional).
    // The token is the card's safe representation → we keep only the reference (the PAN never goes through our server).
    const mp = mpRef.current;
    if (!mp) throw new Error(T("pm.errCardNotLoaded"));
    const token = await mp.fields.createCardToken({
      cardholderName: pg.holder_name,
      ...(pg.doc.trim() ? { identificationType: "CPF", identificationNumber: pg.doc.replace(/\D/g, "") } : {}),
    });
    if (!token?.id) throw new Error(T("pm.errCardInvalid"));
    await paymentMethods.add(String(token.id));
  }
  async function submit() {
    setBusy(true); setError("");
    try {
      if (cfg?.provider === "stripe") await addStripe();
      else if (cfg?.provider === "mercadopago") await addMercadoPago();
      else if (cfg?.provider === "pagarme") await addPagarme();
      setAdding(false); setPg({ number: "", holder_name: "", exp_month: "", exp_year: "", cvv: "", doc: "" }); setBill(EMPTY_BILLING); refresh();
    } catch (e) {
      // the gateways reject in different ways: an Error (Stripe) or a list of {description}/{message} (MP/Pagar.me) → it extracts the useful msg
      const arr = Array.isArray(e) ? (e[0] as { description?: string; message?: string } | undefined) : undefined;
      setError((e instanceof Error ? e.message : arr?.description || arr?.message) || T("pm.errAdd"));
    } finally { setBusy(false); }
  }

  if (loading) return <div className="text-sm text-muted-foreground">{T("pm.loading")}</div>;
  if (!cfg) return <div className="text-sm text-muted-foreground">{T("pm.noConfig")}</div>;
  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {cards.map((c) => (
          <li key={c.id} className="flex items-center justify-between rounded-lg border p-3">
            <span className="text-sm">{(c.brand || T("pm.card")).toUpperCase()} •••• {c.last4}{c.exp_month ? ` — ${String(c.exp_month).padStart(2, "0")}/${c.exp_year}` : ""}</span>
            <button className="text-sm text-destructive hover:underline" onClick={() => paymentMethods.remove(c.id).then(refresh)}>{T("pm.remove")}</button>
          </li>
        ))}
        {cards.length === 0 && <li className="text-sm text-muted-foreground">{T("pm.empty")}</li>}
      </ul>
      {/* A saved card with billing details still missing (a card saved before the fields existed): completed here,
          without entering the card again. */}
      {cfg.provider === "pagarme" && cards.length > 0 && !adding && missing.length > 0 && (
        <div className="space-y-3 rounded-lg border p-4">
          <p className="text-sm font-medium">{T("pm.billingTitle")}</p>
          <div className="grid gap-2">{billingFields}</div>
          {billError && <p className="text-sm text-destructive">{billError}</p>}
          {asksBilling && (
            <button disabled={billBusy} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50" onClick={saveBilling}>{billBusy ? T("pm.saving") : T("ui.save")}</button>
          )}
        </div>
      )}
      {!adding ? (
        <button className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent" onClick={() => setAdding(true)}>{T("pm.add")}</button>
      ) : (
        <div className="space-y-3 rounded-lg border p-4">
          {cfg.provider === "stripe" ? (
            <div ref={mountRef} className="rounded-md border p-3" />
          ) : cfg.provider === "mercadopago" ? (
            <div className="grid gap-2">
              <input className="rounded-md border p-2 text-sm" placeholder={T("pm.holderPh")} value={pg.holder_name} onChange={(e) => setPg({ ...pg, holder_name: e.target.value })} />
              {/* MP's Secure Fields (iframes mounted in the useEffect) — the PAN/CVV never enter the app's DOM */}
              <div id="fab-mp-number" className="rounded-md border p-2 text-sm" style={{ minHeight: 38 }} />
              <div className="grid grid-cols-2 gap-2">
                <div id="fab-mp-exp" className="rounded-md border p-2 text-sm" style={{ minHeight: 38 }} />
                <div id="fab-mp-cvv" className="rounded-md border p-2 text-sm" style={{ minHeight: 38 }} />
              </div>
              <input className="rounded-md border p-2 text-sm" placeholder={T("pm.docPh")} value={pg.doc} onChange={(e) => setPg({ ...pg, doc: e.target.value })} />
            </div>
          ) : (
            <div className="grid gap-2">
              <input className="rounded-md border p-2 text-sm" placeholder={T("pm.numberPh")} value={pg.number} onChange={(e) => setPg({ ...pg, number: e.target.value })} />
              <input className="rounded-md border p-2 text-sm" placeholder={T("pm.holderPh")} value={pg.holder_name} onChange={(e) => setPg({ ...pg, holder_name: e.target.value })} />
              <div className="grid grid-cols-3 gap-2">
                <input className="rounded-md border p-2 text-sm" placeholder={T("pm.mmPh")} value={pg.exp_month} onChange={(e) => setPg({ ...pg, exp_month: e.target.value })} />
                <input className="rounded-md border p-2 text-sm" placeholder={T("pm.yyyyPh")} value={pg.exp_year} onChange={(e) => setPg({ ...pg, exp_year: e.target.value })} />
                <input className="rounded-md border p-2 text-sm" placeholder={T("pm.cvvPh")} value={pg.cvv} onChange={(e) => setPg({ ...pg, cvv: e.target.value })} />
              </div>
              {billingFields}
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button disabled={busy || (cfg.provider === "pagarme" && !missingKnown)} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50" onClick={submit}>{busy ? T("pm.saving") : T("pm.save")}</button>
            <button className="rounded-lg border px-4 py-2 text-sm" onClick={() => { setAdding(false); setError(""); }}>{T("pm.cancel")}</button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * InstallPrompt — the "add to home screen" banner (PWA). On Android/desktop it uses the native `beforeinstallprompt`
 * (an "Install" button); on iOS Safari (which does not expose the event) it shows the instruction "Share → Add to Home
 * Screen". Dismissible (it remembers in the localStorage). Already installed / a standalone display → it does not appear. It is optional:
 * put an `<InstallPrompt/>` once in the layout if you want to encourage the installation (push on iOS requires installing).
 */
export function InstallPrompt({ className, title, hint, iosText, cta }: {
  className?: string; title?: string; hint?: string; iosText?: string; cta?: string;
}) {
  // the texts come from the app's locale (`fab-i18n`), each one overridable by its prop: the English defaults
  // shipped into Portuguese apps as "Install this app"
  const tr = useT();
  const [deferred, setDeferred] = useState<{ prompt: () => void } | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [gone, setGone] = useState(true);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches
      || (window.navigator as { standalone?: boolean }).standalone === true;
    if (standalone || localStorage.getItem("fab_install_dismissed") === "1") return;
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && /safari/i.test(navigator.userAgent);
    const onBip = (e: Event) => { e.preventDefault(); setDeferred(e as unknown as { prompt: () => void }); setGone(false); };
    window.addEventListener("beforeinstallprompt", onBip);
    if (isIOS) { setIosHint(true); setGone(false); }   // iOS does not fire the event → a manual instruction
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);
  if (gone) return null;
  const dismiss = () => { localStorage.setItem("fab_install_dismissed", "1"); setGone(true); };
  return (
    <div className={["fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl border bg-background p-3 shadow-lg", className].filter(Boolean).join(" ")}>
      <div className="flex-1 text-sm">
        <div className="font-semibold">{tr("ip.title", title)}</div>
        <div className="text-muted-foreground text-xs">{iosHint ? tr("ip.ios", iosText) : tr("ip.hint", hint)}</div>
      </div>
      {!iosHint && deferred && <button onClick={() => deferred.prompt()} className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">{tr("ip.cta", cta)}</button>}
      <button onClick={dismiss} aria-label={tr("ui.close")} className="text-muted-foreground px-1 text-lg leading-none">{"\u00d7"}</button>
    </div>
  );
}

// The video: the source's classification lives in `fab-video.ts` (pure TS, with no JSX → testable with node --test).
export { videoSource, type VideoSource } from "./fab-video";
