/**
 * <PdfReader/> — the READY-MADE piece of in-app PDF reading (Tier 3). A bar with page X/N, a zoom, a bookmark; it renders the
 * current page (a canvas through react-pdf/pdf.js). CONTROLLED: pass a `page` + an `onPageChange` to SAVE the current page
 * into a field on the record (to resume later); and `bookmarks` + an `onToggleBookmark` for the bookmarked pages. Token-driven.
 *
 * `<PdfReader src={book.file} page={book.page} onPageChange={(p)=>update(book.id,{page:p})} />`
 * A platform component — the app USES the <PdfReader/>, it does not recreate it. Code-split (the PDF lib only loads on the 1st use).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { useLocale } from "./fab-client";
import { t as i18n, type FabI18nKey } from "./fab-i18n";

// the pdf.js worker resolved by Vite (a hashed asset) — necessary for the Document to parse the PDF.
pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

const SKEL = "animate-pulse bg-muted";

export function PdfReader({ src, page, onPageChange, bookmarks, onToggleBookmark, height = 560, className }:
  { src: string; page?: number; onPageChange?: (page: number) => void; bookmarks?: number[];
    onToggleBookmark?: (page: number) => void; height?: number; className?: string }) {
  const loc = useLocale();
  const T = useCallback((k: FabI18nKey) => i18n(loc, k), [loc]);
  const [numPages, setNumPages] = useState(0);
  const [internal, setInternal] = useState(1);
  const cur = page ?? internal;
  const [scale, setScale] = useState(1);
  const [err, setErr] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {   // a responsive width → the Page renders at the container's size
    const el = boxRef.current; if (!el) return;
    const ro = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width - 24));
    ro.observe(el); return () => ro.disconnect();
  }, []);

  const goTo = useCallback((p: number) => {
    const np = Math.max(1, Math.min(numPages || 1, p));
    if (page == null) setInternal(np);
    if (np !== cur) onPageChange?.(np);
  }, [numPages, page, cur, onPageChange]);

  const marked = !!bookmarks?.includes(cur);
  const opts = { standardFontDataUrl: undefined } as const;

  const Btn = ({ onClick, label, disabled, children }: { onClick: () => void; label: string; disabled?: boolean; children: React.ReactNode }) => (
    <button onClick={onClick} disabled={disabled} aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-40">{children}</button>
  );

  return (
    <div className={`overflow-hidden rounded-2xl border border-border bg-card ${className || ""}`}>
      <div className="flex items-center gap-1 border-b border-border p-2">
        <Btn onClick={() => goTo(cur - 1)} label={T("pd.prev")} disabled={cur <= 1}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        </Btn>
        <span className="min-w-[84px] text-center text-[12.5px] font-semibold text-foreground">{T("pd.page")} {cur} {T("pd.of")} {numPages || "—"}</span>
        <Btn onClick={() => goTo(cur + 1)} label={T("pd.next")} disabled={!numPages || cur >= numPages}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
        </Btn>
        <div className="flex-1" />
        <Btn onClick={() => setScale((s) => Math.max(0.5, s - 0.2))} label={T("pd.zoomOut")}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3M8 11h6" /></svg>
        </Btn>
        <Btn onClick={() => setScale((s) => Math.min(3, s + 0.2))} label={T("pd.zoomIn")}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3M11 8v6M8 11h6" /></svg>
        </Btn>
        {onToggleBookmark && (
          <button onClick={() => onToggleBookmark(cur)} aria-label={T("pd.bookmark")}
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${marked ? "text-[var(--warning)]" : "text-muted-foreground hover:bg-muted"}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={marked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
          </button>
        )}
      </div>

      {/* the bookmarked pages (a jump) */}
      {bookmarks && bookmarks.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-border bg-muted/40 px-3 py-2">
          {[...bookmarks].sort((a, b) => a - b).map((b) => (
            <button key={b} onClick={() => goTo(b)} className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${b === cur ? "bg-primary text-primary-foreground" : "bg-card text-foreground/80 hover:bg-accent"}`}>{b}</button>
          ))}
        </div>
      )}

      <div ref={boxRef} className="flex justify-center overflow-auto bg-muted/30 p-3" style={{ height }}>
        {err ? (
          <div className="flex flex-col items-center justify-center gap-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M10 12l4 4M14 12l-4 4" /></svg></div>
            <div className="text-[13px] font-bold text-foreground">{T("pd.loadError")}</div>
          </div>
        ) : (
          <Document file={src} options={opts} onLoadSuccess={(d) => { setNumPages(d.numPages); setErr(false); }} onLoadError={() => setErr(true)}
            loading={<div className={`${SKEL} h-full w-full max-w-[520px] rounded`} style={{ minHeight: height - 24 }} />}
            error={<div className="text-[13px] font-bold text-destructive">{T("pd.loadError")}</div>}>
            {width > 0 && <Page pageNumber={cur} width={Math.max(120, width * scale)} renderTextLayer={false} renderAnnotationLayer={false}
              loading={<div className={`${SKEL} rounded`} style={{ width: Math.max(120, width * scale), height: (width * scale) * 1.3 }} />} />}
          </Document>
        )}
      </div>
    </div>
  );
}
