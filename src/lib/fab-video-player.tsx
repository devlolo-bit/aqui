// <VideoPlayer/> — the platform's video piece (the Fabapp / Claude Design design).
//
// The app passes 3 props (`src`, `title`, `poster`); the player works out on its own WHAT the source is — because the SAME `video`
// field holds different things over the video's life, and the AI has no way of knowing which:
//   HLS (Cloudflare Stream, adaptive) · MP4 (the master on R2: the encoding is under way, OR the account has no credit) · YouTube/Vimeo.
//
// Three states here are NOT corner cases — they are the normal path, and they are why this piece exists:
//   1. PROCESSING    — it plays as MP4 while it transcodes; the quality gear DISAPPEARS (nothing broken, just not adaptive
//                      yet). The player promotes itself to HLS once it is ready.
//   2. AN EXPIRED LINK — the playback URL is SIGNED and lasts ~2h. The student who came back after lunch gets a 401/403.
//                      We keep the `currentTime`, ask for a new URL and RESUME AT THE VERY SAME SECOND (never a black
//                      rectangle, never losing the spot).
//   3. A NETWORK ERROR — a retry with backoff + a manual button, distinct from "the video was removed" (a 404).
//
// The hls.js comes in through a code split and ONLY when the source is HLS in a browser that needs it (Safari plays .m3u8 natively).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "./fab-client";
import { t } from "./fab-i18n";
import { videoSource } from "./fab-video";

export type VideoPlayerProps = {
  /** the `video` field's value: a URL resolved by the platform (a signed HLS/MP4) OR a YouTube/Vimeo link. */
  src: string | null | undefined;
  title?: string;
  poster?: string;
  /** optional subtitles (VTT). Without them the CC button does not appear. */
  captions?: { src: string; label?: string; lang?: string }[];
  /** called on passing X% watched — this is how the app unlocks the quiz / marks it "completed". */
  onProgress?: (info: { seconds: number; duration: number; percent: number }) => void;
  /** it reloads the source when the signed link expires (the app redoes the `get`/`list` and returns the new URL). */
  onExpired?: () => void;
  className?: string;
  autoPlay?: boolean;
};

type Level = { i: number; label: string };

const RATES = [0.75, 1, 1.25, 1.5, 2];
const SEEK = 10;

const mmss = (s: number) => {
  if (!s || Number.isNaN(s)) s = 0;
  const total = Math.floor(s);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? `${h}:` : ""}${mm}:${String(sec).padStart(2, "0")}`;
};

// The video's IDENTITY = the URL WITHOUT the query. The platform RE-SIGNS the URL on every read of the record (a new token,
// a new X-Amz-Date) → the `src`'s string changes even though it is the same video. Without this, any refetch (a useLive, a
// list() after saving progress) would swap the <video>'s `src` and the student would go back to second zero mid-lesson.
const identity = (url: string) => {
  const i = url.indexOf("?");
  return i === -1 ? url : url.slice(0, i);
};

export function VideoPlayer({
  src, title, poster, captions, onProgress, onExpired, className, autoPlay,
}: VideoPlayerProps) {
  const loc = useLocale();
  const source = useMemo(() => videoSource(src), [src]);
  const url = source.kind === "empty" ? "" : source.url;
  const id = url ? identity(url) : "";
  const isHls = source.kind === "hls";
  const isEmbed = source.kind === "youtube" || source.kind === "vimeo";

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<{ destroy: () => void; currentLevel: number } | null>(null);
  const attemptRef = useRef(0);
  const resumeRef = useRef(0);      // the second to resume at after a reload caused by an expiration
  const savedRef = useRef(0);
  const flashRef = useRef<number | undefined>(undefined);

  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffer, setBuffer] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [rate, setRate] = useState(1);
  const [levels, setLevels] = useState<Level[]>([]);
  const [level, setLevel] = useState(-1);           // -1 = auto
  const [autoLevel, setAutoLevel] = useState("");   // the label of the level the auto mode chose
  const [error, setError] = useState<null | "expirado" | "rede" | "removido">(null);
  const [chrome, setChrome] = useState(true);
  const [menu, setMenu] = useState<null | "speed" | "quality">(null);
  const [cc, setCc] = useState(false);
  const [flash, setFlash] = useState<null | "back" | "fwd">(null);
  const [resume, setResume] = useState(0);        // >0 → it offers "continue from X"
  const [hover, setHover] = useState<number | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const progressKey = id ? `fab.vp.${id}` : "";

  // ---- the source: HLS (hls.js/native) or a direct MP4 --------------------------------------------------------------
  // The central rule, and the easiest to get wrong: the platform RE-SIGNS the URL on every read of the record (a new token, the same
  // video). Two OPPOSITE traps:
  //   • reacting to every string change → any refetch (a useLive, a list() when saving progress) reloads the source and
  //     throws the student back to second zero mid-lesson;
  //   • ignoring the string change → the NEW URL never reaches the <video>, and the expired link's "Reload" reloads…
  //     the expired link. Forever.
  // So: the same IDENTITY (the url with no query) = a re-signature → it only applies when we are stuck on an error (that is the retry).
  // A different identity = another source → it loads. If it is the MP4→HLS PROMOTION (the encoding finished), it preserves the second.
  const urlRef = useRef(url);
  urlRef.current = url;
  const appliedRef = useRef("");
  const kindRef = useRef(source.kind);
  const onExpiredRef = useRef(onExpired);
  onExpiredRef.current = onExpired;

  const mountSource = useCallback((target: string, resumeAt: number) => {
    const v = videoRef.current;
    if (!v) return;
    try { hlsRef.current?.destroy(); } catch { /* */ }
    hlsRef.current = null;
    setError(null);
    appliedRef.current = target;

    const hls = videoSource(target).kind === "hls";
    // Safari/iOS play HLS natively — loading hls.js there wastes bandwidth and fights the native player.
    if (!hls || v.canPlayType("application/vnd.apple.mpegurl")) {
      setLevels([]);                    // MP4/native: no levels → the gear DISAPPEARS (it degrades cleanly, not broken)
      v.src = target;
      v.load();
      if (resumeAt) v.addEventListener("loadedmetadata", () => { v.currentTime = resumeAt; }, { once: true });
      return;
    }

    let alive = true;
    cancelRef.current = () => { alive = false; };
    import("hls.js").then(({ default: Hls }) => {
      if (!alive || !videoRef.current) return;
      if (!Hls.isSupported()) { videoRef.current.src = target; return; }
      const inst = new Hls({ enableWorker: true, startPosition: resumeAt || -1 });
      hlsRef.current = inst;
      inst.loadSource(target);
      inst.attachMedia(videoRef.current);
      inst.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!alive) return;
        setLevels(inst.levels.map((l: any, i: number) => ({ i, label: `${l.height}p` })));
      });
      inst.on(Hls.Events.LEVEL_SWITCHED, (_e: unknown, d: any) => {
        if (!alive) return;
        const l = inst.levels?.[d.level];
        setAutoLevel(l ? `${l.height}p` : "");
      });
      inst.on(Hls.Events.ERROR, (_e: unknown, d: any) => {
        if (!alive || !d?.fatal) return;   // non-fatal: the hls.js recovers on its own, do not scare the student
        const st = d?.response?.code;     // ONLY on HLS do we have the real HTTP status → only here do we tell the cases apart
        fail(st === 401 || st === 403 ? "expirado" : st === 404 ? "removido" : "rede");
      });
    }).catch(() => fail("rede"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!url || isEmbed) return;
    const previous = appliedRef.current;
    const sameSource = previous && identity(previous) === identity(url);

    if (sameSource) {
      // a re-signature. It only acts when we are stuck on an error — there THIS new url is exactly what was missing.
      if (errorRef.current) mountSource(url, resumeRef.current);
      return;
    }
    // a new source. The MP4→HLS promotion is the SAME video finishing its processing: it preserves the second the student is at.
    const promotion = kindRef.current === "mp4" && source.kind === "hls" && !!previous;
    const seconds = promotion ? (videoRef.current?.currentTime || 0) : 0;
    kindRef.current = source.kind;
    mountSource(url, seconds);

    return () => { cancelRef.current?.(); try { hlsRef.current?.destroy(); } catch { /* */ } hlsRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, isEmbed, source.kind, mountSource]);

  // ---- the error: what we REALLY know --------------------------------------------------------------------------
  // Only on the HLS path does the hls.js hand us the HTTP status (401/403 = an expired token, 404 = removed). On the
  // MP4/native path the <video> only says "it errored", with no status — and it can NOT be found out with a HEAD on the URL: R2's
  // signature (SigV4) includes the METHOD, so a HEAD on a URL signed for a GET answers 403 even with a VALID link. In other
  // words: the HEAD would report "expired" on a good video. We prefer not to lie: on MP4 we show the recoverable error, whose
  // action for the student is the SAME as the expiration's (reload → a new URL → resume at the second they stopped at).
  const errorRef = useRef<null | "expirado" | "rede" | "removido">(null);
  errorRef.current = error;

  const fail = useCallback((reason: "expirado" | "rede" | "removido") => {
    const v = videoRef.current;
    if (v?.currentTime) resumeRef.current = v.currentTime;
    setError(reason);
    setPlaying(false);
    setBuffering(false);
    if (reason === "expirado") onExpiredRef.current?.();   // the app redoes the fetch → a NEW signed URL arrives
  }, []);

  // The retry: it asks the app for the new URL (onExpired) AND remounts the CURRENT source, resuming at the spot. If the new URL arrives, the
  // effect above applies it (we are in an error → it acts). If the app did not implement onExpired, we still remount —
  // it solves the transient network error, which is the other case.
  const retry = useCallback(() => {
    attemptRef.current += 1;
    onExpiredRef.current?.();
    mountSource(urlRef.current, resumeRef.current);
    videoRef.current?.play().catch(() => { /* */ });
  }, [mountSource]);

  // The <track>'s `default` attribute is only read by the browser at the element's LOAD — changing the prop afterwards does NOT change the
  // subtitle's mode. Without this the CC button lit up and nothing appeared on the screen.
  useEffect(() => {
    const tracks = videoRef.current?.textTracks;
    if (!tracks) return;
    for (let i = 0; i < tracks.length; i++) tracks[i].mode = cc && i === 0 ? "showing" : "disabled";
  }, [cc, captions]);

  // ---- the saved progress (resuming where they left off) ------------------------------------------------------------
  useEffect(() => {
    if (!progressKey) return;
    try {
      const s = Number(localStorage.getItem(progressKey) || 0);
      if (s > 5) setResume(s);           // < 5s is not worth offering: the student had barely started
    } catch { /* */ }
  }, [progressKey]);

  const save = useCallback((s: number) => {
    if (!progressKey) return;
    const now = Date.now();
    if (now - savedRef.current < 1500) return;   // a throttle: do not write to the localStorage on every timeupdate
    savedRef.current = now;
    try { localStorage.setItem(progressKey, String(Math.floor(s))); } catch { /* */ }
  }, [progressKey]);

  // ---- controls -------------------------------------------------------------------------------------------------
  const play = useCallback(() => { videoRef.current?.play().catch(() => { /* */ }); }, []);
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => { /* */ }); else v.pause();
  }, []);
  const skip = useCallback((delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.min(Math.max(0, v.currentTime + delta), v.duration || Infinity);
    setFlash(delta < 0 ? "back" : "fwd");
    window.clearTimeout(flashRef.current);
    flashRef.current = window.setTimeout(() => setFlash(null), 480);
  }, []);
  const scrub = useCallback((e: React.MouseEvent) => {
    const v = videoRef.current, bar = barRef.current;
    if (!v || !bar || !v.duration) return;
    const r = bar.getBoundingClientRect();
    v.currentTime = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * v.duration;
  }, []);
  const pickLevel = useCallback((i: number) => {
    if (hlsRef.current) hlsRef.current.currentLevel = i;   // -1 = auto
    setLevel(i);
    setMenu(null);
  }, []);
  const toggleFullscreen = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) { document.exitFullscreen().catch(() => { /* */ }); return; }
    if (el.requestFullscreen) { el.requestFullscreen().catch(() => { /* */ }); return; }
    // an iPhone: the <div> does not go full screen — only the <video> itself, through Apple's API.
    (videoRef.current as any)?.webkitEnterFullscreen?.();
  }, []);
  const pip = useCallback(() => {
    const v = videoRef.current as any;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) (document as any).exitPictureInPicture();
      else v.requestPictureInPicture?.();
    } catch { /* */ }
  }, []);

  useEffect(() => {
    const on = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);

  // the shortcuts: only when the player has the focus (otherwise we would hijack the space/arrows of the app's PAGE)
  useEffect(() => {
    const el = stageRef.current;
    if (!el || isEmbed) return;
    const onKey = (e: KeyboardEvent) => {
      const v = videoRef.current;
      if (!v) return;
      const k = e.key.toLowerCase();
      if ([" ", "arrowleft", "arrowright", "arrowup", "arrowdown", "f", "m"].includes(k)) e.preventDefault();
      if (k === " ") togglePlay();
      else if (k === "arrowleft") skip(-SEEK);
      else if (k === "arrowright") skip(SEEK);
      else if (k === "arrowup") { v.volume = Math.min(1, v.volume + 0.1); v.muted = false; }
      else if (k === "arrowdown") v.volume = Math.max(0, v.volume - 0.1);
      else if (k === "f") toggleFullscreen();
      else if (k === "m") v.muted = !v.muted;
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [togglePlay, skip, toggleFullscreen, isEmbed]);

  // the chrome's auto-hide
  const idleRef = useRef<number | undefined>(undefined);
  const activity = useCallback(() => {
    setChrome(true);
    window.clearTimeout(idleRef.current);
    idleRef.current = window.setTimeout(() => { if (videoRef.current && !videoRef.current.paused) setChrome(false); }, 2600);
  }, []);
  useEffect(() => () => window.clearTimeout(idleRef.current), []);

  // a double tap on the sides = ±10s (the pattern the student already knows from YouTube)
  const tapRef = useRef(0);
  const wasPlayingRef = useRef(false);
  const noStage = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button,[role=slider]")) return;
    const now = Date.now();
    const r = stageRef.current?.getBoundingClientRect();
    if (r && now - tapRef.current < 300) {
      const x = (e.clientX - r.left) / r.width;
      if (x < 0.34 || x > 0.66) {
        skip(x < 0.34 ? -SEEK : SEEK);
        // the FIRST tap already fired the togglePlay() and paused. It undoes that: the student asked to skip, not to stop.
        if (wasPlayingRef.current) videoRef.current?.play().catch(() => { /* */ });
        return;
      }
    }
    tapRef.current = now;
    wasPlayingRef.current = !videoRef.current?.paused;
    togglePlay();
  }, [togglePlay, skip]);

  if (source.kind === "empty") return null;

  // ---- YouTube/Vimeo: the video is OUTSIDE the platform (free, but PUBLIC). The UI is the provider's. -------------
  if (isEmbed) {
    return (
      <div className={className ?? "relative w-full aspect-video overflow-hidden rounded-[var(--radius)] bg-black"}>
        <iframe
          src={source.url}
          title={title ?? "video"}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  }

  const pct = duration ? (current / duration) * 100 : 0;
  const bufPct = duration ? (buffer / duration) * 100 : 0;
  const btn = "flex h-11 w-11 flex-none items-center justify-center rounded-[10px] border-0 bg-transparent text-white hover:bg-white/15 cursor-pointer";
  const item = (active: boolean) =>
    `flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold ${active ? "text-white" : "text-white/70"} hover:bg-white/10`;

  return (
    <div className={className ?? "w-full"}>
      <div
        ref={stageRef}
        tabIndex={0}
        role="region"
        aria-label={title ?? "video"}
        onMouseMove={activity}
        onMouseLeave={() => { if (playing) setChrome(false); }}
        onClick={noStage}
        className="relative w-full aspect-video overflow-hidden rounded-[var(--radius)] bg-[#05040a] outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--primary)]"
        style={{ cursor: chrome ? "default" : "none" }}
      >
        <video
          ref={videoRef}
          playsInline
          autoPlay={autoPlay}
          preload="metadata"
          poster={poster}
          className="absolute inset-0 h-full w-full bg-[#05040a] object-contain"
          onPlay={() => { setPlaying(true); setStarted(true); activity(); }}
          onPause={() => { setPlaying(false); setChrome(true); }}
          onWaiting={() => setBuffering(true)}
          onPlaying={() => { setBuffering(false); attemptRef.current = 0; }}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
          onVolumeChange={(e) => { setMuted(e.currentTarget.muted); setVolume(e.currentTarget.volume); }}
          onRateChange={(e) => setRate(e.currentTarget.playbackRate)}
          // MP4/native exposes no status. An error here is "recoverable" — and the student's action (reload → a new URL →
          // resume) is the same as the expiration's, so we do not need to guess which of the two it was.
          onError={() => fail("rede")}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            setCurrent(v.currentTime);
            save(v.currentTime);
            if (v.buffered.length) setBuffer(v.buffered.end(v.buffered.length - 1));
            if (v.duration) onProgress?.({ seconds: v.currentTime, duration: v.duration, percent: (v.currentTime / v.duration) * 100 });
          }}
        >
          {(captions ?? []).map((c, i) => (
            <track key={i} kind="captions" src={c.src} label={c.label} srcLang={c.lang} />
          ))}
        </video>

        {/* THE ERROR: expired / the network / removed — never a black rectangle, never a "Something went wrong" */}
        {error && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0a0712]/95 px-6 text-center">
            <p className="text-[15px] font-bold text-white">
              {error === "expirado" ? t(loc, "vp.expiredTitle") : error === "removido" ? t(loc, "vp.goneTitle") : t(loc, "vp.errorTitle")}
            </p>
            <p className="mt-1.5 max-w-[300px] text-xs leading-relaxed text-white/60">
              {error === "expirado"
                ? `${t(loc, "vp.expiredBody")} ${resumeRef.current ? t(loc, "vp.resumeAt").replace("{time}", mmss(resumeRef.current)) : ""}`
                : error === "removido" ? t(loc, "vp.goneBody") : t(loc, "vp.errorBody")}
            </p>
            {error !== "removido" && (
              <button type="button" onClick={retry}
                className="mt-4 rounded-[10px] bg-[var(--primary)] px-5 py-2.5 text-[13px] font-bold text-white hover:brightness-110">
                {error === "expirado" ? t(loc, "vp.reload") : t(loc, "vp.retry")}
              </button>
            )}
          </div>
        )}

        {/* THE POSTER (before the 1st play) */}
        {!started && !error && (
          <div className="absolute inset-0 z-10 flex items-end bg-gradient-to-br from-[#2a1747]/80 to-[#0a0712] p-7">
            <button type="button" onClick={play} aria-label={t(loc, "vp.play")}
              className="absolute left-1/2 top-1/2 flex h-[82px] w-[82px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-2xl hover:brightness-110">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor" className="ml-1"><path d="M8 5v14l11-7z" /></svg>
            </button>
            {title && <div className="relative text-2xl font-bold text-white">{title}</div>}
          </div>
        )}

        {/* buffering */}
        {buffering && !error && (
          <div className="absolute left-1/2 top-1/2 h-[52px] w-[52px] -translate-x-1/2 -translate-y-1/2 animate-spin rounded-full border-[3px] border-white/20 border-t-white" />
        )}

        {/* the double tap's flash */}
        {flash && (
          <div className={`absolute bottom-0 top-0 flex w-[34%] items-center justify-center text-white ${flash === "back" ? "left-0" : "right-0"}`}>
            <div className="text-center">
              <div className="text-3xl font-bold">{flash === "back" ? "«" : "»"}</div>
              <div className="mt-0.5 text-xs font-bold">{SEEK}s</div>
            </div>
          </div>
        )}

        {/* RESUME WHERE THEY LEFT OFF — it offers, it does not force */}
        {resume > 0 && !started && !error && (
          <div className="absolute bottom-24 left-5 z-20 flex max-w-[360px] items-center gap-3 rounded-xl border border-white/10 bg-[#0c0914]/90 p-3 backdrop-blur">
            <div className="flex-1">
              <div className="text-[12.5px] font-bold text-white">{t(loc, "vp.resumeTitle")}</div>
              <div className="mt-px text-[11.5px] text-white/60">{t(loc, "vp.resumeAt").replace("{time}", mmss(resume))}</div>
            </div>
            <button type="button" onClick={() => setResume(0)} className="rounded-lg px-2.5 py-2 text-xs font-semibold text-white/70 hover:bg-white/10">
              {t(loc, "vp.fromStart")}
            </button>
            <button type="button"
              onClick={() => { const v = videoRef.current; if (v) { v.currentTime = resume; v.play().catch(() => { /* */ }); } setResume(0); }}
              className="rounded-lg bg-[var(--primary)] px-3.5 py-2 text-xs font-bold text-white hover:brightness-110">
              {t(loc, "vp.resume")}
            </button>
          </div>
        )}

        {/* the title (at the top) */}
        {title && started && (
          <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/55 to-transparent p-4 transition-opacity duration-200"
            style={{ opacity: chrome ? 1 : 0 }}>
            <div className="text-[13.5px] font-bold text-white drop-shadow">{title}</div>
          </div>
        )}

        {/* CONTROLS */}
        {!error && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-1.5 transition-all duration-200"
            style={{ opacity: chrome ? 1 : 0, transform: chrome ? "none" : "translateY(8px)", pointerEvents: chrome ? "auto" : "none", paddingBottom: fullscreen ? "calc(0.75rem + env(safe-area-inset-bottom))" : undefined }}>

            {/* the progress (with the buffer) */}
            <div ref={barRef} onClick={scrub}
              onMouseMove={(e) => { const r = barRef.current?.getBoundingClientRect(); if (r && duration) setHover(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * duration); }}
              onMouseLeave={() => setHover(null)}
              role="slider" aria-label={t(loc, "vp.progress")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}
              className="relative mx-1 mb-0.5 flex h-4 cursor-pointer items-center">
              <div className="relative h-[5px] w-full rounded-full bg-white/25">
                <div className="absolute inset-y-0 left-0 rounded-full bg-white/35" style={{ width: `${bufPct}%` }} />
                <div className="absolute inset-y-0 left-0 rounded-full bg-[var(--primary)]" style={{ width: `${pct}%` }} />
                <div className="absolute top-1/2 h-[13px] w-[13px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow" style={{ left: `${pct}%` }} />
              </div>
              {hover !== null && (
                <div className="pointer-events-none absolute bottom-5 -translate-x-1/2 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-bold text-white"
                  style={{ left: `${duration ? (hover / duration) * 100 : 0}%` }}>
                  {mmss(hover)}
                </div>
              )}
            </div>

            <div className="flex items-center gap-0.5">
              <button type="button" onClick={togglePlay} aria-label={t(loc, "vp.playPause")} className={btn}>
                {playing
                  ? <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                  : <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>}
              </button>
              <button type="button" onClick={() => skip(-SEEK)} aria-label={t(loc, "vp.back10")} className={`${btn} text-sm font-bold`}>−10</button>
              <button type="button" onClick={() => skip(SEEK)} aria-label={t(loc, "vp.fwd10")} className={`${btn} text-sm font-bold`}>+10</button>

              <button type="button" aria-label={t(loc, "vp.mute")} className={btn}
                onClick={() => { const v = videoRef.current; if (v) v.muted = !v.muted; }}>
                {muted || volume === 0
                  ? <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
                  : <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></svg>}
              </button>

              <div className="whitespace-nowrap px-2 text-[12.5px] font-medium tabular-nums text-white">
                {mmss(current)} <span className="text-white/55">/ {mmss(duration)}</span>
              </div>

              <div className="flex-1" />

              {/* speed */}
              <div className="relative">
                <button type="button" onClick={() => setMenu(menu === "speed" ? null : "speed")} aria-label={t(loc, "vp.speed")}
                  className={`${btn} w-auto min-w-11 px-2.5 text-[12.5px] font-bold`}>{rate}×</button>
                {menu === "speed" && (
                  <div className="absolute bottom-[52px] right-0 min-w-[112px] rounded-[10px] border border-white/10 bg-[#120e1a]/95 p-1.5 shadow-xl backdrop-blur">
                    {RATES.map((r) => (
                      <button key={r} type="button" className={item(r === rate)}
                        onClick={() => { const v = videoRef.current; if (v) v.playbackRate = r; setMenu(null); }}>
                        {r}× {r === rate && <span aria-hidden>✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* the quality — it DISAPPEARS when there are no levels (MP4: nothing broken, just not adaptive yet) */}
              {levels.length > 1 && (
                <div className="relative">
                  <button type="button" onClick={() => setMenu(menu === "quality" ? null : "quality")} aria-label={t(loc, "vp.quality")}
                    className={`${btn} w-auto min-w-11 px-2.5 text-[11px] font-bold`}>
                    {level === -1 ? t(loc, "vp.auto") : levels.find((n) => n.i === level)?.label}
                  </button>
                  {menu === "quality" && (
                    <div className="absolute bottom-[52px] right-0 min-w-[150px] rounded-[10px] border border-white/10 bg-[#120e1a]/95 p-1.5 shadow-xl backdrop-blur">
                      <button type="button" className={item(level === -1)} onClick={() => pickLevel(-1)}>
                        <span className="flex items-center gap-2">{t(loc, "vp.auto")}
                          {level === -1 && autoLevel && <span className="text-[9px] font-bold text-white/45">{autoLevel}</span>}
                        </span>
                        {level === -1 && <span aria-hidden>✓</span>}
                      </button>
                      {levels.slice().reverse().map((n) => (
                        <button key={n.i} type="button" className={item(n.i === level)} onClick={() => pickLevel(n.i)}>
                          {n.label} {n.i === level && <span aria-hidden>✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* the subtitles — only when they exist */}
              {captions?.length ? (
                <button type="button" onClick={() => setCc((c) => !c)} aria-label={t(loc, "vp.captions")} aria-pressed={cc}
                  className={`${btn} relative`}>
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M7 12h2" /><path d="M13 12h4" /></svg>
                  <span className="absolute bottom-1.5 left-1/2 h-[2.5px] w-4 -translate-x-1/2 rounded bg-[var(--primary)]" style={{ opacity: cc ? 1 : 0 }} />
                </button>
              ) : null}

              <button type="button" onClick={pip} aria-label="Picture in Picture" className={btn}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2" /><rect x="12" y="12" width="8" height="6" rx="1" fill="currentColor" stroke="none" /></svg>
              </button>
              <button type="button" onClick={toggleFullscreen} aria-label={t(loc, "vp.fullscreen")} className={btn}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M16 3h3a2 2 0 0 1 2 2v3" /><path d="M8 21H5a2 2 0 0 1-2-2v-3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /></svg>
              </button>
            </div>
          </div>
        )}

        <div aria-live="polite" className="sr-only">{playing ? t(loc, "vp.playing") : t(loc, "vp.paused")}</div>
      </div>
    </div>
  );
}
