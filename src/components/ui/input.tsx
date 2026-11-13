import * as React from 'react';
import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      className={cn(
        'border-input flex h-9 w-full min-w-0 rounded-md border bg-background px-3 py-1 text-base md:text-[13px] transition-[color,box-shadow] outline-none',
        'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/15',
        'aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/15',
        'disabled:pointer-events-none disabled:opacity-50 disabled:bg-muted',
        className
      )}
      {...props}
    />
  );
}

export { Input };
