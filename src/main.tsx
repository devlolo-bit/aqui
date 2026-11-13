import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// The SPA's bootstrap: it mounts the <App/> on the #root. The whole app (the routes + the SDK) runs in the visitor's browser.
//
// NO <StrictMode>, on purpose. The editor preview is a `vite dev` server, and in development StrictMode runs every
// effect twice (mount, unmount, mount again); a production build does not. Generated code that is not idempotent
// under that double run then breaks in the preview and works once published, so the owner judges the app by a screen
// the visitor never sees. It happened on 2026-09-22: a scroll-reveal ported from a Claude Design export hid every
// `[data-reveal]` element on the first run, its cleanup dropped the observer before it fired, and the second run
// skipped the elements it had already marked, so the hero text never appeared in the preview.
createRoot(document.getElementById("root")!).render(<App />);
// The Web Push service worker is registered ON DEMAND (in enablePush) — apps that do not use push create no SW.
