/**
 * <CsvImport/> and <CsvExport/> — the READY-MADE pieces of CSV import/export (Tier 3). They have no model of their own:
 * they operate on an existing collection of the app's. The import: upload → map the columns (it auto-detects) → preview →
 * import (row by row, with progress and errors). The export: pick the fields → download a .csv. Token-driven and light/dark.
 *
 * `<CsvImport model="contact" fields={[{id:'name',label:'Nome',required:true},…]} />`
 * `<CsvExport model="contact" fields={[{id:'name',label:'Nome'},…]} filter={{active:true}} />`
 * Platform components — the app USES them, it does not recreate them. Code-split by the fab-client.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import { collection, useLocale, type Row } from "./fab-client";
import { t as i18n, type FabI18nKey } from "./fab-i18n";

export type CsvField = { id: string; label: string; required?: boolean };

const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function parseCsv(text: string): { header: string[]; rows: string[][] } {
  const out: string[][] = []; let cur: string[] = []; let field = ""; let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; } else field += c; }
    else if (c === '"') inQ = true;
    else if (c === ",") { cur.push(field); field = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; cur.push(field); out.push(cur); cur = []; field = ""; }
    else field += c;
  }
  if (field.length || cur.length) { cur.push(field); out.push(cur); }
  const rows = out.filter((r) => r.some((c) => c.trim() !== ""));
  return { header: rows[0] || [], rows: rows.slice(1) };
}

// ---------- IMPORT ----------
export function CsvImport({ model, fields, onDone }:
  { model: string; fields: CsvField[]; onDone?: (r: { imported: number; errors: number }) => void }) {
  const loc = useLocale();
  const T = useCallback((k: FabI18nKey) => i18n(loc, k), [loc]);
  const coll = useMemo(() => collection<Row>(model), [model]);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [phase, setPhase] = useState<"upload" | "map" | "importing" | "done">("upload");
  const [header, setHeader] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, string>>({});   // colIdx → fieldId ('' = ignore)
  const [fileErr, setFileErr] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ imported: number; errors: { line: number; msg: string }[] } | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f || !/\.csv$/i.test(f.name) || f.size > 10 * 1024 * 1024) { setFileErr(true); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const { header: h, rows: r } = parseCsv(String(reader.result || ""));
      if (!h.length || !r.length) { setFileErr(true); return; }
      const auto: Record<number, string> = {};
      h.forEach((col, i) => {
        const hit = fields.find((f) => norm(f.id) === norm(col) || norm(f.label) === norm(col)
          || norm(col).includes(norm(f.id)) || norm(f.label).includes(norm(col)));
        if (hit && !Object.values(auto).includes(hit.id)) auto[i] = hit.id;
      });
      setHeader(h); setRows(r); setMapping(auto); setFileErr(false); setPhase("map");
    };
    reader.readAsText(f);
  }

  const mappedFieldIds = new Set(Object.values(mapping).filter(Boolean));
  const missingRequired = fields.filter((f) => f.required && !mappedFieldIds.has(f.id));
  const previewCols = fields.filter((f) => mappedFieldIds.has(f.id)).slice(0, 2);
  const colOf = (fieldId: string) => Number(Object.entries(mapping).find(([, v]) => v === fieldId)?.[0] ?? -1);

  async function runImport() {
    setPhase("importing"); setProgress(0);
    let imported = 0; const errors: { line: number; msg: string }[] = [];
    for (let r = 0; r < rows.length; r++) {
      const obj: Record<string, unknown> = {};
      for (const [ci, fid] of Object.entries(mapping)) if (fid) obj[fid] = rows[r][Number(ci)] ?? "";
      const miss = fields.find((f) => f.required && !String(obj[f.id] ?? "").trim());
      if (miss) { errors.push({ line: r + 2, msg: `${miss.label} — inválido` }); setProgress(r + 1); continue; }
      try { await coll.create(obj); imported++; } catch { errors.push({ line: r + 2, msg: "erro ao salvar" }); }
      setProgress(r + 1);
    }
    setResult({ imported, errors }); setPhase("done"); onDone?.({ imported, errors: errors.length });
  }

  const steps: [FabI18nKey, boolean, boolean][] = [
    ["cv.stepUpload", phase !== "upload", phase === "upload"],
    ["cv.stepMap", phase === "importing" || phase === "done", phase === "map"],
    ["cv.stepPreview", phase === "done", false],
    ["cv.stepConfirm", phase === "done", phase === "importing"],
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-5 flex items-center">
        {steps.map(([k, done, active], i) => (
          <div key={i} className="flex flex-1 items-center last:flex-none">
            <div className="flex items-center gap-2">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold ${done ? "bg-[var(--success)] text-white" : active ? "bg-primary text-primary-foreground" : "border border-border bg-muted text-muted-foreground"}`}>{done ? "✓" : i + 1}</span>
              <span className={`text-xs font-semibold ${active || done ? "text-foreground" : "text-muted-foreground"}`}>{T(k)}</span>
            </div>
            {i < 3 && <div className={`mx-2 h-0.5 flex-1 ${done ? "bg-[var(--success)]" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />

      {phase === "upload" && (
        <div>
          <button onClick={() => fileRef.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-muted py-10 text-center hover:border-primary">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
            <span className="text-[13.5px] font-bold text-foreground">{T("cv.upload")}</span>
            <span className="text-xs text-muted-foreground">{T("cv.uploadSub")}</span>
          </button>
          {fileErr && (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-destructive p-3">
              <span className="text-[13px] font-bold text-destructive">{T("cv.invalidFile")}</span>
              <span className="text-xs text-muted-foreground">{T("cv.invalidFileSub")}</span>
            </div>
          )}
        </div>
      )}

      {phase === "map" && (
        <div className="flex flex-wrap gap-5">
          <div className="min-w-[320px] flex-1">
            <div className="text-[13px] font-bold text-foreground">{T("cv.mapTitle")}</div>
            <div className="mb-3.5 text-xs text-muted-foreground">{T("cv.mapSub")}</div>
            <div className="flex flex-col gap-2.5">
              {header.map((col, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1 truncate rounded-lg border border-border bg-muted px-3 py-2.5 font-mono text-[12.5px] text-foreground/80">{col || `col ${i + 1}`}</div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-none text-muted-foreground"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  <select value={mapping[i] ?? ""} onChange={(e) => setMapping((m) => ({ ...m, [i]: e.target.value }))}
                    className="flex-1 rounded-lg border border-border bg-card px-3 py-2.5 text-[12.5px] text-foreground outline-none">
                    <option value="">{T("cv.ignore")}</option>
                    {fields.map((f) => <option key={f.id} value={f.id}>{f.label}{f.required ? " *" : ""}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
          <div className="w-full flex-none md:w-80">
            <div className="mb-3.5 text-[13px] font-bold text-foreground">{T("cv.preview")} · {Math.min(3, rows.length)}/{rows.length}</div>
            {previewCols.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-border text-[11.5px]">
                <div className="grid bg-muted font-bold text-muted-foreground" style={{ gridTemplateColumns: `repeat(${previewCols.length},1fr)` }}>
                  {previewCols.map((f) => <span key={f.id} className="border-r border-border px-2.5 py-2 last:border-r-0">{f.label}</span>)}
                </div>
                {rows.slice(0, 3).map((r, ri) => (
                  <div key={ri} className="grid border-t border-border" style={{ gridTemplateColumns: `repeat(${previewCols.length},1fr)` }}>
                    {previewCols.map((f) => <span key={f.id} className="truncate border-r border-border px-2.5 py-2 last:border-r-0 text-foreground/80">{r[colOf(f.id)] || "—"}</span>)}
                  </div>
                ))}
              </div>
            )}
            {missingRequired.length > 0 && (
              <div className="mt-3 rounded-xl border border-[var(--warning)] p-3 text-xs">
                <span className="font-bold text-[var(--warning)]">{T("cv.incompleteMap")}</span> <span className="text-muted-foreground">{missingRequired.map((f) => f.label).join(", ")}</span>
              </div>
            )}
            <button onClick={runImport} disabled={missingRequired.length > 0} className="mt-3.5 h-11 w-full rounded-xl bg-primary text-[13.5px] font-bold text-primary-foreground disabled:opacity-50">
              {T("cv.import")} {rows.length}
            </button>
          </div>
        </div>
      )}

      {phase === "importing" && (
        <div className="flex flex-col justify-center gap-3 py-6">
          <div className="flex items-center gap-2.5"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.4" strokeLinecap="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.2-8.5" /></svg><span className="text-[13px] font-bold text-foreground">{T("cv.importing")}</span></div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${rows.length ? (progress / rows.length) * 100 : 0}%` }} /></div>
          <div className="flex justify-between text-[11.5px] text-muted-foreground"><span>{progress} / {rows.length}</span><span>{Math.round(rows.length ? (progress / rows.length) * 100 : 0)}%</span></div>
        </div>
      )}

      {phase === "done" && result && (
        <div className="flex flex-col gap-2.5">
          <div className="flex gap-2.5">
            <div className="flex-1 rounded-xl bg-[var(--success)]/12 p-3 text-center"><div className="font-display text-2xl font-bold text-[var(--success)]">{result.imported}</div><div className="text-[10.5px] font-semibold text-[var(--success)]">{T("cv.imported")}</div></div>
            <div className="flex-1 rounded-xl bg-destructive/10 p-3 text-center"><div className="font-display text-2xl font-bold text-destructive">{result.errors.length}</div><div className="text-[10.5px] font-semibold text-destructive">{T("cv.withError")}</div></div>
          </div>
          {result.errors.length > 0 && (
            <div className="max-h-32 overflow-auto rounded-xl border border-border p-2.5 text-[11px] text-muted-foreground">
              {result.errors.slice(0, 50).map((e, i) => <div key={i} className="border-b border-border py-0.5 last:border-b-0">{T("cv.line")} {e.line} · {e.msg}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- EXPORT ----------
export function CsvExport({ model, fields, filter, filename }:
  { model: string; fields: CsvField[]; filter?: Record<string, string | number | boolean>; filename?: string }) {
  const loc = useLocale();
  const T = useCallback((k: FabI18nKey) => i18n(loc, k), [loc]);
  const coll = useMemo(() => collection<Row>(model), [model]);
  const [sel, setSel] = useState<Set<string>>(new Set(fields.map((f) => f.id)));
  const [busy, setBusy] = useState(false);

  async function download() {
    if (busy) return;
    setBusy(true);
    try {
      const chosen = fields.filter((f) => sel.has(f.id));
      const rows = await coll.list({ limit: 5000, ...(filter ? { filter } : {}) });
      const head = chosen.map((f) => csvCell(f.label)).join(",");
      const body = rows.map((r) => chosen.map((f) => csvCell((r as Row)[f.id])).join(",")).join("\n");
      const blob = new Blob(["﻿" + head + "\n" + body], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename || `${model}.csv`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
    } catch { /* */ } finally { setBusy(false); }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 text-[13px] font-bold text-foreground">{T("cv.chooseFields")}</div>
      <div className="mb-4 flex flex-wrap gap-2">
        {fields.map((f) => {
          const on = sel.has(f.id);
          return (
            <button key={f.id} onClick={() => setSel((s) => { const n = new Set(s); n.has(f.id) ? n.delete(f.id) : n.add(f.id); return n; })}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-semibold ${on ? "border-primary/40 bg-accent text-primary" : "border-border text-muted-foreground"}`}>
              {f.label}{on && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
            </button>
          );
        })}
      </div>
      <button onClick={download} disabled={busy || sel.size === 0} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[13px] font-bold text-primary-foreground disabled:opacity-50">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>{busy ? T("cv.exporting") : T("cv.download")}
      </button>
    </div>
  );
}
