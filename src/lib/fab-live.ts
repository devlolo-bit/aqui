/**
 * The live-updates connection of a browser tab: ONE server stream shared by every `useLive` on the screen.
 *
 * WHY (2026-10-27). The SDK used to open one EventSource per `useLive` hook, and the control-plane caps a project at
 * 8 open streams per instance (`bulkhead.CAP_STREAMS`). A staff screen with four live lists, open in two tabs (or by
 * two people), is already eight, so opening the screen got a 429 on the ninth (seen on the Veritas BPO homologation
 * app). And a 429 is fatal to an EventSource: the browser closes it for good and never retries, so that list stayed
 * on polling for the life of the screen. Here:
 *
 *   • every hook of the tab rides one `GET /api/_stream?s=<model>?<filter>&s=…` (hooks with the same model AND
 *     filter share one subscription), so a tab holds one stream however many lists it shows;
 *   • the set of subscriptions is applied after a short batch, so a screen mounting six hooks (and StrictMode's
 *     mount → unmount → mount) opens ONE connection, and a re-render that keeps the same subscriptions opens none;
 *   • a stream the browser gave up on (a non-200: 429, 401 after the session renewed, a network failure) is reopened
 *     here with exponential backoff and jitter, and the lists ask for a full resync when it comes back;
 *   • a tab hidden for 30 s closes its stream (the polling already pauses when hidden), so tabs left open in the
 *     background stop holding the project's slots; it reopens, with a full resync, when the tab comes back.
 *
 * A list counts as live only when the server's `{"ok":[…]}` frame names its subscription — not on `onopen`. The
 * server's refusal of a stream over the cap is a `200` that ends at once (so old SDKs reconnect later instead of
 * giving up), and it must not be mistaken for a connection.
 *
 * A module of its own, with the browser passed in, so it can be exercised by a test (`tests/fab-live.test.ts`):
 * `fab-client.tsx` imports React and cannot be.
 */

/** Keep equal to `appapi/router.py::_LIVE_MAX_SUBS`: above it a tab opens one more stream. */
export const LIVE_MAX_SUBS = 32;
/** How long a hidden tab keeps its stream (a quick switch of tabs should not pay a reconnect). */
export const HIDDEN_CLOSE_MS = 30_000;
/** How long subscription changes are gathered before the connection is rebuilt. */
export const BATCH_MS = 30;
const BACKOFF_BASE_MS = 2_000;
const BACKOFF_MAX_MS = 120_000;

export type LiveRecord = { id: string; _deleted?: boolean; [k: string]: unknown };

export type LiveListener = {
  model: string;
  /** The filter part of the list query, already encoded (`filter.status=open&filter.total.gte=10`); "" = none. */
  query: string;
  onRecord: (rec: LiveRecord) => void;
  /** `connected` = the server confirmed this subscription; `resync` = there was a long gap, refetch everything. */
  onState: (connected: boolean, resync: boolean) => void;
};

/** The part of an EventSource used here. */
export type EventSourceLike = {
  readyState: number;
  onmessage: ((e: { data: string }) => void) | null;
  onerror: ((e: unknown) => void) | null;
  close(): void;
};

export type LiveEnv = {
  EventSource: new (url: string) => EventSourceLike;
  /** The stream URL for these subscription keys (the base, the project and the CURRENT token). */
  url: (keys: string[]) => string;
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (t: unknown) => void;
  random?: () => number;
  /** Who the stream is for (the current token, or "" for a guest). A connection opened for someone else is
   *  rebuilt: the browser's own reconnect reuses the URL it was opened with, token included, so without this a
   *  tab that logged out (or in as another person) kept the previous person's stream, and their records. */
  ident?: () => string;
  doc?: { hidden: boolean; addEventListener(type: "visibilitychange", fn: () => void): void } | null;
};

const CLOSED = 2;   // EventSource.CLOSED: the browser will not reconnect on its own

/** The wait before reopening attempt `n` (1-based): doubling from 2 s up to 2 min, with "equal jitter" (half fixed,
 *  half random), so the tabs that lost their stream together do not come back together. */
export function backoffMs(attempt: number, random: () => number = Math.random): number {
  const ceil = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** Math.max(0, attempt - 1));
  return Math.round(ceil / 2 + random() * (ceil / 2));
}

/** The subscription key: what the server receives as one `s=` and what decides which hooks share a subscription. */
export function subKey(model: string, query: string): string {
  return query ? `${model}?${query}` : model;
}

type Conn = {
  id: string;
  who: string;
  keys: string[];
  es: EventSourceLike | null;
  ok: Set<number>;
  attempt: number;
  retry: unknown;
  resync: boolean;
  dead: boolean;
};

export type LiveHub = {
  subscribe(l: LiveListener): () => void;
  /** For tests and diagnostics: the open connections' subscription keys. */
  connections(): string[][];
};

export function createLiveHub(env: LiveEnv): LiveHub {
  const random = env.random ?? Math.random;
  const ident = env.ident ?? (() => "");
  const listeners = new Map<string, Set<LiveListener>>();
  let conns: Conn[] = [];
  let batch: unknown = null;
  let hiddenTimer: unknown = null;
  let parked = false;        // the streams were closed because the tab is hidden
  let resyncNext = false;    // the next connections come after a gap → the lists refetch everything
  let docBound = false;

  const each = (c: Conn, idx: Iterable<number>, fn: (l: LiveListener) => void) => {
    for (const i of idx) for (const l of listeners.get(c.keys[i]) ?? []) fn(l);
  };
  const allIdx = (c: Conn) => c.keys.map((_k, i) => i);

  function open(c: Conn) {
    c.ok = new Set();
    c.who = ident();
    let es: EventSourceLike;
    try { es = new env.EventSource(env.url(c.keys)); } catch { c.es = null; return; }
    c.es = es;
    es.onmessage = (e) => {
      if (c.dead) return;
      let msg: { ok?: number[]; s?: number[]; r?: LiveRecord } | null = null;
      try { msg = JSON.parse(e.data); } catch { return; }
      if (!msg || typeof msg !== "object") return;
      if (Array.isArray(msg.ok)) {
        c.attempt = 0;
        const resync = c.resync;
        c.resync = false;
        c.ok = new Set(msg.ok);
        each(c, msg.ok, (l) => l.onState(true, resync));
        return;
      }
      if (Array.isArray(msg.s) && msg.r && typeof msg.r === "object") {
        const rec = msg.r;
        each(c, msg.s, (l) => l.onRecord(rec));
      }
    };
    es.onerror = () => {
      if (c.dead) return;
      c.ok = new Set();
      each(c, allIdx(c), (l) => l.onState(false, false));   // the polling is the transport until it is back
      if (c.who !== ident()) {
        // The session changed since this stream opened (a logout, a login as someone else): the browser would
        // reconnect with the OLD token. Rebuilt now, for the current person, after the usual short batch.
        try { es.close(); } catch { /* */ }
        c.es = null;
        resyncNext = true;
        schedule();
        return;
      }
      if (es.readyState === CLOSED) {
        // A non-200 or a failure the browser gave up on: it will not retry. A normal end (the server's lifetime,
        // or its "busy" refusal) leaves it CONNECTING, and the browser reconnects after the `retry:` it was sent.
        try { es.close(); } catch { /* */ }
        c.es = null;
        c.attempt++;
        c.resync = true;
        c.retry = env.setTimeout(() => { c.retry = null; if (!c.dead && !parked) open(c); }, backoffMs(c.attempt, random));
      }
    };
  }

  function close(c: Conn) {
    c.dead = true;
    if (c.retry != null) { env.clearTimeout(c.retry); c.retry = null; }
    if (c.es) { try { c.es.close(); } catch { /* */ } c.es = null; }
  }

  function sync() {
    batch = null;
    if (parked) return;
    const keys = [...listeners.keys()].sort();
    const want = new Map<string, string[]>();
    for (let i = 0; i < keys.length; i += LIVE_MAX_SUBS) {
      const chunk = keys.slice(i, i + LIVE_MAX_SUBS);
      want.set(chunk.join("\n"), chunk);
    }
    const next: Conn[] = [];
    const who = ident();
    for (const c of conns) {
      if (want.has(c.id) && c.who === who) { next.push(c); want.delete(c.id); continue; }
      // the lists that stay subscribed move to a new connection: they are not live until its `ok` frame
      if (!c.dead) each(c, [...c.ok], (l) => l.onState(false, false));
      close(c);
    }
    for (const [id, chunk] of want) {
      const c: Conn = { id, who, keys: chunk, es: null, ok: new Set(), attempt: 0, retry: null, resync: resyncNext, dead: false };
      next.push(c);
      open(c);
    }
    resyncNext = false;
    conns = next;
  }

  function schedule() {
    if (batch == null) batch = env.setTimeout(sync, BATCH_MS);
  }

  function park() {
    hiddenTimer = null;
    parked = true;
    for (const c of conns) {
      each(c, allIdx(c), (l) => l.onState(false, false));
      close(c);
    }
    conns = [];
    resyncNext = true;
  }

  function bindDoc() {
    const doc = env.doc;
    if (docBound || !doc) return;
    docBound = true;
    doc.addEventListener("visibilitychange", () => {
      if (doc.hidden) {
        if (hiddenTimer == null && !parked) hiddenTimer = env.setTimeout(park, HIDDEN_CLOSE_MS);
      } else {
        if (hiddenTimer != null) { env.clearTimeout(hiddenTimer); hiddenTimer = null; }
        if (parked) { parked = false; sync(); }
      }
    });
  }

  return {
    subscribe(l) {
      bindDoc();
      const key = subKey(l.model, l.query);
      let set = listeners.get(key);
      if (!set) { set = new Set(); listeners.set(key, set); }
      set.add(l);
      // Always: a screen that mounts after a login/logout re-checks who the open streams are for (`ident`); with
      // the same keys and the same person the sync is a no-op.
      schedule();
      // A hook joining a subscription that is already live: no reconnect, and it is live at once.
      for (const c of conns) {
        const i = c.keys.indexOf(key);
        if (i >= 0 && c.ok.has(i)) l.onState(true, false);
      }
      let done = false;
      return () => {
        if (done) return;
        done = true;
        const s = listeners.get(key);
        if (!s) return;
        s.delete(l);
        if (!s.size) { listeners.delete(key); schedule(); }
      };
    },
    connections: () => conns.filter((c) => !c.dead).map((c) => c.keys.slice()),
  };
}
