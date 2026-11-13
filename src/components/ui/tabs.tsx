import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;

/** A list of tabs. A `variant="pill"` = a segmented background; the default = underlined. */
function TabsList({
  className,
  variant = 'underline',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & { variant?: 'underline' | 'pill' }) {
  return (
    <TabsPrimitive.List
      data-variant={variant}
      className={cn(
        'inline-flex items-center',
        variant === 'pill' ? 'gap-1 rounded-lg bg-secondary p-1' : 'gap-5 border-b border-border',
        className
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap text-[13px] font-medium text-muted-foreground transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/15 disabled:pointer-events-none disabled:opacity-50',
        // underlined (the default)
        'group-data-[variant=underline]:pb-2.5',
        '[[data-variant=underline]_&]:-mb-px [[data-variant=underline]_&]:border-b-2 [[data-variant=underline]_&]:border-transparent [[data-variant=underline]_&]:pb-2.5 [[data-variant=underline]_&]:data-[state=active]:border-primary [[data-variant=underline]_&]:data-[state=active]:text-primary [[data-variant=underline]_&]:data-[state=active]:font-semibold',
        // pill
        '[[data-variant=pill]_&]:rounded-md [[data-variant=pill]_&]:px-3 [[data-variant=pill]_&]:py-1.5 [[data-variant=pill]_&]:data-[state=active]:bg-background [[data-variant=pill]_&]:data-[state=active]:text-foreground [[data-variant=pill]_&]:data-[state=active]:font-semibold [[data-variant=pill]_&]:data-[state=active]:shadow-sm',
        className
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn('mt-4 outline-none', className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
