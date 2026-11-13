import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * DescriptionList — label→value pairs (a record's/profile's details). E.g.:
 * `<DescriptionList items={[{label:'E-mail', value:user.email}]} />`.
 */
function DescriptionList({
  items, className,
}: {
  items: { label: React.ReactNode; value: React.ReactNode }[];
  className?: string;
}) {
  return (
    <dl className={cn("divide-y divide-border", className)}>
      {items.map((it, i) => (
        <div key={i} className="grid grid-cols-1 gap-1 py-2.5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
          <dt className="text-[13px] font-medium text-muted-foreground">{it.label}</dt>
          <dd className="min-w-0 break-words text-[13px] text-foreground">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export { DescriptionList };
