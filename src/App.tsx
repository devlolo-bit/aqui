import { Component, useEffect, type ReactNode } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import { FabProvider } from "@/lib/fab-client";
import { FabInspector } from "@/lib/fab-inspector";
import { AppRoutes } from "./routes";

type PreviewErrorKind = "render" | "runtime" | "console" | "network" | "locked";

// A preview build (VITE_FAB_PREVIEW, written by the materialize) inside an iframe. The published app framed by another
// site is embedded too, and must post nothing: the console can carry the app's own data.
const embeddedInStudio = typeof window !== "undefined" && window.parent !== window
  && String(import.meta.env.VITE_FAB_PREVIEW || "") === "1";
const reported = new Set<string>();

/**
 * What the app's browser console saw, sent to the Studio so the assistant can diagnose it (`fab-error`). Only a
 * preview build inside an iframe: the published app reports nothing, framed or not. The query string and hash are cut from
 * URLs because they carry tokens and search terms, and one message is sent once per page load.
 */
function reportToStudio(kind: PreviewErrorKind, message: string, url?: string) {
  if (!embeddedInStudio) return;
  const text = String(message || "").slice(0, 500);
  // "Script error." is all a cross-origin script is allowed to say: nothing to diagnose, and never the app's code.
  if (!text || text === "Script error." || reported.size > 40) return;
  const key = `${kind}:${text}:${url ?? ""}`;
  if (reported.has(key)) return;
  reported.add(key);
  try {
    window.parent.postMessage({ type: "fab-error", kind, message: text, url, route: window.location.pathname }, "*");
  } catch { /* no parent */ }
}

function bareUrl(input: RequestInfo | URL): string {
  try {
    const u = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, window.location.href);
    return u.origin + u.pathname;
  } catch { return ""; }
}

/**
 * Installed once, when the module loads and before the first render, so an error thrown while the app starts is not
 * lost. Three things the RouteErrorBoundary never sees:
 *  - errors outside the render (async handlers, rejected promises);
 *  - `console.error`, where most generated code sends the error it caught;
 *  - a `fetch` that fails before any response (the browser blocked it, almost always CORS, and the console message
 *    naming CORS cannot be read from JavaScript) or that the platform refused with 403 `feature_locked`.
 */
if (embeddedInStudio) {
  // The Studio took the errors (sent to the assistant, or dismissed): the same failure may be reported again.
  window.addEventListener("message", (e) => {
    if (e.source === window.parent && (e.data as { type?: string } | null)?.type === "fab-errors-ack") reported.clear();
  });
  window.addEventListener("error", (e) => reportToStudio("runtime", e.message || String(e.error)));
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason as { message?: string } | undefined;
    reportToStudio("runtime", (r && (r.message || String(r))) || "unhandled promise rejection");
  });
  const consoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    try {
      const text = args.map((a) => a instanceof Error ? a.message : typeof a === "string" ? a : JSON.stringify(a)).join(" ");
      reportToStudio("console", text);
    } catch { /* an argument that cannot be printed is still logged below */ }
    consoleError(...args);
  };
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let res: Response;
    try {
      res = await nativeFetch(input, init);
    } catch (err) {
      if ((err as { name?: string })?.name !== "AbortError") {
        reportToStudio("network", String((err as { message?: string })?.message || err), bareUrl(input));
      }
      throw err;
    }
    if (res.status === 403) {
      res.clone().json().then((body: { detail?: { error?: string; feature?: string } }) => {
        if (body?.detail?.error === "feature_locked") {
          reportToStudio("locked", `feature_locked: ${body.detail.feature ?? ""}`, bareUrl(input));
        }
      }).catch(() => { /* not JSON: not the platform's refusal */ });
    }
    return res;
  };
}

/**
 * A RUNTIME safety net: a screen that blows up while rendering (e.g. a wrongly imported component → "Element type
 * is invalid", React #130) does NOT bring the whole app down into a blank screen with a minified error. It shows a friendly fallback
 * (with a "back to home") and, when embedded in the Studio (the preview), it shows the error's REAL MESSAGE for the author to fix
 * and it reports it to the parent (`reportToStudio`). It stays INSIDE the Router, wrapping only the generated routes.
 */
class RouteErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) {
    const msg = String(error?.message || error);
    reportToStudio("render", msg);
    // a global mark so the RENDER QA (layer 4) detects the crash EVEN when it is caught here (otherwise the boundary "hides"
    // the error from the headless's pageerror and the gate thinks it rendered fine). Harmless in production (just a prop on the window).
    try { (window as unknown as { __FAB_RENDER_ERROR__?: string }).__FAB_RENDER_ERROR__ = msg; } catch { /* noop */ }
  }
  render() {
    if (!this.state.error) return this.props.children;
    const embedded = typeof window !== "undefined" && window.parent !== window;
    return (
      <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "var(--fab-font, system-ui, sans-serif)" }}>
        <div style={{ maxWidth: 520, textAlign: "center" }}>
          <div style={{ fontSize: 40, lineHeight: 1 }}>⚠️</div>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: "14px 0 6px", color: "#1f2937" }}>Something went wrong on this page</h1>
          <p style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>The other pages still work. Try going back to the start.</p>
          {embedded && (
            <pre style={{ marginTop: 14, textAlign: "left", background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 8, padding: 12, fontSize: 12, color: "#7c3aed", overflow: "auto", whiteSpace: "pre-wrap" }}>{String(this.state.error?.message || this.state.error)}</pre>
          )}
          <button onClick={() => { window.location.href = "/"; }}
            style={{ marginTop: 16, padding: "9px 20px", borderRadius: 8, border: "none", background: "var(--fab-primary, #742FC2)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            Back to home
          </button>
        </div>
      </div>
    );
  }
}

/**
 * The bridge with the Studio: the preview embeds this app in an <iframe>. On every route change, we post the current route to the
 * parent (window.parent.postMessage) — the Studio listens for the 'fab-route' to sync the URL bar / the navigation.
 * A no-op when there is no parent (the app opened directly). It stays INSIDE the BrowserRouter (it uses useLocation).
 */
function RouteBridge() {
  const location = useLocation();
  useEffect(() => {
    // Google Analytics 4 (an SPA): the gtag's loader is injected into the <head> at build time with `send_page_view:false` (exposing
    // the window.__FAB_GA_ID__); since client-side navigation does NOT reload the page, we fire the `page_view` on every
    // route by hand — otherwise the GA would only count the 1st load. The firing is DEFERRED by a tick (a setTimeout 0): this
    // RouteBridge is a sibling BEFORE the <AppRoutes/>, so without the deferral the `document.title` would still be the PREVIOUS
    // route's (the new page sets the title in its own effect). A no-op when the GA is not configured; wrapped
    // in a try/catch: analytics can never break the navigation.
    const path = location.pathname + location.search;
    const gaTimer = setTimeout(() => {
      try {
        const w = window as unknown as { __FAB_GA_ID__?: string; gtag?: (...a: unknown[]) => void; __FAB_FB_PIXEL__?: boolean; fbq?: (...a: unknown[]) => void };
        if (w.__FAB_GA_ID__ && typeof w.gtag === "function") {
          w.gtag("event", "page_view", {
            page_location: window.location.href,
            page_path: path,
            page_title: document.title,
          });
        }
        // The Meta Pixel (build time): the snippet does an `init` with no PageView; we fire a PageView per route here (an SPA). The
        // __FAB_FB_PIXEL__ flag guarantees we only fire when WE were the ones who injected the pixel.
        if (w.__FAB_FB_PIXEL__ && typeof w.fbq === "function") w.fbq("track", "PageView");
      } catch { /* analytics never breaks the navigation */ }
    }, 0);
    try {
      window.parent?.postMessage(
        { type: "fab-route", path: location.pathname + location.search + location.hash },
        "*",
      );
    } catch {
      /* cross-origin/no parent — silent */
    }
    return () => clearTimeout(gaTimer);   // a fast navigation before the tick → it does not fire a page_view for a route already changed
  }, [location]);
  return null;
}

// The platform's root: the Router + the auth/theme/toaster provider (the <Toaster/> already comes inside the <FabProvider>) +
// the routes GENERATED by the AI (src/routes.tsx). The App.tsx does NOT know the screens — it only imports the `AppRoutes`.
export default function App() {
  return (
    <BrowserRouter>
      {/* the app's locale (injected at build time from schema.locale = the app's country/language, default = the locale
          of whoever created it) → the i18n of the ready-made pieces + formatDate/formatDateTime. Empty → "en". */}
      <FabProvider locale={(import.meta.env.VITE_FAB_LOCALE || "en").trim()}>
        <RouteBridge />
        <FabInspector />
        <RouteErrorBoundary>
          <AppRoutes />
        </RouteErrorBoundary>
      </FabProvider>
    </BrowserRouter>
  );
}
