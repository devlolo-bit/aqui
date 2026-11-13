import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** It combines Tailwind classes, resolving conflicts (the shadcn/ui pattern). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** It guarantees an absolute URL for use in an <img src=...>. Upload URLs (uploadFile) already come absolute — this is only
 * a safety net: if the `url` is already absolute (http/https/data/blob) it returns it as is; if it is relative, it resolves it against
 * the API's base (VITE_FAB_BASE_URL) or the origin in the browser. */
export function ensureAbsoluteUrl(url?: string | null): string {
  if (!url) return "";
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  const base = (import.meta.env.VITE_FAB_BASE_URL || "").replace(/\/$/, "")
    || (typeof window !== "undefined" ? window.location.origin : "");
  return url.startsWith("/") ? `${base}${url}` : `${base}/${url}`;
}

/** A CPF or CNPJ in its canonical form: letters and digits only, upper case ("12.abc.345/01de-35" → "12ABC34501DE35").
 * The CNPJ may be ALPHANUMERIC (Receita Federal, issued since July 2026), so never strip letters from a document and
 * never store it as a number. "" when the text carries anything a document never does (an "@", a "+"). */
export function normalizeTaxId(value?: string | null): string {
  const s = (value ?? "").trim();
  if (!s || !/^[0-9A-Za-z.\-/\s]+$/.test(s)) return "";
  return s.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
}

function taxCheckDigit(values: number[], weights: number[]): number {
  const rest = values.reduce((sum, v, i) => sum + v * weights[i], 0) % 11;
  return rest < 2 ? 0 : 11 - rest;
}

/** A CPF whose two check digits are right (with or without the mask). */
export function isValidCpf(value?: string | null): boolean {
  const d = normalizeTaxId(value);
  if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return false;
  const n = [...d].map(Number);
  return taxCheckDigit(n.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]) === n[9]
    && taxCheckDigit(n.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]) === n[10];
}

/** A CNPJ, numeric OR alphanumeric, whose two check digits are right. Each character counts as its ASCII code minus
 * 48 (digits keep their value, A = 17 … Z = 42), so the old numeric CNPJs validate unchanged. */
export function isValidCnpj(value?: string | null): boolean {
  const d = normalizeTaxId(value);
  if (!/^[0-9A-Z]{12}\d{2}$/.test(d) || /^(\d)\1{13}$/.test(d)) return false;
  const v = [...d].map((c) => c.charCodeAt(0) - 48);
  return taxCheckDigit(v.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === v[12]
    && taxCheckDigit(v.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === v[13];
}

/** The display mask: 000.000.000-00 for a CPF, AA.AAA.AAA/AAAA-00 for a CNPJ (letters kept, upper case). Anything
 * that is neither 11 nor 14 characters comes back as typed, so a half-typed value is never mangled. */
export function formatTaxId(value?: string | null): string {
  const d = normalizeTaxId(value);
  if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  return value ?? "";
}
