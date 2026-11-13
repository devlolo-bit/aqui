import { defineConfig, loadEnv, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs";
import path from "node:path";
import { lazyRoutes } from "./lazy-routes";
import { enabledPlugins, fabCssGuard, loadVitePlugins, prebundleIncludes, type PluginManifest } from "./fab-plugins";

// The VISUAL EDITING Babel plugin: it stamps every JSX element of the GENERATED app with a `data-fab-loc="src/file:line"`
// (and a `data-fab-name` = the component-tag's name), so the Studio can map a click in the preview → the spot in the source.
// ONLY the app's EDITABLE code: it always skips node_modules and the IMMUTABLE SDK/vault layer (fab-client/fab-sdk/fab-inspector
// + utils/i18n/rich-text/video). The shadcn ones (src/components/ui) and the fab-*.tsx pieces:
//   • the `platform` mode (curated): a black box → NOT tagged (the AI uses a <Component/> but does not edit it);
//   • the `app-owned` mode (Base44): they become editable APP CODE → tagged (selectable in the visual editor).
// Active ONLY on the `preview` channel (see the gate below): the published app (production) comes out clean, with no inspection attributes.
const IMMUTABLE_LIB_TSX = new Set(["fab-client.tsx", "fab-sdk.tsx", "fab-inspector.tsx"]);  // the SDK/vault layer + the inspection bridge — never editable
function fabLocPlugin({ types: t }: { types: typeof import("@babel/types") }, opts: { appOwned?: boolean } = {}) {
  const appOwned = opts.appOwned === true;
  return {
    name: "fab-loc",
    visitor: {
      JSXOpeningElement(pathNode: any, state: any) {
        const fn: string = state.filename || state.file?.opts?.filename || "";
        const i = fn.lastIndexOf("/src/");
        if (i < 0 || fn.includes("/node_modules/")) return;
        const rel = fn.slice(i + 1); // "src/…"
        // src/lib: only the seeded PIECES (the editable fab-*.tsx, in app-owned) are tagged; the SDK/vault/utils/i18n/
        // the rich-text/video stay ALWAYS opaque (provided/immutable).
        if (rel.startsWith("src/lib/")) {
          const base = rel.slice("src/lib/".length);
          const seedablePiece = appOwned && /^fab-.*\.tsx$/.test(base) && !IMMUTABLE_LIB_TSX.has(base);
          if (!seedablePiece) return;
        } else if (rel.startsWith("src/components/ui/")) {
          if (!appOwned) return; // platform: a shadcn black box; app-owned: editable → it tags it
        }
        const loc = pathNode.node.loc;
        if (!loc) return;
        const attrs = pathNode.node.attributes;
        if (attrs.some((a: any) => a.name && a.name.name === "data-fab-loc")) return; // idempotente
        // It INSERTS at the START (right after the element's name), BEFORE the source's attributes. In JSX the LAST attribute/spread
        // wins: if a call site forwards the loc through a `{...rest}` (e.g. the app-image.tsx's `<img {...rest}/>`), that spread —
        // by coming later — overrides the plugin's literal, preserving the call site's loc (essential for the persistence
        // of the swap in app-owned mode). If we put it at the end (a push), the plugin's literal would win and break the forwarding.
        const injected: any[] = [
          t.jsxAttribute(t.jsxIdentifier("data-fab-loc"), t.stringLiteral(`${rel}:${loc.start.line}`)),
        ];
        // the tag's name (e.g. "Button", "div") — a type hint for the float box; only for identifiable tags.
        const nameNode = pathNode.node.name;
        const tag = nameNode?.type === "JSXIdentifier" ? nameNode.name
          : nameNode?.type === "JSXMemberExpression" && nameNode.property?.name ? nameNode.property.name : "";
        if (tag) injected.push(t.jsxAttribute(t.jsxIdentifier("data-fab-name"), t.stringLiteral(tag)));
        attrs.unshift(...injected);  // it preserves the [data-fab-loc, data-fab-name] order at the start
      },
    },
  };
}

// The GENERATED app's config (a Vite SPA, purely client-side). The AI's untrusted code runs ONLY in the visitor's
// browser — no server-side execution. Tailwind v4 comes in through the plugin (with no postcss.config). The `@` alias
// points at `/src` (the same contract as the previous Next template's: `@/components`, `@/lib`, ...).
export default defineConfig(async ({ mode }): Promise<UserConfig> => {
  // The FAB_CHANNEL is written by the materialize into the workspace's `.env` (preview|production). With no VITE_ prefix → it is NOT
  // embedded in the client's bundle; read here only to decide the visual editing tagging (preview only).
  const env = loadEnv(mode, process.cwd(), "");
  const isPreview = env.FAB_CHANNEL === "preview";
  // The FAB_APP_OWNED (written by the materialize, with NO VITE_ prefix): in the Base44 pivot the shadcn/pieces are the app's code →
  // the plugin tags them for the visual editor. Empty/0 = the platform mode (curated, black-box).
  const appOwned = env.FAB_APP_OWNED === "1" || env.FAB_APP_OWNED === "true";
  const reactPlugin = isPreview ? react({ babel: { plugins: [[fabLocPlugin, { appOwned }]] } }) : react();
  // THE HOT PREVIEW (`FAB_DEV=1`, written by the materialize when the app is served by a `vite dev` inside the
  // build sandbox instead of a static build). The dev server is reached through the sandbox's port proxy, on the
  // public hostname of the preview, over TLS:
  //   • `host: 0.0.0.0` so the proxy inside the container reaches it (127.0.0.1 would be invisible to it);
  //   • `allowedHosts: true`: Vite 6+ refuses a Host header it does not know, and the proxied hostname is not
  //     localhost. The container is only reachable through that proxy, so the check protects nothing here;
  //   • `hmr`: the browser opens the HMR WebSocket against `location.hostname` (no `host` set, on purpose, so the
  //     same config works for any preview hostname) on the proxy's port (443), over wss. Without this the client
  //     would try ws://<host>:5173, which nothing answers, and every edit would be a silent full reload at best.
  const hot = env.FAB_DEV === "1";
  const hmrProtocol = env.FAB_DEV_HMR_PROTOCOL || "wss";
  const hmrPort = Number(env.FAB_DEV_HMR_PORT || 443);
  // BUILD PLUGINS (see fab-plugins.ts): only the allowed ones the app declared in its package.json, with our options.
  const readJson = (f: string) => JSON.parse(fs.readFileSync(path.resolve(__dirname, f), "utf8"));
  const pkg = readJson("package.json");
  const allowed = enabledPlugins(readJson("fab-plugins.json") as PluginManifest, pkg);
  const extraPlugins = await loadVitePlugins(allowed);
  const buildTarget = allowed.find((p) => p.buildTarget)?.buildTarget;
  return {
    // fabCssGuard FIRST: it has to see every stylesheet before Tailwind loads the modules its directives name.
    // lazyRoutes before React (it declares `enforce: "pre"` anyway): it rewrites src/routes.tsx into React.lazy +
    // Suspense while the file is still JSX, so the app ships one chunk per route instead of a single bundle.
    plugins: [fabCssGuard(allowed, path.resolve(__dirname, "src/index.css")), lazyRoutes(), reactPlugin, tailwindcss(), ...extraPlugins],
    // An INLINE postcss config switches off Vite's search for a `postcss.config.*`, which is JavaScript it would
    // otherwise load from the workspace. Tailwind v4 comes in through its Vite plugin and needs no PostCSS step.
    css: { postcss: {} },
    // Only when an allowed plugin asks for it (wasm: top-level await); every other app keeps Vite's default.
    ...(buildTarget ? { build: { target: buildTarget } } : {}),
    // THE DEV SERVER PRE-BUNDLES EVERY DEPENDENCY UP FRONT (see prebundleIncludes): no discovery while serving, no
    // second optimize, and a cache key the preview image can reproduce with `vite optimize` so a new container's
    // first load finds the bundle on disk. Dev only; the build ignores optimizeDeps.
    optimizeDeps: { include: prebundleIncludes(pkg), ...(buildTarget ? { esbuildOptions: { target: buildTarget } } : {}) },
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
    server: hot
      ? { host: "0.0.0.0", port: 5173, strictPort: true, allowedHosts: true,
          hmr: { protocol: hmrProtocol, clientPort: hmrPort },
          // the entry modules are transformed as soon as the server is up, not when the first browser asks: the
          // SDK alone is 2k lines and the stylesheet is a Tailwind compile, and the container has one vCPU
          warmup: { clientFiles: ["./src/main.tsx", "./src/App.tsx", "./src/routes.tsx", "./src/index.css", "./src/lib/fab-client.tsx"] } }
      // 127.0.0.1: the local preview embeds the app in a local iframe — a fixed host avoids a 0.0.0.0/IPv6 bind surprise.
      : { host: "127.0.0.1" },
  };
});
