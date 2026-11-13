/**
 * ROUTE-LEVEL CODE SPLITTING, by construction.
 *
 * Every generated app shipped ONE JavaScript bundle — 105 to 226 KB gzip across the 5 apps sampled on 2026-09-07 —
 * because `src/routes.tsx` imports every page statically. Asking the model to write `React.lazy` instead does not
 * work reliably: it is one more rule to remember on a file it rewrites constantly, and when it forgets, nothing
 * fails. So the split happens in the BUILD: this Vite plugin rewrites the routes file on its way to the compiler.
 * The AI keeps writing the simple, readable version; the app still downloads one page at a time.
 *
 * WHAT IT DOES, only to `src/routes.tsx`:
 *   `import About from "./pages/About";`  →  `const About = fabLazyPage(() => import("./pages/About"));`
 *   `<Routes>…</Routes>`                  →  wrapped in `<Suspense fallback={<the skeleton>}>`
 *
 * ⚠️ THE LANDING ROUTE STAYS EAGER. Splitting it too made the numbers WORSE, not better: measured with Lighthouse
 * mobile on the sample app, FCP went 3.2 s → 3.6-3.8 s and LCP 3.6 s → 4.1-4.3 s, because the first paint then
 * waits for the entry chunk AND a second round trip for the home chunk before any content exists (the Suspense
 * fallback does not count as a content paint). So the page behind `<Route path="/">` — and any `index` route,
 * which is the same landing in a nested layout — keeps its static import and rides inside the entry chunk. Every
 * other page is split. This is the standard split point, and it is the whole reason the transform reads the
 * `<Route>` tags at all instead of just rewriting imports.
 *
 * WHAT IT REFUSES TO TOUCH (each of these would be a silent breakage, so the rule is: when in doubt, do nothing):
 *   • a file that already uses `lazy(` — the app or the model got there first;
 *   • anything that is not a DEFAULT import of `./pages/*` / `@/pages/*` — named imports, layouts, hooks, the SDK;
 *   • a page whose identifier is ALSO used outside the `<Routes>` block, where no Suspense boundary would cover it;
 *   • a file with no `<Routes>…</Routes>` at all — with nowhere to put the boundary, lazy loading would throw;
 *   • a `<Routes>` block where NO landing route can be identified. Guessing which page is the home and getting it
 *     wrong costs exactly the regression above, on the one route every visitor loads — so it splits nothing.
 *
 * IT PRESERVES LINE NUMBERS. Every edit happens WITHIN an existing line (the react import rides on the first
 * rewritten import; the Suspense tags sit immediately around the `<Routes>` tags). The visual editor maps a click
 * in the preview to `src/file:line` through the `data-fab-loc` Babel plugin, and inserting lines here would point
 * the Studio at the wrong source line for anything an app renders inside routes.tsx.
 *
 * The fallback's `.fab-route-fallback` class is authored CSS in `src/index.css` — NOT Tailwind utilities. Tailwind
 * v4 generates utilities by scanning source files on disk, and a class that exists only in this transform's output
 * would never be generated, leaving a blank white flash exactly where the fallback was supposed to prevent one.
 */

/** The identifiers the transform introduces. Prefixed so they cannot collide with an app's own names. */
const LAZY = "fabLazyPage";
const SUSPENSE = "FabRouteSuspense";
const FALLBACK = `<div className="fab-route-fallback" aria-busy="true" aria-live="polite"><i /><i /><i /><i /></div>`;

/** A DEFAULT import of a page module: `import Home from "./pages/Home";`. Braces never match, so a named import
 *  (`import { Home } from …`) and a mixed one (`import Home, { x } from …`) are both left alone. */
const PAGE_IMPORT = /^([ \t]*)import[ \t]+([A-Za-z_$][\w$]*)[ \t]+from[ \t]+(["'])((?:\.{1,2}\/|@\/)pages\/[^"']+)\3[ \t]*;?[ \t]*$/gm;

/**
 * A SAME-LENGTH copy of the source with the comments blanked to spaces (and, with `strings`, the contents of the
 * string/template literals too). Same length is the whole point: an offset found on the copy is the offset in the
 * original, so the wrapper can be spliced back BY POSITION.
 *
 * WITHOUT IT the transform reads text that is not code. A line of prose that merely NAMES the tag —
 * `// o bloco <Routes> abaixo lista as telas` — makes the search land inside a comment, and the boundary opens in
 * the middle of it: invalid TSX, on a file the author wrote correctly, which the repair loop can never fix because
 * what it is shown is already right. Same for a `<Routes` inside a string. (Ported from the control-plane's
 * `codegen/autofix.py::_blind`, which exists for exactly this class of bug.)
 *
 * A `'`/`"` literal is closed at the end of its line — JS does not let it span one — so an apostrophe in JSX text
 * (`<p>Don't</p>`) can only blank the rest of ITS line. That can hide a tag from the scan, never invent one, and a
 * hidden tag makes the count wrong, which means we bail and leave the file eager. It fails in the safe direction.
 */
export function blindCode(text: string, { strings = true }: { strings?: boolean } = {}): string {
  const out = text.split("");
  const n = text.length;
  const blank = (from: number, to: number) => {
    for (let k = from; k < to && k < n; k++) if (text[k] !== "\n") out[k] = " ";
  };
  let i = 0;
  while (i < n) {
    const ch = text[i], nxt = i + 1 < n ? text[i + 1] : "";
    if (ch === "/" && nxt === "/") {
      const j = text.indexOf("\n", i);
      const end = j < 0 ? n : j;
      blank(i, end);
      i = end;
    } else if (ch === "/" && nxt === "*") {
      const j = text.indexOf("*/", i + 2);
      const end = j < 0 ? n : j + 2;
      blank(i, end);
      i = end;
    } else if (ch === '"' || ch === "'" || ch === "`") {
      let j = i + 1;
      while (j < n) {
        if (text[j] === "\\") { j += 2; continue; }
        if (text[j] === ch || (ch !== "`" && text[j] === "\n")) break;
        j++;
      }
      if (strings) blank(i + 1, Math.min(j, n));
      i = Math.min(j, n) + 1;
    } else {
      i++;
    }
  }
  return out.join("");
}

/** Rewrites the routes source. Returns `null` when nothing should change — the caller then leaves the file alone. */
export function transformRoutes(code: string): string | null {
  const src = String(code ?? "");
  // Two views of the same bytes, both the same length as the original: `code` for anything positional or
  // structural, `prose` (comments gone, strings kept) for reading a `path="/"` out of a `<Route>` tag.
  const code_ = blindCode(src, { strings: true });
  const prose = blindCode(src, { strings: false });
  if (!code_.includes("<Routes")) return null;
  if (/\blazy\s*\(/.test(code_)) return null;                     // already split (by the app or by a previous pass)
  if (code_.includes(LAZY) || code_.includes(SUSPENSE)) return null; // idempotent: our own output goes through untouched

  // The `<Routes>` span — the region a Suspense boundary would cover. EXACTLY ONE tree, or nothing: a file with a
  // public router and an admin router (or a ternary between two of them) has no single span to wrap, and a
  // `lastIndexOf` would open the boundary in one function and close it in another. That is not a worse split, it
  // is a file that does not compile.
  const opens = (code_.match(/<Routes[\s/>]/g) || []).length;
  const closes = (code_.match(/<\/Routes>/g) || []).length;
  if (opens !== 1 || closes !== 1) return null;
  const open = code_.search(/<Routes[\s/>]/);
  const close = code_.indexOf("</Routes>");
  if (open < 0 || close < open) return null;
  const spanEnd = close + "</Routes>".length;

  // THE LANDING ROUTE, read off the `<Route>` tags. Splitting on `<Route` gives one fragment per route: a nested
  // route starts with `<Route` too, so it is split off, and what is left in a fragment is that route's own
  // attributes. A `path="/"` and an `index` route both name the landing (in a layout they are the pair
  // `<Route path="/" element={<Layout/>}><Route index element={<Home/>}/></Route>`, and BOTH have to be eager).
  const eager = new Set<string>();
  for (const frag of prose.slice(open, spanEnd).split(/<Route\b/).slice(1)) {
    const isRoot = /(?:^|\s)path\s*=\s*["']\/["']/.test(frag);
    const isIndex = /(?:^|\s)index(?=[\s/>])/.test(frag) || /(?:^|\s)index\s*=\s*\{\s*true\s*\}/.test(frag);
    if (!isRoot && !isIndex) continue;
    const el = /element\s*=\s*\{\s*<\s*([A-Z][\w$]*)/.exec(frag);
    if (el) eager.add(el[1]);
  }
  if (!eager.size) return null;      // no identifiable landing → split nothing (see the note at the top)

  // The pages worth making lazy: a default import used ONLY inside that span, and not the landing.
  const targets = new Map<string, string>();                       // identifier → module specifier
  for (const m of src.matchAll(PAGE_IMPORT)) {
    const [line, , ident, , spec] = m;
    if (eager.has(ident)) continue;                                // the landing rides in the entry chunk
    const start = m.index ?? 0;
    // The usage scan runs on the BLINDED copy: a page named in a comment or in a string is not a render, and
    // treating it as one would keep a page eager for a mention.
    const rest = code_.slice(0, start) + " ".repeat(line.length) + code_.slice(start + line.length);
    let usedOutside = false;
    for (const u of rest.matchAll(new RegExp(`\\b${ident}\\b`, "g"))) {
      const at = u.index ?? 0;
      if (at < open || at >= spanEnd) { usedOutside = true; break; }
    }
    if (!usedOutside) targets.set(ident, spec);
  }
  if (!targets.size) return null;

  // 1. the boundary, inserted around the existing tags (no new lines)
  let out = src.slice(0, open)
    + `<${SUSPENSE} fallback={${FALLBACK}}>` + src.slice(open, spanEnd) + `</${SUSPENSE}>`
    + src.slice(spanEnd);

  // 2. the imports → lazy declarations, one per original line, with react's `lazy`/`Suspense` riding on the first
  let first = true;
  out = out.replace(PAGE_IMPORT, (line, indent: string, ident: string, _q: string, spec: string) => {
    if (targets.get(ident) !== spec) return line;                  // not a target (used outside the boundary)
    const preamble = first ? `import { lazy as ${LAZY}, Suspense as ${SUSPENSE} } from "react"; ` : "";
    first = false;
    return `${indent}${preamble}const ${ident} = ${LAZY}(() => import("${spec}"));`;
  });
  return out === src ? null : out;
}

/** The Vite plugin. `enforce: "pre"` so the rewrite happens BEFORE the React/Babel pass turns the JSX into calls. */
export function lazyRoutes(): {
  name: string; enforce: "pre";
  transform(code: string, id: string): { code: string; map: null } | null;
} {
  return {
    name: "fab-lazy-routes",
    enforce: "pre",
    transform(code: string, id: string) {
      const file = id.split("?")[0].replace(/\\/g, "/");
      if (!file.endsWith("/src/routes.tsx")) return null;
      const out = transformRoutes(code);
      // `map: null` is honest: the transform only shifts COLUMNS (line numbers are preserved on purpose), so a
      // stack trace still points at the right line of the author's file.
      return out == null ? null : { code: out, map: null };
    },
  };
}
