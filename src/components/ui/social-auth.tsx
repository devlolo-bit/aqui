import { cn } from "@/lib/utils";
import { useAuth, useLocale } from "@/lib/fab-client";
import { t } from "@/lib/fab-i18n";

/**
 * The social sign-in buttons.
 *
 * WHY THIS PIECE STAYED WHEN THE AUTH SHELL WENT. The shell was LAYOUT, and layout is what the model writes well: over
 * the apps published after 2026-09-02, hand-written auth screens carried 0.32 findings each against the kit's 0.48.
 * This file is not layout. It is a CALL — `loginWithProvider(provider, redirectUri)` — plus the provider's display name
 * and a label that follows the app's locale, and the SDK surface is exactly where the model does not do well: the same
 * measurement found 1.08 invented-export findings per screen before the deterministic import fix landed.
 *
 * So the rule the split follows: the platform keeps what the model cannot see (the SDK's real names, the app's locale),
 * and hands back what it can (how the screen looks).
 */

const LABELS: Record<string, string> = { google: "Google", apple: "Apple", microsoft: "Microsoft", facebook: "Facebook", github: "GitHub", discord: "Discord" };

/**
 * SocialAuthButtons — ready-made social login buttons (only the providers the owner enabled in the panel show up; if one
 * is not configured, the backend answers and the button is harmless). `redirectUri` = where to come back to (the default: the
 * current page). E.g.: `<SocialAuthButtons providers={['google','apple']} />`.
 */
export function SocialAuthButtons({
  providers = ["google"], redirectUri, className,
}: {
  providers?: string[];
  redirectUri?: string;
  className?: string;
}) {
  const { loginWithProvider } = useAuth();
  const loc = useLocale();
  // The label used to be hardcoded Portuguese ("Continuar com Google") — an English or Spanish app showed a Portuguese
  // button on its FIRST screen. It follows the app's locale like the rest of the ready-made pieces.
  const label = t(loc, "auth.continueWith");
  return (
    <div className={cn("grid gap-2", className)}>
      {providers.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => loginWithProvider(p, redirectUri)}
          className="flex h-9 items-center justify-center gap-2 rounded-md border border-input bg-background text-[13px] font-semibold transition-colors hover:bg-accent"
        >
          {label.replace("{p}", LABELS[p] ?? p)}
        </button>
      ))}
    </div>
  );
}

export default SocialAuthButtons;
