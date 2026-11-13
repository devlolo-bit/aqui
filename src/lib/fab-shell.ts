/**
 * The NATIVE SHELL boundary: what the installed shell can do, and — because of that — WHERE a sale is allowed to
 * happen. Two things live together here for one reason: the second is a consequence of the first, and splitting them
 * is what lets them drift.
 *
 * WHY THE SALE RULE IS A MODULE AND NOT AN `if` AT THE CALL SITE. A published FabApp is a WebView shell around the
 * published site, so a gateway checkout button rendered by the app is, literally, a payment link inside the app —
 * the exact thing Google Play's and the App Store's payments policies name ("in-app webviews, buttons, links"). The
 * cost of getting it wrong is not a broken screen, it is the app being rejected or pulled from the store with paying
 * subscribers inside. A rule with that price tag gets one home, and tests.
 *
 * THE INVARIANT:
 *
 *     Inside the native shell, a sale either happens through the STORE, or it does not happen.
 *     The fallback is NEVER the gateway.
 *
 * The fallback being silence (and not the web checkout) is what makes it safe to ship the app code BEFORE the new
 * binary: an old shell does not announce `iap`, so it goes quiet; a new shell sells. Were the fallback the gateway,
 * the window between publishing and the store approving the binary would be a violation — inside an app that is
 * already approved, which is the worse half.
 */

/** What a shell can announce. It is a version negotiation: an OLD shell announces fewer, and the app must not call
 *  what the INSTALLED shell cannot do. */
export type Capability = "camera" | "photos" | "location" | "biometrics" | "push" | "share" | "iap";

interface FabNativeGlobal {
  capabilities?: Capability[];
  platform?: string;                 // "android" | "ios" — announced by the shell; absent on an old one
  __resolvers?: Record<string, (v: unknown) => void>;
}
interface RNWebView { postMessage: (msg: string) => void }

export function nativeGlobal(): FabNativeGlobal | undefined {
  return typeof window === "undefined" ? undefined : (window as unknown as { fabNative?: FabNativeGlobal }).fabNative;
}
export function rnWebView(): RNWebView | undefined {
  return typeof window === "undefined" ? undefined : (window as unknown as { ReactNativeWebView?: RNWebView }).ReactNativeWebView;
}

/** Is it running INSIDE the native app (the WebView shell)? */
export function isNativeApp(): boolean {
  return !!rnWebView();
}

/** Does the INSTALLED shell support this capability? (the shell announces what it has on load) */
export function can(cap: Capability): boolean {
  return !!rnWebView() && Array.isArray(nativeGlobal()?.capabilities) && nativeGlobal()!.capabilities!.includes(cap);
}

/** Where a DIGITAL sale may happen from here.
 *  `gateway` = the browser, the app's own provider (Mercado Pago/Stripe/Pagar.me).
 *  `iap`     = inside the shell, through the store's billing.
 *  `none`    = inside the shell with no store billing available → sell nothing, say so, link nowhere. */
export type SaleOrigin = "gateway" | "iap" | "none";

export interface ShellState {
  native: boolean;
  capabilities: readonly string[];
  /** Which store this shell answers to. Empty on an old shell that does not announce it — and empty must read as
   *  "unknown", never as a default: guessing Android on an iOS build would send a buyer to the wrong catalog. */
  platform?: string;
}

/** The rule, as a pure function of the shell's state — so it can be tested without a browser or a device.
 *
 *  Note what it does NOT take: whether the owner configured a store catalog. The shell knows what it CAN do; only the
 *  server knows what is READY to sell (a draft base plan, a subscription still in review, an owner who never finished
 *  the payments profile). That second half is the server's `/checkout/options`, and it can only ever narrow this
 *  answer — never widen it. */
export function saleOrigin(shell: ShellState): SaleOrigin {
  if (!shell.native) return "gateway";
  return shell.capabilities.includes("iap") ? "iap" : "none";
}

/** The current shell, read from the globals the shell injects. */
export function currentShell(): ShellState {
  return { native: isNativeApp(), capabilities: nativeGlobal()?.capabilities ?? [],
           platform: nativeGlobal()?.platform ?? "" };
}

let _seq = 0;
/** An RPC call to the shell: it posts the message and resolves when the shell answers by id. A timeout → it rejects (the caller
 * falls back). Only used when `can(cap)` — in the browser it never gets here. */
export function bridge<T>(method: string, params: Record<string, unknown> = {}, timeoutMs = 60000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const w = window as unknown as { fabNative?: FabNativeGlobal; __fabNativeResolve?: (id: string, ok: boolean, val: unknown) => void };
    w.fabNative = w.fabNative || {};
    w.fabNative.__resolvers = w.fabNative.__resolvers || {};
    if (!w.__fabNativeResolve) {
      w.__fabNativeResolve = (id, ok, val) => {
        const r = w.fabNative?.__resolvers?.[id];
        if (r) { delete w.fabNative!.__resolvers![id]; r({ ok, val }); }
      };
    }
    const id = `${Date.now()}-${_seq++}`;
    const timer = setTimeout(() => { delete w.fabNative!.__resolvers![id]; reject(new Error("native timeout")); }, timeoutMs);
    w.fabNative.__resolvers[id] = (res) => {
      clearTimeout(timer);
      const { ok, val } = res as { ok: boolean; val: unknown };
      ok ? resolve(val as T) : reject(new Error(String((val as { message?: string })?.message || "native error")));
    };
    rnWebView()!.postMessage(JSON.stringify({ id, method, params }));
  });
}

// --- STORE BILLING: the DEVICE half ---------------------------------------------------------------------------
// Thin wrappers over the shell's bridge. They live here and not in fab-native because `useSubscribe` (fab-client)
// needs them, and fab-client importing fab-native would close an import cycle.

export interface StoreProduct { sku: string; title: string; price: string; currency: string; offerToken: string }
export interface StorePurchase { purchaseToken: string; sku: string; transactionId: string }

/** The store's own listing for these SKUs. The `price` is the store's LOCALIZED string, and using it is not a
 *  preference: both stores require the app to display the price THEY report, which is not the one in the CMS. */
export function storeProducts(skus: string[]): Promise<StoreProduct[]> {
  return bridge<StoreProduct[]>("iap.products", { skus });
}

/** Opens the store sheet. `accountId` ties the purchase to OUR user — without it the purchase belongs to a
 *  Google/Apple account and nothing maps it back. The long timeout is because this is a human flow. */
export function storePurchase(sku: string, accountId: string, offerToken = ""): Promise<StorePurchase> {
  return bridge<StorePurchase>("iap.purchase", { sku, accountId, offerToken }, 310000);
}

/** ⚠️ THE 3-DAY RULE. An Android purchase not finalized within three days is AUTO-REFUNDED by Google — the buyer
 *  keeps what we granted and the money goes back. Call it ONLY after the server has verified the purchase.
 *
 *  ⚠️ AND ON iOS, FOR A DIFFERENT REASON: an unfinished transaction is re-delivered on every app launch. Pass the
 *  `transactionId` there — the iOS `purchaseToken` is the whole JWS, which is re-signed on every read, so the shell
 *  cannot find the purchase again by that string alone. */
export function storeFinish(purchaseToken: string, transactionId = ""): Promise<void> {
  return bridge<void>("iap.finish", { purchaseToken, transactionId });
}

/** What the store still holds for this device/account. Two jobs: a reinstall, and the migration of someone who
 *  subscribed through this SKU before the app was ours — that purchase carries no account id of ours, so the only
 *  way to tie it to a user is the user asking while logged in. */
export function storeRestore(): Promise<StorePurchase[]> {
  return bridge<StorePurchase[]>("iap.restore");
}

/** The store's subscription screen. A store subscription can ONLY be cancelled there: a cancel button that called
 *  our API would drop the access and leave the charge running. */
export function openStoreSubscriptions(sku = ""): Promise<void> {
  return bridge<void>("iap.manage", { sku });
}
