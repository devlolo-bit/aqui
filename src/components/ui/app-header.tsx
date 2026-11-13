// <AppHeader/> — the app's top bar: the brand (logo + name) on the left, actions on the right. Use it instead of
// hand-rolling a header; it is the one that survives a long brand name on a 375px screen.
import * as React from 'react';
import { Link } from 'react-router-dom';
import { Logo, fabConfig } from '@/lib/fab-client';
import { cn } from '@/lib/utils';

/**
 * AppHeader — the ready-made application header.
 *
 * WHY IT EXISTS: hand-written headers put the logo and the app name in a row with no width constraint, and a long
 * brand name ("Associação de Moradores do Jardim Primavera") wrapped to three lines UNDER the logo, which kept its
 * own vertical centring — the logo ended up drawn over the text. It reproduces at 375px on every app whose owner
 * types a real name, and no amount of prompt-side advice fixes it once, for everyone.
 *
 * HOW IT AVOIDS THE COLLISION (the two rules that matter, both easy to lose when rewriting this by hand):
 *   • the brand block is `min-w-0` inside the flex row. Without it a flex item refuses to shrink below its content's
 *     intrinsic width, so the name pushes the row wider than the screen instead of truncating;
 *   • the name itself truncates (one line) or clamps (two), never wraps freely, and the whole row is
 *     `items-center` on a single baseline — so nothing can end up on top of anything else.
 *
 * Props:
 *   - `actions`: whatever goes on the right (a button, a menu, an avatar). It never shrinks; the brand yields first.
 *   - `title`: the text beside the logo. Default: the Brand's name (VITE_FAB_LOGO_NAME).
 *   - `to`: where the brand links to (default "/"). `null` renders it as plain text, with no link.
 *   - `titleLines`: 1 (truncate, the default) or 2 (clamp at two lines) — for a long name you want fully readable.
 *   - `sticky`: keeps the bar pinned to the top of the viewport (default true).
 *   - `children`: an optional middle slot (a nav, a search field). It is hidden below `sm` so it cannot fight the
 *     brand for the little width a phone has.
 */
// The props are declared INLINE (not through a named `AppHeaderProps` type) on purpose: the control-plane's QA
// parses this exact shape out of the template to build the prop contract it validates the generated code against
// (`qa.template_component_props`). A named type is invisible to it, and the component would silently lose the
// check that catches `action=` for `actions=`.
function AppHeader({
  actions,
  title,
  to = '/',
  titleLines = 1,
  sticky = true,
  className,
  children,
}: {
  actions?: React.ReactNode;
  title?: string;
  to?: string | null;
  titleLines?: 1 | 2;
  sticky?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const label = (title ?? fabConfig.logoName) || '';
  // WHAT THE TEXT IS decides whether it may sit beside the image. A `title` is the SCREEN's name ("Pedidos") and
  // always shows. With no title the text is the BRAND's name — and if the image beside it is the LOGO (a lockup,
  // which already has the name drawn inside), writing it again prints the brand twice. A SYMBOL has no lettering,
  // so symbol + name is the composition wanted. This used to draw logo + name unconditionally: a customer's app
  // opened its header with "GW IMPORTS.jpg" (a file name, from an older defect) beside the JR GAMES logo.
  const hasImage = !!(fabConfig.icon || fabConfig.logo);
  const textIsBrandName = title == null;
  const imageIsLockup = !fabConfig.icon && !!fabConfig.logo;
  const showLabel = !!label && !(textIsBrandName && imageIsLockup);
  const brand = (
    <span className="flex min-w-0 items-center gap-2">
      {/* `<Logo variant="mark"/>` prefers the symbol and falls back to the logo — and to a MONOGRAM of the name
          when there is neither. The label beside it already carries the name, so the mark is rendered only when
          an image exists: initials next to the same name spelled out would be the brand said twice. */}
      {hasImage ? (
        <Logo variant="mark" className="shrink-0" imgClassName="h-8 w-auto max-w-[9rem] object-contain" />
      ) : null}
      {showLabel ? (
        <span
          className={cn(
            'min-w-0 font-display text-base font-bold leading-tight tracking-tight sm:text-lg',
            titleLines === 2 ? 'line-clamp-2 break-words' : 'truncate'
          )}
          title={label}
        >
          {label}
        </span>
      ) : null}
    </span>
  );
  return (
    <header
      className={cn(
        'z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80',
        sticky && 'sticky top-0',
        className
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-2.5 min-h-14">
        {/* min-w-0 on the shrinking side + shrink-0 on the actions: the brand yields the width, never the buttons. */}
        <div className="flex min-w-0 flex-1 items-center">
          {to ? (
            <Link
              to={to}
              className="flex min-w-0 items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {brand}
            </Link>
          ) : (
            brand
          )}
        </div>
        {children ? <div className="hidden min-w-0 shrink items-center gap-2 sm:flex">{children}</div> : null}
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export { AppHeader };
