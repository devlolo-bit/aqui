import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative flex w-full gap-3 rounded-lg border px-3.5 py-3 text-[13px] [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:mt-0.5",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground border-border [&>svg]:text-muted-foreground",
        info: "bg-info/10 text-info border-info/25 [&>svg]:text-info",
        success: "bg-success/10 text-success border-success/25 [&>svg]:text-success",
        warning: "bg-warning/10 text-warning border-warning/25 [&>svg]:text-warning",
        destructive: "bg-destructive/10 text-destructive border-destructive/25 [&>svg]:text-destructive",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Alert({ className, variant, ...props }: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}
function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("font-semibold text-foreground", className)} {...props} />;
}
function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("text-current/85 leading-relaxed", className)} {...props} />;
}

export { Alert, AlertTitle, AlertDescription };
