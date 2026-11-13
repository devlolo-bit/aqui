import * as React from 'react';
import { cn } from '@/lib/utils';

// The card's ELEVATION. Tailwind's `shadow-sm` is ONE contact shadow at 5% — it vanishes against any light
// background, and it is what makes a white card on light grey read as a drawn rectangle instead of a surface. A
// shadow that reads as depth has two layers: contact (short) + ambient (wide and soft). And in slate blue
// (16,24,40), not pure black: black over a light background greys the surface out.

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'bg-card text-card-foreground flex flex-col gap-6 rounded-2xl border border-border/60 py-6 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-12px_rgba(16,24,40,0.12)]',
        className
      )}
      {...props}
    />
  );
}
function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1.5 px-6', className)} {...props} />;
}
function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('font-display font-bold leading-none', className)} {...props} />;
}
function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('text-muted-foreground text-sm', className)} {...props} />;
}
function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('px-6', className)} {...props} />;
}
function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex items-center px-6', className)} {...props} />;
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
