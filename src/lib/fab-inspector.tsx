import { useEffect, useRef } from "react";

/**
 * VISUAL EDITING (the app side) — the INSPECTION bridge of the preview embedded in the Studio.
 *
 * The app runs in a CROSS-ORIGIN <iframe> of the Studio's → all the communication goes through postMessage (the parent does not reach the
 * iframe's DOM). This module:
 *   • stays INERT by default — it only activates on receiving a `fab-edit-mode {enabled:true}` from the parent (the published app never
 *     receives that handshake → no effect in production);
 *   • in edit mode: it highlights the element under the cursor (hover) and, on a click, it SELECTS and reports the spot in the source
 *     to the parent (a `data-fab-loc="src/file:line"` injected by the vite.config's Babel plugin, on the preview channel only)
 *     + the metadata (the tag/name/text) + the rectangle (a getBoundingClientRect, in the iframe viewport's coords);
 *   • it redraws/resends the rect on a scroll/resize (the parent repositions the float box);
 *   • Esc clears the selection.
 *
 *   • a DOUBLE CLICK on a PURE TEXT element (with no element children) enters inline editing (contenteditable); Enter/a blur
 *     confirms and reports the new text to the parent (a `fab-inline-text` {loc,text}), Esc cancels and restores the original.
 *
 * The messages sent to the parent: `fab-hover` (loc,name,rect|null), `fab-inspect` (the selection), `fab-deselect`,
 *   `fab-inline-text` (loc,text — a confirmed inline edit).
 * The messages received from the parent: `fab-edit-mode` {enabled}, `fab-request-rect` (it resends the current selection's rect).
 */

type Loc = { loc: string; name: string; tag: string; text: string; rect: DOMRectLike };
type DOMRectLike = { x: number; y: number; width: number; height: number };

function rectOf(el: Element): DOMRectLike {
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
}
// it climbs the DOM until it finds the nearest ancestor with a `data-fab-loc` (the target may be an inner <span>).
function taggedFrom(node: EventTarget | null): HTMLElement | null {
  const el = node instanceof Element ? node : null;
  return (el?.closest("[data-fab-loc]") as HTMLElement | null) || null;
}
function describe(el: HTMLElement): Loc {
  return {
    loc: el.getAttribute("data-fab-loc") || "",
    name: el.getAttribute("data-fab-name") || el.tagName.toLowerCase(),
    tag: el.tagName.toLowerCase(),
    text: (el.textContent || "").trim().slice(0, 120),
    rect: rectOf(el),
  };
}

/** It applies a new text to the element's ONLY top-level text node (preserving sibling icons/spans); if there is no direct
 * text, it DESCENDS into the only element child with content (a wrapper: <a><…text…><svg/></a>, <div><h1>text</h1></div>).
 * It mirrors the Studio's `topLevelTextRun` in the DOM — used in the OPTIMISTIC update (an instant change, without waiting for the
 * rebuild). It returns true when it applied. */
function setTopText(el: Element, text: string, depth = 0): boolean {
  if (depth > 6) return false;
  const texts = Array.from(el.childNodes).filter((n) => n.nodeType === 3 && (n.nodeValue || "").trim() !== "");
  if (texts.length === 1) {
    const tn = texts[0];
    const v = tn.nodeValue || "";
    tn.nodeValue = (v.match(/^\s*/)?.[0] || "") + text + (v.match(/\s*$/)?.[0] || "");   // it preserves the spacing
    return true;
  }
  if (texts.length > 1) return false;                          // ambiguous
  const kids = Array.from(el.children).filter((c) => (c.textContent || "").trim() !== "");
  return kids.length === 1 ? setTopText(kids[0], text, depth + 1) : false;
}

/** It escapes a value for safe use INSIDE an `[attr="…"]`. A backslash (and quotes) break the selector → a SyntaxError in the
 * querySelector; a loc/slot can contain any char. CSS.escape is the right path; the fallback escapes the backslash AND the quotes. */
function cssEsc(s: string): string {
  return typeof CSS !== "undefined" && typeof CSS.escape === "function" ? CSS.escape(s) : s.replace(/[\\"]/g, "\\$&");
}

const _RE_BP = /^(sm|md|lg|xl|2xl):/;   // Tailwind's breakpoints (it mirrors the Studio's RE_BP)

/** It applies a class FAMILY change to the element's RENDERED className: it removes the tokens that match `pattern`
 * (the family's bare regex, at the `bp` breakpoint) and adds `value` (empty = it only removes, e.g. turning italics off). It mirrors
 * the Studio's `setFamily`/`famMatchBp` in the DOM — an OPTIMISTIC update of the color/alignment/size/etc. with no reload. */
function applyClassFamily(el: Element, pattern: string, value: string, bp: string): void {
  let re: RegExp;
  try { re = new RegExp(pattern); } catch { return; }
  const toks = (el.getAttribute("class") || "").split(/\s+/).filter(Boolean).filter((t) => {
    if (bp) return !(t.startsWith(bp + ":") && re.test(t.slice(bp.length + 1)));
    return !(!_RE_BP.test(t) && re.test(t));
  });
  if (value) toks.push(bp ? `${bp}:${value}` : value);
  el.setAttribute("class", toks.join(" "));
}

export function FabInspector() {
  const enabledRef = useRef(false);
  const hoverElRef = useRef<HTMLElement | null>(null);
  const selElRef = useRef<HTMLElement | null>(null);
  const hoverBoxRef = useRef<HTMLDivElement | null>(null);
  const selBoxRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const reflowRafRef = useRef<number | null>(null);
  const editElRef = useRef<HTMLElement | null>(null);  // the element in inline text editing (a double click)
  const imgChipsRef = useRef<Map<HTMLElement, HTMLButtonElement>>(new Map());  // the "trocar imagem" chips per [data-fab-img]

  useEffect(() => {
    // it only makes sense embedded (there is a different parent). Opened directly → a total no-op.
    if (typeof window === "undefined" || window.parent === window) return;

    const post = (msg: unknown) => {
      try { window.parent.postMessage(msg, "*"); } catch { /* cross-origin/no parent */ }
    };
    // the highlight boxes: fixed divs, not capturing the pointer, above the app. Created on demand.
    const makeBox = (color: string, width: string): HTMLDivElement => {
      const b = document.createElement("div");
      Object.assign(b.style, {
        position: "fixed", pointerEvents: "none", zIndex: "2147483646",
        border: `${width} solid ${color}`, borderRadius: "4px", boxSizing: "border-box",
        transition: "all 60ms ease-out", display: "none", top: "0", left: "0",
      } as CSSStyleDeclaration);
      document.body.appendChild(b);
      return b;
    };
    const place = (box: HTMLDivElement | null, el: HTMLElement | null) => {
      if (!box) return;
      if (!el || !el.isConnected) { box.style.display = "none"; return; }
      const r = el.getBoundingClientRect();
      Object.assign(box.style, {
        display: "block", top: `${r.y}px`, left: `${r.x}px`, width: `${r.width}px`, height: `${r.height}px`,
      });
    };

    // The "trocar imagem" CHIPS: for each layout image (a `data-fab-img`, stamped by the <AppImage>), a little floating
    // button (an image+pencil icon, with no text → no i18n) in the top right corner. A click → it asks the parent for the swap.
    const IMG_CHIP_ICON =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<rect x="3" y="3" width="13" height="13" rx="2"/><circle cx="7.5" cy="7.5" r="1.4"/><path d="m3 14 3.5-3.5 3 3"/>' +
      '<path d="M17.5 14.2 21 17.7 18.3 20.4l-3.5-3.5z"/></svg>';
    const makeImgChip = (el: HTMLElement): HTMLButtonElement => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "trocar imagem");
      Object.assign(b.style, {
        position: "fixed", zIndex: "2147483645", pointerEvents: "auto", display: "none", top: "0", left: "0",
        width: "30px", height: "30px", padding: "0", border: "1.5px solid rgba(255,255,255,.9)", borderRadius: "8px",
        cursor: "pointer", background: "rgba(116,47,194,0.95)", color: "#ffffff",
        boxShadow: "0 4px 14px -2px rgba(20,16,30,.5)", alignItems: "center", justifyContent: "center", lineHeight: "0",
      } as CSSStyleDeclaration);
      b.innerHTML = IMG_CHIP_ICON;
      b.addEventListener("click", (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        const img = el as HTMLImageElement;
        post({ type: "fab-image-pick", slot: el.getAttribute("data-fab-img") || "",
               prompt: el.getAttribute("data-fab-img-prompt") || "", loc: el.getAttribute("data-fab-loc") || "",
               src: img.currentSrc || el.getAttribute("src") || "" });
      }, true);
      document.body.appendChild(b);
      return b;
    };
    const placeImgChip = (chip: HTMLButtonElement, el: HTMLElement) => {
      if (!el.isConnected) { chip.style.display = "none"; return; }
      const r = el.getBoundingClientRect();
      if (r.width < 24 && r.height < 24) { chip.style.display = "none"; return; }  // a tiny/hidden image → no chip
      Object.assign(chip.style, { display: "flex", top: `${Math.max(4, r.y + 6)}px`, left: `${Math.max(4, r.x + r.width - 36)}px` });
    };
    // it reconciles the chips with the images present: it creates the missing ones, removes the orphans, repositions them all.
    const syncImgChips = () => {
      const map = imgChipsRef.current;
      const seen = new Set<HTMLElement>();
      document.querySelectorAll<HTMLElement>("[data-fab-img]").forEach((el) => {
        seen.add(el);
        let chip = map.get(el);
        if (!chip) { chip = makeImgChip(el); map.set(el, chip); }
        placeImgChip(chip, el);
      });
      for (const [el, chip] of map) { if (!seen.has(el)) { chip.remove(); map.delete(el); } }
    };
    const clearImgChips = () => { imgChipsRef.current.forEach((chip) => chip.remove()); imgChipsRef.current.clear(); };

    const onMove = (e: MouseEvent) => {
      if (!enabledRef.current) return;
      if (rafRef.current != null) return; // a throttle per frame
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (!enabledRef.current) return; // it turned off between the scheduling and the firing
        const el = taggedFrom(e.target);
        if (el === hoverElRef.current) return;
        hoverElRef.current = el;
        place(hoverBoxRef.current, el);
        post(el ? { type: "fab-hover", ...describe(el) } : { type: "fab-hover", loc: null });
      });
    };
    const onClick = (e: MouseEvent) => {
      if (!enabledRef.current) return;
      // during the inline editing, it lets the click place the cursor in the text (it does not intercept).
      if (editElRef.current && editElRef.current.contains(e.target as Node)) return;
      const el = taggedFrom(e.target);
      if (!el) return;
      // in edit mode, the click SELECTS — it does not navigate/trigger the app.
      e.preventDefault();
      e.stopPropagation();
      selElRef.current = el;
      place(selBoxRef.current, el);
      post({ type: "fab-inspect", ...describe(el) });
    };
    // a DOUBLE CLICK → inline text editing (only on a PURE text element: with no element children).
    const stopInlineEdit = (commit: boolean) => {
      const el = editElRef.current;
      if (!el) return;
      editElRef.current = null;
      el.removeAttribute("contenteditable");
      const loc = el.getAttribute("data-fab-loc") || "";
      const name = el.getAttribute("data-fab-name") || el.tagName.toLowerCase();  // the SOURCE's tag name (so the patch can locate the tag)
      const text = (el.textContent || "").trim();
      const original = el.getAttribute("data-fab-orig") ?? "";
      el.removeAttribute("data-fab-orig");
      if (commit && text && text !== original.trim()) post({ type: "fab-inline-text", loc, name, text });
      else el.textContent = original;  // it was cancelled or there was no change → it restores the original text (raw)
      place(selBoxRef.current, el);
    };
    const onDblClick = (e: MouseEvent) => {
      if (!enabledRef.current) return;
      const el = taggedFrom(e.target);
      // it requires pure text: no element children and some text (otherwise editing would break the JSX tree).
      if (!el || el.children.length > 0 || !(el.textContent || "").trim()) return;
      e.preventDefault();
      e.stopPropagation();
      if (editElRef.current && editElRef.current !== el) stopInlineEdit(true);
      editElRef.current = el;
      el.setAttribute("data-fab-orig", el.textContent || "");  // raw (it restores faithfully on a cancel)
      el.setAttribute("contenteditable", "true");
      el.focus();
      const range = document.createRange(); range.selectNodeContents(el);
      const selv = window.getSelection(); selv?.removeAllRanges(); selv?.addRange(range);
    };
    const onEditKey = (e: KeyboardEvent) => {
      if (!editElRef.current) return;
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); stopInlineEdit(true); }
      else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); stopInlineEdit(false); }
    };
    const onEditBlur = (e: FocusEvent) => {
      if (editElRef.current && e.target === editElRef.current) stopInlineEdit(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if (!enabledRef.current || editElRef.current) return;  // during an inline edit, onEditKey handles the keys
      if (e.key !== "Escape") return;
      selElRef.current = null;
      place(selBoxRef.current, null);
      post({ type: "fab-deselect" });
    };
    // a scroll/resize: it repositions the highlights and resends the selection's rect (the parent moves the float box along).
    // A throttle per frame — a scroll fires many events; without it the parent would receive a flood of fab-inspects.
    const onReflow = () => {
      if (!enabledRef.current || reflowRafRef.current != null) return;
      reflowRafRef.current = requestAnimationFrame(() => {
        reflowRafRef.current = null;
        if (!enabledRef.current) return;
        place(hoverBoxRef.current, hoverElRef.current);
        place(selBoxRef.current, selElRef.current);
        // a scroll fires MANY frames: here it only REPOSITIONS the chips that already exist (cheap). The full reconciliation
        // with a querySelectorAll (syncImgChips) lives in setEnabled(true) and in the image swap (gated) — not on every frame.
        imgChipsRef.current.forEach((chip, el) => placeImgChip(chip, el));
        if (selElRef.current?.isConnected) post({ type: "fab-inspect", ...describe(selElRef.current) });
      });
    };

    const setEnabled = (on: boolean) => {
      if (on === enabledRef.current) return;
      enabledRef.current = on;
      if (on) {
        if (!hoverBoxRef.current) hoverBoxRef.current = makeBox("rgba(116,47,194,0.5)", "1.5px");
        if (!selBoxRef.current) selBoxRef.current = makeBox("rgba(116,47,194,0.95)", "2px");
        document.documentElement.style.cursor = "default";
        window.addEventListener("mousemove", onMove, true);
        window.addEventListener("click", onClick, true);
        window.addEventListener("dblclick", onDblClick, true);
        window.addEventListener("keydown", onKey, true);
        window.addEventListener("keydown", onEditKey, true);
        window.addEventListener("blur", onEditBlur, true);
        window.addEventListener("scroll", onReflow, true);
        window.addEventListener("resize", onReflow, true);
        syncImgChips();  // it draws the "trocar imagem" chips on entering edit mode
      } else {
        if (editElRef.current) stopInlineEdit(false);  // it was turned off mid-edit → it cancels
        clearImgChips();
        hoverElRef.current = null;
        selElRef.current = null;
        place(hoverBoxRef.current, null);
        place(selBoxRef.current, null);
        document.documentElement.style.cursor = "";
        window.removeEventListener("mousemove", onMove, true);
        window.removeEventListener("click", onClick, true);
        window.removeEventListener("dblclick", onDblClick, true);
        window.removeEventListener("keydown", onKey, true);
        window.removeEventListener("keydown", onEditKey, true);
        window.removeEventListener("blur", onEditBlur, true);
        window.removeEventListener("scroll", onReflow, true);
        window.removeEventListener("resize", onReflow, true);
      }
    };

    const onMsg = (e: MessageEvent) => {
      // it accepts messages only from the PARENT (the Studio). We do not require a fixed origin (the Studio may be on various domains),
      // but the source has to be the parent — and the payload is harmless (it only turns the inspection on / asks for the rect).
      if (e.source !== window.parent) return;
      const d = e.data as { type?: string; enabled?: boolean; loc?: string } | null;
      if (d?.type === "fab-edit-mode") setEnabled(!!d.enabled);
      else if (d?.type === "fab-clear-selection") {
        // the parent closed the float box → it clears the selection + the local highlight (with no re-emit; the parent already knows).
        selElRef.current = null;
        place(selBoxRef.current, null);
      } else if (d?.type === "fab-select-loc" && typeof d.loc === "string") {
        // the parent asks to RE-SELECT a loc (e.g. after a rebuild → to chain edits on the same element). It only acts in
        // edit mode; if the element no longer exists (the AI moved/removed it), it is a silent no-op (it degrades well).
        if (enabledRef.current) {
          const el = document.querySelector(`[data-fab-loc="${cssEsc(d.loc)}"]`) as HTMLElement | null;
          if (el) { selElRef.current = el; place(selBoxRef.current, el); post({ type: "fab-inspect", ...describe(el) }); }
        }
      } else if (d?.type === "fab-request-rect" && selElRef.current?.isConnected) {
        post({ type: "fab-inspect", ...describe(selElRef.current) });
      } else if (d?.type === "fab-set-text" && typeof d.loc === "string" && typeof (d as { text?: string }).text === "string") {
        // OPTIMISTIC: it applies the text STRAIGHT to the DOM (instantly), without waiting for the rebuild — the Studio persists + rebuilds
        // in the background. It repositions the highlight (the selection's box follows the new size).
        const el = document.querySelector(`[data-fab-loc="${cssEsc(d.loc)}"]`);
        if (el) { setTopText(el, (d as { text: string }).text); place(selBoxRef.current, selElRef.current); }
      } else if (d?.type === "fab-set-class" && typeof d.loc === "string" && typeof (d as { pattern?: string }).pattern === "string") {
        // OPTIMISTIC (the color/alignment/size/…): it removes the family's tokens from the RENDERED className (a regex coming from the
        // Studio) and adds the new one — it preserves the base/variant/cn (the rebuild's twMerge reconciles). Instant, with no reload.
        const dd = d as { loc: string; pattern: string; value?: string; bp?: string };
        const el = document.querySelector(`[data-fab-loc="${cssEsc(dd.loc)}"]`);
        if (el) { applyClassFamily(el, dd.pattern, dd.value || "", dd.bp || ""); place(selBoxRef.current, selElRef.current); }
      } else if (d?.type === "fab-set-image" && typeof (d as { src?: string }).src === "string") {
        // OPTIMISTIC: it swaps the layout image's URL STRAIGHT in the DOM (instantly), without waiting for the rebuild. It locates the
        // <AppImage> by the `slot` (data-fab-img) or by the `loc` (data-fab-loc); if the target is not an <img>, it looks for one inside.
        const dd = d as { loc?: string; slot?: string; src: string };
        let el: Element | null = (dd.slot ? document.querySelector(`[data-fab-img="${cssEsc(dd.slot)}"]`) : null)
          || (dd.loc ? document.querySelector(`[data-fab-loc="${cssEsc(dd.loc)}"]`) : null);
        if (el && el.tagName !== "IMG") el = el.querySelector("img");
        // the src swap is unconditional (the DOM reflects the choice right away); the chip reconciliation only makes sense
        // in edit mode — outside it there are no chips and a syncImgChips() would CREATE them wrongly (a leak in production/with the preview off).
        if (el instanceof HTMLImageElement) { el.src = dd.src; if (enabledRef.current) syncImgChips(); }
      }
    };
    window.addEventListener("message", onMsg);
    // it announces to the parent that the inspection bridge is ready (the Studio can (re)send the fab-edit-mode).
    post({ type: "fab-inspector-ready", optimistic: true });   // `optimistic`: it knows how to apply a fab-set-text in the DOM (an instant edit, with no reload). The Studio only goes silent when it sees this capability (old previews fall back to the normal reload).

    return () => {
      window.removeEventListener("message", onMsg);
      setEnabled(false);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (reflowRafRef.current != null) cancelAnimationFrame(reflowRafRef.current);
      hoverBoxRef.current?.remove();
      selBoxRef.current?.remove();
      hoverBoxRef.current = null;
      selBoxRef.current = null;
    };
  }, []);

  return null;
}
