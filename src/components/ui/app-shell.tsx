// <AppShell/> — the layout of an APP (a product used again and again): a bottom tab bar on the phone and, from `md`,
// a left sidebar or a top bar with the SAME destinations. Mount it as a pathless layout route.
import * as React from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, MoreHorizontal } from 'lucide-react';
import { Logo, fabConfig } from '@/lib/fab-client';
import { AppHeader } from '@/components/ui/app-header';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { LayerContext } from '@/components/ui/screen';
import { useLocale } from '@/lib/fab-client';
import { t } from '@/lib/fab-i18n';
import { cn } from '@/lib/utils';

/**
 * AppShell — the ready-made app navigation.
 *
 * WHY IT EXISTS: hand-written shells shipped the phone's bottom tab bar on the desktop too. On 2026-10-12, 83 of the
 * 230 apps of three days with a bottom bar still showed it at 1280px, a third of them with no desktop menu at all, so
 * the web version was the phone screen stretched. The prompt taught "hide it with `md:hidden` and render the same
 * NAV as a sidebar or header" in a sentence after the code sample, and the model copied the sample. One component
 * that renders both from one list makes the two impossible to drift.
 *
 * Props:
 *   - `nav`: the top-level destinations, `{ to, label, icon }`, defined ONCE. `end` defaults to true for "/". The
 *     phone's bar shows up to 5; with more, 4 plus a "More" item that opens the rest. The sidebar shows them all; the
 *     top links show from `lg` (from `xl` with 6+), with a menu button between `md` and there.
 *   - `desktop`: "top" (the default: the links in the header, for a store, a catalog, a delivery, a community, a
 *     booking or content app) or "sidebar" (ONLY a dashboard, an admin panel, a CRM, an internal tool). A sidebar
 *     on a shop reads as a back office (2026-10-13: a nursery's catalog came out looking like an admin panel).
 *   - `actions`: what goes on the right of the top bar (an avatar menu, a bell, a "New" button).
 *   - `title`: the text beside the logo (default: the Brand's name).
 *   - `tabs`: "always" (the default) keeps the tab bar on every screen inside the shell; "roots" shows it only on
 *     the NAV destinations themselves (hidden on every other route, by the path), so a detail opens as a LAYER;
 *     every such page must be a `<Screen>` (`@/components/ui/screen`), which brings the back-and-title header and
 *     the slide, the way a native stack behaves. From `md` nothing changes: the desktop keeps its top links or sidebar.
 *   - `children`: the routed content. Default: `<Outlet/>`, which is what a layout route needs.
 */
// The props are declared INLINE on purpose: the QA parses this exact shape out of the template to build the prop
// contract it validates generated code against (`qa.template_component_props`); a named type is invisible to it.
const end = (n: { to: string; end?: boolean }) => n.end ?? n.to === '/';

function AppShell({
  nav,
  desktop = 'top',
  tabs = 'always',
  actions,
  title,
  className,
  children,
}: {
  nav: { to: string; label: string; icon: React.ComponentType<{ className?: string }>; end?: boolean }[];
  desktop?: 'sidebar' | 'top';
  tabs?: 'always' | 'roots';
  actions?: React.ReactNode;
  title?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const items = nav;
  // The phone's bar holds 5. With more, the 5th slot becomes "More" and opens the rest: a sixth destination used to
  // be cut off the phone silently while the desktop still showed it.
  const overflow = nav.length > 5;
  const barItems = overflow ? nav.slice(0, 4) : nav;
  const moreItems = overflow ? nav.slice(4) : [];
  const loc = useLocale();
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  React.useEffect(() => {
    setMoreOpen(false);
    setMenuOpen(false);
  }, [pathname]);
  // tells a running View Transition (`screen.tsx`) that the next route's DOM is in place
  React.useLayoutEffect(() => {
    window.dispatchEvent(new Event('fab:route'));
  }, [pathname]);
  // A LAYER is any route off the NAV under `tabs="roots"`: the tab bar leaves there, by the PATH alone (2026-10-16:
  // 21 of 25 apps built with the app-mobile skill set `tabs="roots"` and none mounted a `<Screen>`, so the bar
  // stayed on every detail). The brand bar stays unless a `<Screen>` is mounted, which brings its own header:
  // its logo links home, so a page that forgot the Screen is never a dead end, only a page without the slide.
  const trim = (p: string) => p.replace(/[?#].*$/, '').replace(/\/+$/, '') || '/';
  const atRoot = nav.some((n) => trim(pathname) === trim(n.to));
  const [screens, setScreens] = React.useState(0);
  const layerCtx = React.useMemo(
    () => ({ enter: () => setScreens((n) => n + 1), leave: () => setScreens((n) => Math.max(0, n - 1)) }),
    []
  );
  const layer = tabs === 'roots' && !atRoot;
  const screenHeader = layer && screens > 0;
  // by path SEGMENT, as `NavLink` matches: `/conta` must not light up on `/contatos`
  const inMore = moreItems.some(
    (n) => pathname === n.to || (!end(n) && pathname.startsWith(n.to.replace(/\/$/, '') + '/'))
  );
  const closeSheets = () => {
    setMoreOpen(false);
    setMenuOpen(false);
  };
  const sidebar = desktop === 'sidebar';
  // `actions` (an account menu, a bell) mounts ONCE: in sidebar mode it lives in the sidebar from `md` and in the top
  // bar below it, decided here rather than by CSS, which would mount it twice (two fetches, duplicate ids)
  const wide = useMinWidth(768);
  const label = (title ?? fabConfig.logoName) || '';
  const hasImage = !!(fabConfig.icon || fabConfig.logo);
  const showLabel = !!label && !(title == null && !fabConfig.icon && !!fabConfig.logo);
  // Top links from `lg`; between `md` and `lg` (a tablet) five labelled links do not fit beside the brand, so a
  // menu button opens them in a sheet. Under `md` the bottom bar carries them.
  // six or more labelled links do not fit beside the brand at 1024px: they wait for `xl`, the menu button covers the gap
  const manyLinks = nav.length > 5;
  const listLink = (n: (typeof nav)[number]) => (
    <NavLink
      key={n.to}
      to={n.to}
      end={end(n)}
      onClick={closeSheets}
      className={({ isActive }) =>
        cn(
          'flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
          isActive ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
        )
      }
    >
      <n.icon className="size-5" />
      {n.label}
    </NavLink>
  );
  const topLinks = (
    <>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label={t(loc, 'ui.menu')}
            className={cn(
              'hidden size-10 items-center justify-center rounded-md text-foreground hover:bg-muted md:inline-flex',
              manyLinks ? 'xl:hidden' : 'lg:hidden'
            )}
          >
            <Menu className="size-5" />
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-72 p-4">
          <SheetTitle className="sr-only">{t(loc, 'ui.menu')}</SheetTitle>
          <nav aria-label="Main" className="mt-8 flex flex-col gap-1">
            {items.map(listLink)}
          </nav>
        </SheetContent>
      </Sheet>
      <nav aria-label="Main" className={cn('hidden items-center gap-1', manyLinks ? 'xl:flex' : 'lg:flex')}>
        {items.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={end(n)}
            className={({ isActive }) =>
              cn(
                'inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors',
                isActive ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )
            }
          >
            <n.icon className="size-4" />
            {n.label}
          </NavLink>
        ))}
      </nav>
    </>
  );
  return (
    <LayerContext.Provider value={layerCtx}>
      <div className={cn('min-h-screen bg-background', className)}>
        {sidebar ? (
          <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-background md:flex">
            <Link
              to="/"
              className="flex min-h-14 items-center gap-2 px-4 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {/* the same rule as AppHeader: the mark only when an image exists (a monogram beside the spelled name is the
                brand twice), and no name beside a LOGO lockup that already has it drawn in */}
              {hasImage ? (
                <Logo variant="mark" className="shrink-0" imgClassName="h-8 w-auto max-w-[9rem] object-contain" />
              ) : null}
              {showLabel ? (
                <span className="min-w-0 truncate font-display text-base font-bold tracking-tight">{label}</span>
              ) : null}
            </Link>
            <nav aria-label="Main" className="flex flex-1 flex-col gap-1 px-3 py-2">
              {items.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={end(n)}
                  className={({ isActive }) =>
                    cn(
                      'flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    )
                  }
                >
                  <n.icon className="size-5" />
                  {n.label}
                </NavLink>
              ))}
            </nav>
            {actions && wide ? (
              <div className="flex items-center gap-2 border-t border-border px-4 py-3">{actions}</div>
            ) : null}
          </aside>
        ) : null}
        <div className={cn(sidebar && 'md:pl-60')}>
          {/* the phone always gets the top bar; with a sidebar the desktop does not need it (brand and actions are there) */}
          <AppHeader
            title={title}
            actions={sidebar && wide ? undefined : actions}
            className={cn(sidebar && 'md:hidden', screenHeader && 'max-md:hidden')}
          >
            {sidebar ? null : topLinks}
          </AppHeader>
          <main
            data-fab-shell="2"
            className={cn(
              layer ? 'pb-[env(safe-area-inset-bottom)]' : 'pb-[calc(4rem+env(safe-area-inset-bottom))]',
              'md:pb-0'
            )}
          >
            {children ?? <Outlet />}
          </main>
        </div>
        {/* `data-fab-shell`: this copy manages its own bars; the CSS fallback in index.css only touches older copies */}
        <nav
          aria-label="Main"
          data-fab-shell="2"
          className={cn(
            'fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden',
            layer && 'hidden'
          )}
        >
          <div className="mx-auto flex max-w-md justify-around pb-[env(safe-area-inset-bottom)]">
            {barItems.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={end(n)}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-14 flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium',
                    isActive ? 'text-primary-text' : 'text-muted-foreground'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                        isActive && 'bg-primary/10'
                      )}
                    >
                      <n.icon className="size-5" />
                    </span>
                    {n.label}
                  </>
                )}
              </NavLink>
            ))}
            {overflow ? (
              <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'flex min-h-14 flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium',
                      inMore ? 'text-primary-text' : 'text-muted-foreground'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                        inMore && 'bg-primary/10'
                      )}
                    >
                      <MoreHorizontal className="size-5" />
                    </span>
                    {t(loc, 'ui.more')}
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                  <SheetTitle className="sr-only">{t(loc, 'ui.more')}</SheetTitle>
                  <nav aria-label="More" className="mt-8 flex flex-col gap-1">
                    {moreItems.map(listLink)}
                  </nav>
                </SheetContent>
              </Sheet>
            ) : null}
          </div>
        </nav>
      </div>
    </LayerContext.Provider>
  );
}

function useMinWidth(px: number): boolean {
  const query = `(min-width: ${px}px)`;
  const [match, setMatch] = React.useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  React.useEffect(() => {
    const mql = window.matchMedia(query);
    const on = () => setMatch(mql.matches);
    on();
    mql.addEventListener('change', on);
    return () => mql.removeEventListener('change', on);
  }, [query]);
  return match;
}

export { AppShell };
