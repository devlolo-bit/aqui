/**
 * fab-native — the SDK's boundary for NATIVE FEATURES. The SAME function runs in the browser (the web fallback) and inside the
 * native shell (Expo/WebView), chosen at RUNTIME by CAPABILITY DETECTION. The AI uses these functions the way it uses the
 * rest of the fab-client — it writes no React Native, it knows nothing of the bridge. See docs/PLANO-APPS-NATIVOS.md.
 *
 * The shell injects a `window.fabNative = { capabilities: [...] }` on load and receives/answers messages through
 * `window.ReactNativeWebView.postMessage` ↔ `window.__fabNativeResolve`. In the browser none of that exists → `can()`
 * is false → always the web path. A version skew: an OLD shell announces fewer capabilities → the `can()` already blocks and
 * it falls back (it never calls a method the installed shell does not have). */
import { enablePush, subscribeNativePush } from "./fab-client";
import { bridge, can as shellCan, isNativeApp as shellIsNative, openStoreSubscriptions as shellManage,
         type Capability } from "./fab-shell";

// `isNativeApp`/`can` now live in fab-shell, together with the sale-origin rule that is DERIVED from them. They moved
// so the two cannot drift: a capability list read one way here and another way there is how a policy rule silently
// stops matching the shell it is supposed to describe. Re-exported because this module is the SDK surface the
// generated app imports — moving an implementation must not move an import path an app already uses.
export type { Capability };

/** Is it running INSIDE the native app (the WebView shell)? */
export function isNativeApp(): boolean {
  return shellIsNative();
}

/** Does the INSTALLED shell support this capability? (the shell announces what it has on load) */
export function can(cap: Capability): boolean {
  return shellCan(cap);
}

interface FabNativeGlobal {
  capabilities?: Capability[];
  __resolvers?: Record<string, (v: unknown) => void>;
}


// --- the web helpers (the browser's fallback) ---
function _pickFile(accept: string, capture?: "environment" | "user"): Promise<File> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = accept;
    if (capture) input.setAttribute("capture", capture);
    input.onchange = () => { const f = input.files?.[0]; f ? resolve(f) : reject(new Error("cancelado")); };
    input.click();
  });
}
function _dataUrlToFile(dataUrl: string, name: string): File {
  const [head, b64] = dataUrl.split(",");
  const mime = /data:([^;]+)/.exec(head)?.[1] || "image/jpeg";
  const bin = atob(b64); const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], name, { type: mime });
}

/** Taking a PHOTO: the native camera in the app; in the browser it opens the camera through an `<input capture>`. It returns a File (pass it to
 * `uploadFile`). The shell returns a data-URL → converted into a File for the same upload path. */
export async function takePhoto(): Promise<File> {
  if (can("camera")) {
    const { dataUrl, name } = await bridge<{ dataUrl: string; name: string }>("camera.capture");
    return _dataUrlToFile(dataUrl, name || "photo.jpg");
  }
  return _pickFile("image/*", "environment");
}

/** Picking an IMAGE from the gallery: the native gallery in the app; an `<input type=file>` in the browser. It returns a File. */
export async function pickImage(): Promise<File> {
  if (can("photos")) {
    const { dataUrl, name } = await bridge<{ dataUrl: string; name: string }>("photos.pick");
    return _dataUrlToFile(dataUrl, name || "image.jpg");
  }
  return _pickFile("image/*");
}

/** The current location { lat, lng }: the native GPS in the app; the `navigator.geolocation` in the browser. */
export function getLocation(): Promise<{ lat: number; lng: number }> {
  if (can("location")) return bridge<{ lat: number; lng: number }>("location.current");
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return reject(new Error("geolocalização indisponível"));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => reject(new Error(e.message)), { enableHighAccuracy: true, timeout: 15000 });
  });
}

/** Sharing (the native share sheet / the Web Share API). Silent when cancelled. */
export async function share(data: { title?: string; text?: string; url?: string }): Promise<void> {
  if (can("share")) { await bridge("share.open", data); return; }
  const nav = typeof navigator !== "undefined" ? (navigator as Navigator & { share?: (d: object) => Promise<void> }) : undefined;
  if (nav?.share) { try { await nav.share(data); } catch { /* cancelled */ } return; }
  if (data.url && typeof window !== "undefined") window.open(data.url, "_blank");
}

/** A BIOMETRIC login (Face ID / a fingerprint) — ONLY in the native app. In the browser it returns false (unsupported); the app
 * must fall back to the normal login. `true` = it authenticated. */
export async function authBiometric(): Promise<boolean> {
  if (can("biometrics")) return bridge<boolean>("biometrics.auth");
  return false;
}

/** It enables push notifications — ONE call that works in both worlds. In the native app it asks the shell for the ExponentPushToken
 * (the bridge) and registers it on the server with `kind:"expo"`; in the browser it falls back to Web Push (VAPID) through `enablePush`. It requires
 * a logged-in user. It returns whether it enabled it (`false` = permission denied / no support / the VAPID is off). */
export async function registerPush(): Promise<boolean> {
  if (can("push")) {
    try {
      // A casca devolve o TRANSPORTE junto do token. Uma casca antiga responde só `{token}`: `kind` cai em "expo",
      // que é exatamente o que ela sabe fazer — a negociação de versão continua valendo aqui.
      const r = await bridge<{ token: string; kind?: "expo" | "fcm"; appId?: string }>("push.register");
      if (!r?.token) return false;
      await subscribeNativePush(r.token, r.kind || "expo", r.appId);
      return true;
    } catch { return false; }
  }
  return enablePush();
}

/** Opens the STORE's subscription screen (Google Play / App Store).
 *
 *  It is the only correct destination for a "cancel subscription" button when the subscription came from a store: it
 *  can ONLY be cancelled there. A button that called the app's own API instead would drop the access and leave the
 *  charge running — the buyer keeps paying for something they can no longer open. In the browser it does nothing,
 *  because there is no store to open; check `subscription.source` before showing it. */
export function openStoreSubscriptions(sku = ""): Promise<void> {
  return shellManage(sku);
}
