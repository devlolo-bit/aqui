import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function Breadcrumb({ className, ...props }: React.ComponentProps<"nav">) {
  return <nav aria-label="breadcrumb" className={cn("flex items-center gap-1.5 text-[13px] text-muted-foreground", className)} {...props} />;
}
function BreadcrumbItem({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("inline-flex items-center", className)} {...props} />;
}
function BreadcrumbLink({ className, ...props }: React.ComponentProps<"a">) {
  return <a className={cn("transition-colors hover:text-foreground", className)} {...props} />;
}
function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
  return <span aria-current="page" className={cn("font-medium text-foreground", className)} {...props} />;
}
function BreadcrumbSeparator({ className, ...props }: React.ComponentProps<"span">) {
  return <span aria-hidden className={cn("text-muted-foreground/60", className)} {...props}><ChevronRight className="size-3.5" /></span>;
}

export { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator };
