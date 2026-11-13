import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/fab-client";
import { t } from "@/lib/fab-i18n";
import { buttonVariants } from "@/components/ui/button";

/**
 * Pagination — a simple page control. `<Pagination page={p} pageCount={n} onPageChange={setP} />`.
 */
function Pagination({
  page, pageCount, onPageChange, className,
}: {
  page: number;
  pageCount: number;
  onPageChange?: (page: number) => void;
  className?: string;
}) {
  const loc = useLocale();
  const go = (p: number) => onPageChange?.(Math.min(Math.max(1, p), pageCount));
  return (
    <nav className={cn("flex items-center justify-between gap-2", className)} aria-label={t(loc, "ui.pagination")}>
      <span className="text-xs text-muted-foreground">{t(loc, "ui.page")} {page} {t(loc, "ui.of")} {pageCount}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => go(page - 1)}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1")}
        >
          <ChevronLeft className="size-4" /> {t(loc, "ui.prev")}
        </button>
        <button
          type="button"
          disabled={page >= pageCount}
          onClick={() => go(page + 1)}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1")}
        >
          {t(loc, "ui.next")} <ChevronRight className="size-4" />
        </button>
      </div>
    </nav>
  );
}

export { Pagination };
