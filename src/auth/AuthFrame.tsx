import * as React from 'react';
import { AUTH } from './config';
import { HAS_HERO, HeroImage } from './hero';
import { BrandLink, FormColumn, useMedia, type FrameProps } from './kit';
import { BigName, Quote, Tagline, hasQuote, hasTagline } from './panels';

/**
 * COMMUNITY WALL: faces before fields. Churches, schools and parents' portals, courses, clubs, associations, classes.
 * Every person shown must be real, so every slot is optional and the fallbacks are strict: a group photo with the
 * testimonial overlapping its edge; no photo but a testimonial, the testimonial carries the panel; nothing at all,
 * a centred column (an empty wall would be worse than no wall).
 */
export default function AuthFrame(props: FrameProps) {
  const desktop = useMedia('(min-width: 1024px)');
  const hasWall = HAS_HERO || hasQuote() || hasTagline();
  if (!hasWall) {
    return (
      <main
        className="auth min-h-[100dvh] bg-background text-foreground"
        data-skin={AUTH.skin}
        data-layout="community-wall"
      >
        <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-6 pb-[max(env(safe-area-inset-bottom),2rem)] pt-[max(env(safe-area-inset-top),2.5rem)] lg:justify-center">
          <div className="auth-fade mb-10">
            <BrandLink />
          </div>
          <FormColumn {...props} />
        </div>
      </main>
    );
  }
  return (
    <main
      className="auth min-h-[100dvh] bg-background text-foreground"
      data-skin={AUTH.skin}
      data-layout="community-wall"
    >
      <div className="grid min-h-[100dvh] lg:grid-cols-2">
        <aside className="relative hidden flex-col bg-accent p-12 lg:flex">
          <div className="auth-fade">
            <BrandLink />
          </div>
          <div className="flex flex-1 flex-col justify-center gap-8 py-10">
            {HAS_HERO && desktop ? (
              <div className="relative">
                <div className="auth-settle overflow-hidden rounded-[var(--auth-radius-card)] bg-muted">
                  <HeroImage priority className="aspect-[4/3] size-full object-cover" />
                </div>
                {hasQuote() ? (
                  <div className="auth-rise relative -mt-16 mx-8 rounded-[var(--auth-radius-card)] bg-card p-6 shadow-lg [--i:3]">
                    <Quote quoteClassName="font-display text-xl" metaClassName="text-muted-foreground" />
                  </div>
                ) : (
                  <Tagline as="h2" className="auth-poster auth-rise mt-8 font-display text-3xl leading-tight" />
                )}
              </div>
            ) : (
              <>
                {hasTagline() ? (
                  <Tagline as="h2" className="auth-poster auth-rise font-display text-4xl leading-tight" />
                ) : (
                  <BigName className="auth-rise text-5xl" />
                )}
                {hasQuote() ? (
                  <div className="auth-rise rounded-[var(--auth-radius-card)] bg-card p-8 shadow-lg [--i:2]">
                    <Quote quoteClassName="font-display text-2xl" metaClassName="text-muted-foreground" />
                  </div>
                ) : null}
              </>
            )}
          </div>
        </aside>
        <section className="flex flex-col px-6 pb-[max(env(safe-area-inset-bottom),2rem)] pt-[max(env(safe-area-inset-top),2.5rem)] lg:justify-center lg:px-12">
          <div className="auth-fade mb-8 lg:hidden">
            <BrandLink />
          </div>
          {HAS_HERO && !desktop ? (
            <div className="auth-shrink mb-8 overflow-hidden rounded-[var(--auth-radius-card)] bg-muted">
              <HeroImage priority className="aspect-[16/9] size-full object-cover" />
            </div>
          ) : null}
          <FormColumn
            {...props}
            subtitle={props.subtitle ?? <Tagline className="lg:hidden" />}
            className="mx-auto lg:mx-0"
          />
          {hasQuote() ? (
            <Quote
              className="mx-auto mt-10 w-full max-w-sm border-t border-border pt-6 lg:hidden"
              quoteClassName="text-sm"
              metaClassName="text-muted-foreground"
            />
          ) : null}
        </section>
      </div>
    </main>
  );
}
