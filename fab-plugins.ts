/**
 * BUILD PLUGINS: a closed list, and the one place that runs code at build time.
 *
 * A Vite or Tailwind plugin is Node code executed INSIDE the build. That is what makes it useful and what makes it
 * dangerous: a plugin can rewrite any module on its way to the bundle, including the provided files the app may not
 * touch (`fab-client.tsx`, the card vault, `fab-shell.ts`, `rich-text-sanitize.ts`), and until the sandbox's egress
 * allowlist exists it can also talk to the network. So the app never loads a plugin itself. It DECLARES the package
 * in its `package.json`, and this file registers it only when the package is on `fab-plugins.json`, with options WE
 * chose. A declared package that is not on the list is installed like any other dependency and never executed.
 *
 * THE THREE DOORS THIS CLOSES, all verified to run arbitrary code on 2026-09-23 before this existed:
 *   • `vite.config.js` at the root: Vite looks for `.js` BEFORE `.ts`, so an app file replaced this config whole
 *     (and with it the `@` alias, the lazy routes and the visual editor tagging). Closed by `--config` on every
 *     build command and by the write guard (services/lib/safe.mjs), not here;
 *   • `postcss.config.js`: Vite loads it on its own unless `css.postcss` is set inline, which vite.config now does;
 *   • `@plugin "./x.js"` / `@config` in ANY stylesheet: Tailwind v4 imports the module it names. A relative path
 *     was enough, with no npm package involved. `fabCssGuard` below strips both from every stylesheet except
 *     `src/index.css`, and appends the allowed directives (the list's `directive`) to that one.
 *
 * A stylesheet that Tailwind INLINES through `@import` is read from disk by Tailwind itself, past Vite's transform
 * and past this guard. For the app's own files that is covered by the write guard, which strips the same directives
 * from every stylesheet as it lands in the workspace (services/lib/safe.mjs::stripCssLoaderRules). What stays open,
 * stated so nobody believes otherwise: an npm PACKAGE whose CSS carries an `@plugin`, pulled in through `@import`.
 * It takes publishing a malicious package, and it runs in the build sandbox, which holds no platform secret. The
 * network allowlist on the sandbox is what closes it (see cloudflare-build-worker/wrangler.toml).
 *
 * The same file runs in the platform's build AND in `fabapp dev` on the customer's machine, so what the CLI shows
 * locally is what the platform builds.
 */
import type { Plugin, PluginOption } from "vite";

export type PluginEntry = {
  package: string;
  version: string;
  kind: "vite" | "tailwind";
  /** Tailwind only: the exact line added to `src/index.css`. Some packages load with `@plugin`, others with
   *  `@import`, and the options (when any) are ours. */
  directive?: string;
  /** Vite only: companion packages the factory needs, installed at these versions alongside the plugin. */
  with?: Record<string, string>;
  /** Vite only: the `build.target` the plugin requires (wasm needs es2022 for top-level await). */
  buildTarget?: string;
  /** One line, for the docs the model reads: what it is for. */
  purpose: string;
  /** How the app uses it once declared, for the same docs. */
  usage: string;
};
export type PluginManifest = { plugins: PluginEntry[] };

type PackageJson = { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };

/** WHAT `vite dev` PRE-BUNDLES BEFORE THE FIRST REQUEST (2026-10-16): every runtime dependency of the app, plus the
 *  two subpath entries the template imports (`react/jsx-runtime`, `react-dom/client`). Without this list Vite only
 *  pre-bundles what its scanner finds in the source and discovers the rest while serving; measured on a Mac with a
 *  cold cache, the first paint of a generated app took 6.3 s (130 ms warm), and inside the 1-vCPU preview container
 *  behind the edge proxy the same work was the 10-15 s of white screen the Studio showed after its skeleton. The list
 *  is also part of Vite's cache key, so the image can run `vite optimize` with the same list and the first session
 *  of every preview container starts with the bundle already on disk. */
export function prebundleIncludes(pkg: PackageJson): string[] {
  const deps = Object.keys(pkg.dependencies || {}).sort();
  const extra = ["react/jsx-runtime", "react-dom/client"].filter((e) => deps.includes(e.split("/")[0]));
  return [...deps, ...extra];
}

/** The allowed entries the app declared, in either `dependencies` or `devDependencies` (`npm i -D` is how most
 *  plugin READMEs say to install them, and refusing that would be a trap). */
export function enabledPlugins(manifest: PluginManifest, pkg: PackageJson): PluginEntry[] {
  const declared = { ...(pkg.devDependencies || {}), ...(pkg.dependencies || {}) };
  return manifest.plugins.filter((p) => Object.prototype.hasOwnProperty.call(declared, p.package));
}

/**
 * THE OPTIONS ARE OURS. Each Vite plugin on the list maps to a factory here; a package on the list without a factory
 * is a contract error (tests/fab-plugins.test.ts), not a plugin loaded with defaults. The factory receives the
 * module's namespace, because each package exports its function differently.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Factory = (mod: any, companions: Record<string, any>) => PluginOption;
const pick = (mod: any, name = "default") =>
  (typeof mod?.[name] === "function" ? mod[name] : typeof mod?.default?.[name] === "function" ? mod.default[name]
    : typeof mod?.default?.default === "function" ? mod.default.default : mod);
export const VITE_FACTORIES: Record<string, Factory> = {
  // `import Logo from "./logo.svg?react"`. Only the `?react` query: a bare `.svg` import stays a URL, as it is today.
  // `runtimeConfig: false`: @svgr/core otherwise searches UPWARD from every .svg for a `.svgrrc` / `svgr.config.js`
  // and require()s it, which would be app code running in the build through the one plugin meant to be inert.
  "vite-plugin-svgr": (mod) => pick(mod)({ include: "**/*.svg?react", svgrOptions: { runtimeConfig: false } }),
  // The three globals most Node-first libraries reach for, and `node:` imports resolved to their shims.
  "vite-plugin-node-polyfills": (mod) =>
    pick(mod, "nodePolyfills")({ globals: { Buffer: true, global: true, process: true }, protocolImports: true }),
  // `pre`, so the MDX becomes JavaScript before React's plugin and the rest see it. GFM for tables and task lists.
  "@mdx-js/rollup": (mod, c) => ({ enforce: "pre", ...pick(mod)({ remarkPlugins: [pick(c["remark-gfm"])] }) }),
  "vite-plugin-wasm": (mod) => pick(mod)(),
  "vite-plugin-glsl": (mod) => pick(mod)(),
};

/** A stylesheet directive that makes Tailwind LOAD A MODULE: `@plugin "x"` and `@config "x"` (with or without a
 *  params block), and an `@import`/`@reference` of a LOCAL file that is not a `.css`, which Tailwind inlines from
 *  disk whatever it holds. Only at a statement start, so a directive quoted in `content:` or in a comment is text.
 *  MIRRORS services/lib/safe.mjs::CSS_LOADER_RULE, where the reasons are; tests/fab-plugins.test.ts runs the same
 *  cases through both. */
const LOADER_RULE = /(^|[;{}])([ \t\r\n]*)@(plugin|config|import|reference)\b([^;{]*)(\{[^}]*\}|;)/gi;
const localNonCss = (args: string) => {
  const t = /["']([^"']*)["']|url\(\s*([^)\s"']*)\s*\)/.exec(args);
  const target = t ? (t[1] ?? t[2] ?? "") : "";
  return /^(\.{1,2}\/|\/)/.test(target) && !/\.css$/i.test(target);
};

/** It strips the loader directives from a stylesheet, returning the new source and what it removed. */
export function stripLoaderRules(css: string): { code: string; removed: string[] } {
  const removed: string[] = [];
  const code = css.replace(LOADER_RULE, (m, pre: string, ws: string, name: string, args: string, tail: string) => {
    const n = name.toLowerCase();
    if ((n === "import" || n === "reference") && !localNonCss(args)) return m;
    removed.push(`@${n} ${args.trim().split(/\s+/)[0] || ""}`.trim());
    // Only its own line breaks, so a CSS error still points at the right line of the app's file.
    return pre + ws + "\n".repeat(((args + tail).match(/\n/g) || []).length);
  });
  return { code, removed };
}

const IS_CSS = /\.(css|pcss|postcss)(\?|$)/;

/**
 * The Vite plugin that makes the rule above hold. It runs BEFORE Tailwind (`enforce: "pre"`, and first in the
 * array), on every stylesheet Vite loads, node_modules included. `indexCss` is the absolute path of the platform's
 * `src/index.css`, the one stylesheet that receives the allowed directives.
 */
export function fabCssGuard(tailwindPlugins: PluginEntry[], indexCss: string,
                            warn: (msg: string) => void = console.warn): Plugin {
  const lines = tailwindPlugins.filter((p) => p.kind === "tailwind")
    .map((p) => p.directive || `@plugin ${JSON.stringify(p.package)};`).join("\n");
  return {
    name: "fab-css-guard",
    enforce: "pre",
    transform(code, id) {
      if (!IS_CSS.test(id)) return null;
      const clean = id.split("?")[0];
      // The platform's stylesheet by its EXACT path: an app file at `src/features/src/index.css` is not it.
      if (clean === indexCss) {
        // The platform's own stylesheet: its source has no loader rule, and the allowed ones are added here.
        return lines ? { code: `${code}\n${lines}\n`, map: null } : null;
      }
      const { code: out, removed } = stripLoaderRules(code);
      if (!removed.length) return null;
      warn(`[fabapp] ${clean.replace(/^.*?\/(src|node_modules)\//, "$1/")}: ${removed.join(", ")} ignored. `
           + "Tailwind plugins are enabled by adding an allowed package to package.json (see fab-plugins.json).");
      return { code: out, map: null };
    },
  };
}

/** The Vite plugins to register: each allowed and declared one, through its factory. Loaded with a dynamic
 *  import so an app that declares none pays nothing, and a declared one that is not installed fails with a message
 *  that says what to do instead of a stack trace. */
export async function loadVitePlugins(entries: PluginEntry[],
                                      load: (name: string) => Promise<unknown> = (n) => import(n)): Promise<PluginOption[]> {
  const out: PluginOption[] = [];
  for (const e of entries) {
    if (e.kind !== "vite") continue;
    const factory = VITE_FACTORIES[e.package];
    if (!factory) throw new Error(`fab-plugins.json lists ${e.package} but fab-plugins.ts has no factory for it`);
    const need = async (name: string) => {
      try { return await load(name); } catch {
        throw new Error(`${name} is not installed (it comes with ${e.package}): run npm install`);
      }
    };
    const mod = await need(e.package);
    const companions: Record<string, unknown> = {};
    for (const name of Object.keys(e.with || {})) companions[name] = await need(name);
    out.push(factory(mod, companions));
  }
  return out;
}
