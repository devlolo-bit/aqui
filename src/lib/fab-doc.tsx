/**
 * <DocTemplate/> — the READY-MADE piece of a printable DOCUMENT (Tier 3). The layout IS the document itself: a receipt,
 * a certificate or a report, on white A4 paper (independent of the theme — a printed document), with the app's BRAND
 * (logo/color). A bar with Print / Download PDF (both open the browser's print dialog → "Save as PDF",
 * with no external dependency). INLINE styles (self-contained) to print faithfully in a new window.
 *
 * `<DocTemplate template="receipt" data={{number, date, from, items:[{desc,amount}], total}} brand={{name,initials}} />`
 * A platform component — the app USES the <DocTemplate/>, it does not recreate it. Code-split by the fab-client.
 */
import { useCallback, useMemo, useRef } from "react";
import { formatMoney, useLocale } from "./fab-client";
import { t as i18n, type FabI18nKey } from "./fab-i18n";

export type DocTemplateKind = "receipt" | "certificate" | "report";
export type DocBrand = { name?: string; initials?: string; logo?: string; color?: string };
export type DocData = {
  number?: string; date?: string; from?: string; to?: string; title?: string; description?: string; period?: string;
  items?: { desc: string; amount: string | number }[];
  stats?: { value: string | number; label: string }[];
  rows?: { label: string; value: string | number }[];
  total?: string | number;
};

function resolvePrimary(fallback: string): string {
  if (typeof document === "undefined") return fallback;
  try {
    const el = document.createElement("span"); el.style.cssText = "color:var(--primary);display:none";
    document.body.appendChild(el); const c = getComputedStyle(el).color; el.remove();
    return c || fallback;
  } catch { return fallback; }
}
const money = (v: unknown) => (typeof v === "number" ? formatMoney(v) : String(v ?? ""));

export function DocTemplate({ template, data, brand, filename }:
  { template: DocTemplateKind; data: DocData; brand?: DocBrand; filename?: string }) {
  const loc = useLocale();
  const T = useCallback((k: FabI18nKey) => i18n(loc, k), [loc]);
  const docRef = useRef<HTMLDivElement | null>(null);
  const primary = useMemo(() => brand?.color || resolvePrimary("#742fc2"), [brand?.color]);
  const initials = brand?.initials || (brand?.name || "").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "•";
  const ink = "#16121e", faint = "#9a95a5", sub = "#6b6677";

  function printDoc() {
    const node = docRef.current; if (!node) return;
    const w = window.open("", "_blank", "width=820,height=1040"); if (!w) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${filename || "documento"}</title>
<style>@page{size:A4;margin:14mm}*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}</style>
</head><body>${node.innerHTML}</body></html>`);
    w.document.close(); w.focus();
    setTimeout(() => { try { w.print(); } catch { /* */ } }, 300);
  }

  const Logo = ({ size = 34 }: { size?: number }) => brand?.logo
    ? <img src={brand.logo} alt="" style={{ width: size, height: size, borderRadius: 8, objectFit: "cover" }} />
    : <div style={{ width: size, height: size, borderRadius: 8, background: primary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.4 }}>{initials}</div>;

  const paper: React.CSSProperties = { background: "#fff", color: ink, borderRadius: 6, boxShadow: "0 10px 30px -12px rgba(0,0,0,.3)", aspectRatio: "1 / 1.414", display: "flex", flexDirection: "column" };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border p-3">
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-destructive/10 text-destructive"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg></span>
        <div className="flex-1"><div className="text-[13px] font-bold text-foreground">{filename || `${template}.pdf`}</div><div className="text-[11px] text-muted-foreground">A4</div></div>
        <button onClick={printDoc} className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-[12.5px] font-semibold text-foreground/80"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" /></svg>{T("dt.print")}</button>
        <button onClick={printDoc} className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-[12.5px] font-bold text-primary-foreground"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>{T("dt.download")}</button>
      </div>

      <div className="bg-muted p-6">
        <div ref={docRef} className="mx-auto" style={{ maxWidth: 460 }}>
          {template === "receipt" && (
            <div style={{ ...paper, padding: "28px 26px", fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `2px solid ${primary}`, paddingBottom: 14 }}>
                <div><div style={{ marginBottom: 8 }}><Logo /></div><div style={{ fontWeight: 700, fontSize: 13 }}>{brand?.name || ""}</div></div>
                <div style={{ textAlign: "right" }}><div style={{ fontSize: 16, fontWeight: 700, color: primary }}>{T("dt.receiptTitle")}</div>{data.number && <div style={{ color: faint, fontSize: 10 }}>{T("dt.no")} {data.number}</div>}{data.date && <div style={{ color: faint, fontSize: 10 }}>{data.date}</div>}</div>
              </div>
              {data.from && <><div style={{ marginTop: 16, color: sub, fontSize: 10 }}>{T("dt.receivedFrom")}</div><div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>{data.from}</div></>}
              {(data.items || []).map((it, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #eee" }}><span>{it.desc}</span><span>{money(it.amount)}</span></div>)}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", marginTop: "auto", borderTop: `2px solid ${ink}`, fontWeight: 700, fontSize: 14 }}><span>{T("dt.total")}</span><span style={{ color: primary }}>{money(data.total)}</span></div>
              <div style={{ textAlign: "center", color: faint, fontSize: 9, marginTop: 8 }}>{brand?.name || ""}</div>
            </div>
          )}

          {template === "certificate" && (
            <div style={{ ...paper, padding: 16 }}>
              <div style={{ height: "100%", border: `2px solid ${primary}`, borderRadius: 4, padding: "24px 20px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                <Logo />
                <div style={{ fontSize: 10, letterSpacing: ".2em", color: primary, fontWeight: 700, marginTop: 16 }}>{T("dt.certTitle")}</div>
                <div style={{ fontSize: 10, color: sub, marginTop: 18 }}>{T("dt.awardedTo")}</div>
                <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{data.to || data.from || ""}</div>
                <div style={{ width: 60, height: 2, background: primary, margin: "6px 0 16px" }} />
                <div style={{ fontSize: 11, color: sub, lineHeight: 1.5 }}>{data.description || data.title || ""}</div>
                <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", width: "100%", alignItems: "flex-end" }}>
                  <div style={{ textAlign: "center", flex: 1 }}><div style={{ borderTop: "1px solid #999", fontSize: 9, color: sub, paddingTop: 4, margin: "0 6px" }}>{T("dt.director")}</div></div>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", border: `1.5px dashed ${primary}`, display: "flex", alignItems: "center", justifyContent: "center", color: primary, fontSize: 8, fontWeight: 700 }}>{T("dt.seal")}</div>
                  <div style={{ textAlign: "center", flex: 1 }}><div style={{ borderTop: "1px solid #999", fontSize: 9, color: sub, paddingTop: 4, margin: "0 6px" }}>{data.date || T("dt.date")}</div></div>
                </div>
              </div>
            </div>
          )}

          {template === "report" && (
            <div style={{ ...paper, padding: "24px 22px", fontSize: 11 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, borderBottom: "1px solid #eee" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Logo size={28} /><span style={{ fontWeight: 700, fontSize: 12 }}>{data.title || T("dt.report")}</span></div>
                {data.period && <span style={{ color: faint, fontSize: 10 }}>{data.period}</span>}
              </div>
              {(data.stats || []).length > 0 && (
                <div style={{ display: "flex", gap: 8, margin: "14px 0" }}>
                  {(data.stats || []).slice(0, 4).map((s, i) => <div key={i} style={{ flex: 1, background: "#f7f6f9", borderRadius: 6, padding: 8, textAlign: "center" }}><div style={{ fontSize: 15, fontWeight: 700 }}>{s.value}</div><div style={{ fontSize: 8, color: faint }}>{s.label}</div></div>)}
                </div>
              )}
              <div style={{ marginTop: 8 }}>
                {(data.rows || []).map((r, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #f3f1f6", color: sub }}><span>{r.label}</span><span style={{ color: ink, fontWeight: 600 }}>{r.value}</span></div>)}
              </div>
              <div style={{ textAlign: "center", color: faint, fontSize: 8, marginTop: "auto", paddingTop: 8 }}>{brand?.name || ""}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
