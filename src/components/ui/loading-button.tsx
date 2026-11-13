import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

/**
 * LoadingButton — a button with a loading state: it shows a spinner and disables itself during the action. Use it on EVERY
 * submit/asynchronous action. The label comes from the `children` (the AI already generates it in the target language); when absent, it falls back to the
 * English default "Save". E.g.: `<LoadingButton loading={saving}>Save</LoadingButton>`.
 */
function LoadingButton({
  loading,
  disabled,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { loading?: boolean }) {
  return (
    <Button disabled={loading || disabled} {...props}>
      {loading && <Spinner className="size-4" />}
      {children ?? 'Save'}
    </Button>
  );
}

export { LoadingButton };
