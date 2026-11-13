import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

function Calendar({ className, classNames, showOutsideDays = true, ...props }: React.ComponentProps<typeof DayPicker>) {
  const d = getDefaultClassNames();
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: cn(d.months, "relative"),
        month: cn(d.month, "space-y-3"),
        month_caption: cn(d.month_caption, "flex h-9 items-center justify-center"),
        caption_label: cn(d.caption_label, "text-sm font-semibold"),
        nav: cn(d.nav, "absolute inset-x-0 top-0 flex items-center justify-between px-1"),
        button_previous: cn(buttonVariants({ variant: "ghost" }), "size-7 p-0"),
        button_next: cn(buttonVariants({ variant: "ghost" }), "size-7 p-0"),
        month_grid: cn(d.month_grid, "w-full border-collapse"),
        weekdays: cn(d.weekdays, "flex"),
        weekday: cn(d.weekday, "w-9 text-[11px] font-normal text-muted-foreground"),
        week: cn(d.week, "mt-1 flex w-full"),
        day: cn(d.day, "size-9 p-0 text-center text-[13px]"),
        day_button: cn(d.day_button, "size-9 rounded-md font-normal hover:bg-accent hover:text-accent-foreground"),
        selected: cn(d.selected, "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary"),
        today: cn(d.today, "[&>button]:font-semibold [&>button]:text-primary"),
        outside: cn(d.outside, "text-muted-foreground/50"),
        disabled: cn(d.disabled, "opacity-40"),
        hidden: cn(d.hidden, "invisible"),
        range_middle: cn(d.range_middle, "[&>button]:rounded-none [&>button]:bg-accent [&>button]:text-accent-foreground"),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: cl }) =>
          orientation === "left"
            ? <ChevronLeft className={cn("size-4", cl)} />
            : <ChevronRight className={cn("size-4", cl)} />,
      }}
      {...props}
    />
  );
}

export { Calendar };
