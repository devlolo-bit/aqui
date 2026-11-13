import * as React from 'react';
import { cn } from '@/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-[13px] leading-relaxed outline-none transition-[color,box-shadow]',
        'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/15',
        'aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/15',
        'disabled:pointer-events-none disabled:opacity-50 disabled:bg-muted',
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
