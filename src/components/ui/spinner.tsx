import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/** A loading indicator (a spinning arc). `size-4` by default; use a `size-*` in the className to adjust it. */
function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-4 animate-spin', className)} aria-hidden="true" />;
}

export { Spinner };
