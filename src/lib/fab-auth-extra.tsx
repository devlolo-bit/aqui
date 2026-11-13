/**
 * <TwoFactor/> and <MagicLink/> — the READY-MADE pieces of extra auth (Tier 3). They are PRESENTATIONAL (driven by
 * props/callbacks): the platform imposes no TOTP/magic-link backend — the app plugs in whatever it has. TwoFactor:
 * a `mode='setup'` shows the QR (otpauth) + the key; a `mode='verify'` shows the segmented 6-digit input + verify.
 * MagicLink: the "we sent a link" screen with a resend (a cooldown). Token-driven and light/dark.
 *
 * `<TwoFactor mode="setup" secret="JBSWY3DPEHPK3PXP" issuer="App" account="ana@x.com" />`
 * `<TwoFactor mode="verify" onVerify={(code)=>api.verify2fa(code)} />` · `<MagicLink email="ana@x.com" onResend={…} />`
 * Platform components — the app USES them, it does not recreate them. Code-split by the fab-client.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { QRCode } from "./fab-qr";
import { useLocale } from "./fab-client";
import { t as i18n, type FabI18nKey } from "./fab-i18n";

type VerifyResult = { ok: boolean; message?: string } | void;

function SegmentedInput({ length, onComplete }: { length: number; onComplete: (code: string) => void }) {
  const [vals, setVals] = useState<string[]>(() => Array(length).fill(""));
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  function setAt(i: number, v: string) {
    const digit = v.replace(/\D/g, "").slice(-1);
    const next = [...vals]; next[i] = digit; setVals(next);
    if (digit && i < length - 1) refs.current[i + 1]?.focus();
    const code = next.join(""); if (code.length === length && !next.includes("")) onComplete(code);
  }
  function onKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !vals[i] && i > 0) refs.current[i - 1]?.focus();
  }
  function onPaste(e: React.ClipboardEvent) {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!digits) return; e.preventDefault();
    const next = Array(length).fill("").map((_, i) => digits[i] || "");
    setVals(next); refs.current[Math.min(digits.length, length - 1)]?.focus();
    if (digits.length === length) onComplete(digits);
  }
  return (
    <div className="flex gap-2" onPaste={onPaste}>
      {vals.map((v, i) => (
        <input key={i} ref={(el) => { refs.current[i] = el; }} value={v} inputMode="numeric" maxLength={1}
          onChange={(e) => setAt(i, e.target.value)} onKeyDown={(e) => onKey(i, e)}
          className="aspect-[1/1.15] flex-1 rounded-lg border-[1.5px] border-border bg-card text-center font-display text-[22px] font-bold text-foreground outline-none focus:border-primary focus:ring-[3px] focus:ring-accent" />
      ))}
    </div>
  );
}

export function TwoFactor({ mode, secret = "", issuer = "App", account = "", qrValue, onVerify, length = 6 }:
  { mode: "setup" | "verify"; secret?: string; issuer?: string; account?: string; qrValue?: string; onVerify?: (code: string) => VerifyResult | Promise<VerifyResult>; length?: number }) {
  const loc = useLocale();
  const T = useCallback((k: FabI18nKey) => i18n(loc, k), [loc]);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  if (mode === "setup") {
    const otpauth = qrValue || `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
    const grouped = secret.replace(/\s/g, "").replace(/(.{4})/g, "$1 ").trim();
    return (
      <div className="rounded-2xl border border-border bg-card p-5 text-center">
        <div className="text-sm font-bold text-foreground">{T("ax.scanTitle")}</div>
        <div className="mb-3.5 text-[11.5px] text-muted-foreground">{T("ax.scanSub")}</div>
        <div className="mx-auto w-fit"><QRCode value={otpauth} size={132} /></div>
        <div className="mt-3 text-[11px] text-muted-foreground">{T("ax.orKey")}</div>
        <div className="mt-1.5 rounded-lg border border-border bg-muted p-2 font-mono text-[12px] font-semibold tracking-[0.1em] text-foreground">{grouped || "—"}</div>
      </div>
    );
  }

  async function verify(c: string) {
    setCode(c); setBusy(true); setError("");
    try { const r = (await onVerify?.(c)) || { ok: true }; if (!r.ok) setError(r.message || T("ax.invalidCode")); }
    catch { setError(T("ax.invalidCode")); } finally { setBusy(false); }
  }
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3.5 flex h-13 w-13 items-center justify-center rounded-2xl bg-accent p-3.5 text-primary"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></div>
      <div className="text-sm font-bold text-foreground">{T("ax.enterCode")}</div>
      <div className="mb-4 text-[11.5px] text-muted-foreground">{T("ax.enterCodeSub")}</div>
      <SegmentedInput length={length} onComplete={verify} />
      {error && <div className="mt-2 text-[12px] font-semibold text-destructive">{error}</div>}
      <button onClick={() => code.length === length && verify(code)} disabled={busy || code.length < length}
        className="mt-4 h-11 w-full rounded-xl bg-primary text-[13.5px] font-bold text-primary-foreground disabled:opacity-50">{busy ? T("ax.verifying") : T("ax.verify")}</button>
    </div>
  );
}

export function MagicLink({ email, onResend, expiresMinutes = 15, resendCooldown = 45 }:
  { email: string; onResend?: () => void | Promise<void>; expiresMinutes?: number; resendCooldown?: number }) {
  const loc = useLocale();
  const T = useCallback((k: FabI18nKey) => i18n(loc, k), [loc]);
  const [left, setLeft] = useState(0);
  useEffect(() => { if (left <= 0) return; const t = setInterval(() => setLeft((s) => s - 1), 1000); return () => clearInterval(t); }, [left]);
  async function resend() { if (left > 0) return; await onResend?.(); setLeft(resendCooldown); }
  const mm = Math.floor(left / 60), ss = String(left % 60).padStart(2, "0");

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-accent text-primary"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg></div>
      <div className="text-[15px] font-bold text-foreground">{T("ax.magicSent")}</div>
      <div className="max-w-[240px] text-[12.5px] leading-relaxed text-muted-foreground">
        {T("ax.magicCheck")} <b className="text-foreground">{email}</b> {T("ax.magicTap")} {T("ax.magicExpires").replace("{n}", String(expiresMinutes))}
      </div>
      {onResend && (
        <button onClick={resend} disabled={left > 0} className="mt-1 h-10 rounded-xl border border-border px-4 text-[12.5px] font-bold text-primary disabled:opacity-60">
          {left > 0 ? `${T("ax.resendIn")} ${mm}:${ss}` : T("ax.resend")}
        </button>
      )}
    </div>
  );
}
