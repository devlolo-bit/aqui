/**
 * The auth screens' FORM decision — pure, deterministic and platform-owned.
 *
 * ⚠️ IT IS BACK, AND ONLY FOR THE FROZEN COPIES. `8e453bd0` removed the auth shell from this template so the model
 * writes the login/signup screens itself, and that decision stands: `auth-card.tsx` is gone and is not coming back.
 * What the removal missed is that `materializeApp` copies the template FIRST and the App.code files overwrite it, so
 * 656 published apps carry a frozen copy of `auth-card.tsx` — and that copy imports this module. Measured against
 * production on 2026-09-11, hours after the removal shipped: **646 of 773 published apps** import `auth-card` from a
 * real page (`Login.tsx`, `Signup.tsx`, `ForgotPassword.tsx`), which puts it in Vite's module graph, and only 10 of
 * them carry their own copy of this file. Every one of those 646 would fail to rebuild with
 * `Could not load /work/src/components/ui/auth-style`.
 *
 * Nobody had hit it yet because publishing PROMOTES the preview artifact: only a rebuild finds out. The one app that
 * did was JR GAMES, whose republish failed and exposed the whole class.
 *
 * So this file stays as a COMPATIBILITY module for apps generated before the removal. New apps do not import it (the
 * model writes its own screens); deleting it again requires sweeping the fleet first — `make prod-build-health` is
 * that sweep, and it is what should have run before `8e453bd0`.
 *
 * WHY IT EXISTS: login and signup are the most standardized screens of the whole product. Measured over 16 production
 * apps, `auth-card.tsx` was byte-identical in 9 of them and the Jaccard of the auth screens between a ceramics store and
 * a real-estate agency was 0.60 — twenty times the 0.029 of their domain screens. The first screen anyone sees was the
 * only one that did not carry the app's identity.
 *
 * WHY IT IS NOT THE MODEL'S CHOICE: it may be (the `<AuthCard variant>` prop wins whenever it is set), but it must not
 * DEPEND on the model remembering. The precedent is measured: the theme preset is emitted by 0 of 40 apps.
 *
 * ⚠️ WHY THE ONLY INPUT IS THE APP'S ID. The first version also weighed the brand's logo and the number of layout
 * images in the build, to pick a shape that FIT the app. That was wrong, and how it was wrong is worth keeping written
 * down: both signals arrive AFTER the first build. The layout images are generated as a FOLLOW-UP that triggers a
 * rebake (`codegen/service.py` → `publishing.refresh_preview`), and the logo/brand name land whenever the owner fills
 * in the Brand panel. Measured over 5000 UUIDs of the real shape, the first generated image alone flipped the chosen
 * layout for 65.5% of the apps (100% of the apps that had a name and no logo), and an uploaded logo flipped 66%. The
 * apper would watch the login screen change shape by itself, seconds after the build — which reads as a broken deploy,
 * not as personality. So the input is `fabConfig.project`: assigned at creation, never rewritten, the only thing on
 * this screen that cannot drift. What the app IS is expressed through the `variant` prop (real intent, from the model)
 * and through the brand the layouts RENDER — not through a proxy that the platform itself keeps mutating.
 *
 * NO IMPORTS ON PURPOSE. Everything comes in as an argument, so this module is a plain `.ts` (no JSX) and runs under
 * `node --test --experimental-strip-types` with no bundler — see `test/auth-style.test.mts`. It also keeps the chooser
 * out of the import cycle `auth-card.tsx → fab-client.tsx → components/ui/*`.
 */

/** The auth shell's four LAYOUTS. Equivalent in function and in accessibility — only the form changes. */
export type AuthVariant = "centered" | "split" | "banner" | "minimal";

export const AUTH_VARIANTS: readonly AuthVariant[] = ["centered", "split", "banner", "minimal"] as const;

/** What the PLATFORM knows about the app at render time (all of it injected at build time — none of it written by the model). */
export type AuthIdentity = {
  /** the app's stable id (`fabConfig.project`). THE ONLY input to the layout choice — see the note at the top. */
  id?: string;
  /** the logo the owner uploaded in the Brand panel (`fabConfig.logo`). The layouts RENDER it; it never selects one. */
  logo?: string;
  /** the brand name (`fabConfig.logoName`). The layouts RENDER it; it never selects one. */
  name?: string;
  /** what the app IS, in the owner's own words. See `readAuthIdentity` for where it may come from. */
  description?: string;
};

/** An arbitrary value (a `variant` prop written by the model) → a valid variant, or `null` when it is not one of ours.
 * `null` means "fall back to the derived default": a typo must never blank the login screen. */
export function normalizeAuthVariant(value: unknown): AuthVariant | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  return (AUTH_VARIANTS as readonly string[]).includes(v) ? (v as AuthVariant) : null;
}

/** FNV-1a (32-bit), the smallest hash that spreads well over short ids. It only has to be STABLE and evenly spread —
 * it is not a security primitive. An empty seed returns 0 (→ the first variant). */
export function authSeed(input: string | undefined): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < (input || "").length; i++) {
    h ^= (input as string).charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * The app's layout: stable for the app's whole life, spread across apps. A pure function of the app's ID and of
 * NOTHING else — every other field of `AuthIdentity` is content the layouts render, never a selector (see the note at
 * the top). An app with no id yet (a dev build, a preview before the project is stamped) gets the first variant,
 * deterministically. Every variant renders correctly with or without brand assets, which is what allows the choice to
 * ignore them.
 */
export function pickAuthVariant(identity: AuthIdentity = {}): AuthVariant {
  return AUTH_VARIANTS[authSeed(identity.id) % AUTH_VARIANTS.length];
}

type ConfigLike = { logo?: string; logoName?: string; project?: string; description?: string } | undefined;
type WindowLike = { __FAB_APP__?: { description?: string } } | undefined;

/**
 * The app's identity, read from the platform's injections. A pure function of its arguments (the caller passes
 * `fabConfig` and `window`), so the whole table is testable with no browser.
 *
 * The DESCRIPTION — the one piece of per-app PROSE the auth screen can show without the model writing a line — comes
 * only from sources the platform writes ONCE, at build time:
 *   1. `fabConfig.description`, once the platform injects the app's description (a `VITE_FAB_DESCRIPTION` in
 *      materialize + the field in fab-client — the 2-line change this function is already waiting for);
 *   2. `window.__FAB_APP__.description`, the alternative injection through the index.html.
 * Neither → no tagline (the screen degrades to brand only, never to a placeholder).
 *
 * ⚠️ `<meta name="description">` IS DELIBERATELY NOT A SOURCE, even though it does hold the app's description on a hard
 * load. It is MUTABLE at runtime: `useSeo`/`<FabHead>` rewrites it per route and never restores it. Reading it meant
 * that whoever reached the login from a product page saw THAT PRODUCT's description printed as the brand's slogan
 * ("Tesoura profissional 6 polegadas, aço japonês — R$ 289"). A tagline that depends on where the visitor came from is
 * worse than no tagline.
 */
export function readAuthIdentity(config: ConfigLike, win?: WindowLike): AuthIdentity {
  const description = (config && config.description) || (win && win.__FAB_APP__ && win.__FAB_APP__.description) || "";
  return {
    logo: (config && config.logo) || "",
    name: (config && config.logoName) || "",
    id: (config && config.project) || "",
    description: String(description).trim(),
  };
}
