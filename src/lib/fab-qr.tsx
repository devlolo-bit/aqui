/**
 * <QRCode/> and <QRScanner/> — the READY-MADE QR pieces (Tier 3). QRCode: it generates a value's QR (the `qrcode` lib), with a
 * download/share. QRScanner: it reads through the camera using the native `BarcodeDetector` (with no decoder dependency),
 * with a frame, a scan line and success/error states; it degrades with a warning where there is no support. Token-driven.
 *
 * `<QRCode value="https://…" label="Menu" />` · `<QRScanner onScan={(v)=>validate(v)} />`
 * Platform components — the app USES them, it does not recreate them. Code-split by the fab-client.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import QRCodeLib from "qrcode";
import { useLocale } from "./fab-client";
import { t as i18n, type FabI18nKey } from "./fab-i18n";

// the BarcodeDetector is not in the standard DOM types — a minimal local type.
type BarcodeDetectorLike = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorLike;

export function QRCode({ value, size = 180, label, sublabel, filename }:
  { value: string; size?: number; label?: string; sublabel?: string; filename?: string }) {
  const loc = useLocale();
  const T = useCallback((k: FabI18nKey) => i18n(loc, k), [loc]);
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    let alive = true;
    QRCodeLib.toDataURL(value || " ", { margin: 1, width: size * 3, errorCorrectionLevel: "M" })
      .then((url) => alive && setSrc(url)).catch(() => alive && setSrc(""));
    return () => { alive = false; };
  }, [value, size]);

  function download() {
    if (!src) return;
    const a = document.createElement("a"); a.href = src; a.download = filename || "qrcode.png";
    document.body.appendChild(a); a.click(); a.remove();
  }
  async function share() {
    try {
      const nav = navigator as Navigator & { share?: (d: unknown) => Promise<void>; canShare?: (d: unknown) => boolean };
      const blob = await (await fetch(src)).blob();
      const file = new File([blob], filename || "qrcode.png", { type: "image/png" });
      if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) { await nav.share({ files: [file], title: label || "QR" }); return; }
    } catch { /* it falls back */ }
    try { await navigator.clipboard.writeText(value); } catch { /* */ }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 text-center">
      <div className="inline-block rounded-2xl bg-white p-3.5 shadow-md">
        {src ? <img src={src} alt="QR" width={size} height={size} style={{ display: "block" }} />
          : <div className="animate-pulse bg-muted" style={{ width: size, height: size, borderRadius: 8 }} />}
      </div>
      {label && <div className="mt-3.5 text-[13px] font-bold text-foreground">{label}</div>}
      {sublabel && <div className="text-[11px] text-muted-foreground">{sublabel}</div>}
      <div className="mt-3.5 flex gap-2">
        <button onClick={download} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border text-[12.5px] font-bold text-foreground/80"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>{T("qr.download")}</button>
        <button onClick={share} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary text-[12.5px] font-bold text-primary-foreground"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></svg>{T("qr.share")}</button>
      </div>
    </div>
  );
}

type ScanResult = { ok: boolean; message?: string } | void;

export function QRScanner({ onScan, className }:
  { onScan?: (value: string) => ScanResult | Promise<ScanResult>; className?: string }) {
  const loc = useLocale();
  const T = useCallback((k: FabI18nKey) => i18n(loc, k), [loc]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastRef = useRef<string>("");
  const pausedRef = useRef(false);                          // it pauses the reading without restarting the camera
  const onScanRef = useRef(onScan);                         // always the latest prop, without restarting the effect
  onScanRef.current = onScan;
  const [err, setErr] = useState<"none" | "unsupported" | "camera">("none");
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(null);
  const [paused, setPaused] = useState(false);
  const pause = (v: boolean) => { pausedRef.current = v; setPaused(v); };

  useEffect(() => {   // it mounts the camera ONCE (the refs avoid a restart from a re-render/a new onScan)
    const Ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    if (!Ctor) { setErr("unsupported"); return; }
    let detector: BarcodeDetectorLike; try { detector = new Ctor({ formats: ["qr_code"] }); } catch { setErr("unsupported"); return; }
    let raf = 0; let alive = true;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!alive) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}); }
      } catch { setErr("camera"); return; }

      const tick = async () => {
        if (!alive) return;
        if (!pausedRef.current && videoRef.current && videoRef.current.readyState >= 2) {
          try {
            const codes = await detector.detect(videoRef.current);
            const val = codes[0]?.rawValue;
            if (val && val !== lastRef.current) {
              lastRef.current = val; pause(true);
              const r = (await onScanRef.current?.(val)) || { ok: true };
              if (alive) setResult(r);
              setTimeout(() => { if (alive) { setResult(null); pause(false); lastRef.current = ""; } }, 2200);
            }
          } catch { /* a frame with no reading */ }
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    })();

    return () => {
      alive = false; cancelAnimationFrame(raf);
      streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null;
    };
  }, []);

  if (err !== "none") {
    return (
      <div className={`flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-6 text-center ${className || ""}`}>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><path d="m1 1 22 22" /></svg></div>
        <div className="text-[13px] font-bold text-foreground">{T(err === "unsupported" ? "qr.notSupported" : "qr.cameraError")}</div>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-2xl border border-border bg-card ${className || ""}`}>
      <div className="relative aspect-square overflow-hidden bg-black">
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        {/* the frame */}
        <div className="pointer-events-none absolute" style={{ inset: "22%" }}>
          {(["top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-md", "top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-md", "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-md", "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-md"] as const).map((c, i) => (
            <span key={i} className={`absolute h-6 w-6 border-white ${c}`} />
          ))}
        </div>
        {!paused && <div className="pointer-events-none absolute left-[22%] right-[22%] h-0.5 bg-primary shadow-[0_0_12px_var(--primary)]" style={{ animation: "fabScan 2.2s ease-in-out infinite" }} />}
        {!result && <div className="absolute bottom-3 left-0 right-0 text-center text-[12px] font-semibold text-white/90">{T("qr.scanHint")}</div>}
        {result && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55 text-center">
            <div className={`flex h-14 w-14 items-center justify-center rounded-full ${result.ok ? "bg-[var(--success)]/20 text-[var(--success)]" : "bg-destructive/20 text-destructive"}`}>
              {result.ok
                ? <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>}
            </div>
            <div className="px-6 text-[13px] font-bold text-white">{result.message || T(result.ok ? "qr.scanned" : "qr.invalid")}</div>
          </div>
        )}
      </div>
      <style>{"@keyframes fabScan{0%,100%{top:22%}50%{top:76%}}"}</style>
    </div>
  );
}
