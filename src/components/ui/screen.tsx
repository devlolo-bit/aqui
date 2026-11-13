// <Screen/>: a stacked screen of an APP, the compact header (back, title, up to two actions) over the content,
// opening as a LAYER above the screen that led to it and sliding back out on return. Pair it with
// `<AppShell tabs="roots">`, which hides the tab bar on everything that is not a tab's root.
import * as React from 'react';
import { ChevronLeft } from 'lucide-react';
import { Link, useLocation, useNavigate, type LinkProps, type To } from 'react-router-dom';
import { useLocale } from '@/lib/fab-client';
import { t } from '@/lib/fab-i18n';
import { cn } from '@/lib/utils';

type Direction = 'push' | 'pop';
// Fired by the shell and by every Screen right after the DOM of a new route is committed (a layout effect), so a
// View Transition can take its "new" snapshot of the next screen rather than of the one being left.
const ROUTE_EVENT = 'fab:route';

function media(query: string): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(query).matches;
}

/** The shell reads how many `<Screen>`s are mounted: with `tabs="roots"` it hides the tab bar on every route off
 *  the NAV by the path, and its brand bar only under a Screen, so a route off the NAV that is not a Screen (a search,
 *  a cart) keeps the brand bar (its logo links home) instead of becoming a dead end. */
const LayerContext = React.createContext<{ enter: () => void; leave: () => void } | null>(null);

let transitionToken = 0;

/** Runs `update` (a navigation) inside a View Transition tagged with its direction on `<html data-fab-nav>`, which is
 *  what `index.css` reads to slide the layer in or out. Phones only: the desktop keeps its chrome and swaps screens.
 *  Without the API, or under reduced motion, it just runs. */
function transition(direction: Direction, update: () => void): void {
  const doc =
    typeof document !== 'undefined'
      ? (document as Document & { startViewTransition?: (cb: () => Promise<void>) => { finished: Promise<void> } })
      : null;
  if (
    !doc ||
    typeof doc.startViewTransition !== 'function' ||
    media('(min-width: 768px)') ||
    media('(prefers-reduced-motion: reduce)')
  ) {
    update();
    return;
  }
  const token = ++transitionToken;
  doc.documentElement.dataset.fabNav = direction;
  const committed = new Promise<void>((resolve) => {
    // The next route's commit, or 1.5s: the pages are lazy chunks and the router commits them in a React transition,
    // so the first visit to a route waits for its code. A shell of the app's own may never fire the event at all.
    const timer = window.setTimeout(done, 1500);
    function done() {
      window.clearTimeout(timer);
      window.removeEventListener(ROUTE_EVENT, done);
      resolve();
    }
    window.addEventListener(ROUTE_EVENT, done);
  });
  // ⚠️ NO requestAnimationFrame in here. The browser suppresses rendering while this callback runs, so a frame
  // never comes: the await hung until Chrome's own 4 s timeout, freezing the screen on every push and back. The
  // route's commit (a layout effect, already in the DOM) is all the "new" snapshot needs.
  const vt = doc.startViewTransition(async () => {
    update();
    await committed;
  });
  // only the transition that set the tag clears it: a second tap during the first must not cut its own animation short
  vt.finished
    .catch(() => {})
    .finally(() => {
      if (token === transitionToken) delete doc.documentElement.dataset.fabNav;
    });
}

/** `push(to)` opens a screen as a layer; `back(fallback)` closes it: the previous entry when the app itself opened
 *  it, else `fallback` (the tab's root), so a deep link still has a way out. */
function useLayerNav() {
  const navigate = useNavigate();
  return React.useMemo(
    () => ({
      push: (to: To, opts?: { replace?: boolean; state?: unknown }) => transition('push', () => navigate(to, opts)),
      back: (fallback = '/') => {
        const idx = typeof window !== 'undefined' ? (window.history.state as { idx?: number } | null)?.idx : 0;
        transition('pop', () => {
          if (idx && idx > 0) navigate(-1);
          else navigate(fallback, { replace: true });
        });
      },
    }),
    [navigate]
  );
}

/** A `<Link>` that opens its target as a layer (a plain left click; modified clicks and other targets keep the
 *  browser's behaviour). */
// The spread is named `linkProps` on purpose: the QA's prop-contract parser reads the two usual spread names anywhere
// in a file as "this file's components take unknown props", which would switch off the typo check on `<Screen>`.
function LayerLink({ to, onClick, replace, state, target, ...linkProps }: LinkProps) {
  const nav = useLayerNav();
  return (
    <Link
      to={to}
      replace={replace}
      state={state}
      target={target}
      {...linkProps}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (target && target !== '_self') return;
        e.preventDefault();
        nav.push(to, { replace, state });
      }}
    />
  );
}

/**
 * Screen: a screen below a tab's root (a detail, an edit form, a settings page), with the header an app has there.
 *
 * Props:
 *   - `title`: short, the name of what is on screen ("Pedido PED-0042"), never the brand.
 *   - `back`: the back button (default true). It returns to the previous entry, or to `backTo` (default "/") when
 *     the app did not open this screen (a deep link, a push notification).
 *   - `actions`: at most two, on the right; the rest goes in a "More" DropdownMenu.
 *   - `children`: the content, in the platform's container. A sticky action bar of the screen sits at `bottom-0`
 *     (there is no tab bar under a layer), with `pb-[env(safe-area-inset-bottom)]`.
 */
// The props are declared INLINE on purpose: the QA parses this exact shape out of the template to build the prop
// contract it validates generated code against (`qa.template_component_props`); a named type is invisible to it.
function Screen({
  title,
  back = true,
  backTo,
  actions,
  className,
  children,
}: {
  title: React.ReactNode;
  back?: boolean;
  backTo?: string;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  const loc = useLocale();
  const nav = useLayerNav();
  const { pathname } = useLocation();
  const layers = React.useContext(LayerContext);
  React.useLayoutEffect(() => {
    window.dispatchEvent(new Event(ROUTE_EVENT));
  }, [pathname]);
  // While a Screen is on screen, a current shell drops its brand bar through the context. Without a provider (an app
  // whose own copy of the shell predates `tabs="roots"`, or no shell at all) `<html data-fab-layer>` lets the
  // platform CSS do it instead; never both, or the current shell's header would vanish under `tabs="always"`.
  React.useLayoutEffect(() => {
    if (layers) {
      layers.enter();
      return () => layers.leave();
    }
    document.documentElement.dataset.fabLayer = '';
    return () => {
      delete document.documentElement.dataset.fabLayer;
    };
  }, [layers]);
  return (
    <section data-fab-screen="" className={cn('bg-background', className)}>
      <header
        data-fab-shell="screen"
        className="sticky top-0 z-30 border-b border-border bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-background/80 md:static"
      >
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-1 px-2">
          {back ? (
            <button
              type="button"
              onClick={() => nav.back(backTo)}
              aria-label={t(loc, 'ui.back')}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-foreground hover:bg-muted"
            >
              <ChevronLeft className="size-6" />
            </button>
          ) : (
            <span className="w-2" />
          )}
          <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-foreground">{title}</h1>
          {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6">{children}</div>
    </section>
  );
}

export { LayerContext, LayerLink, Screen, useLayerNav };
