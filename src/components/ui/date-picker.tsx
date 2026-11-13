import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/fab-client";
import { t } from "@/lib/fab-i18n";
import { formatDate } from "@/lib/fab-client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

/**
 * DatePicker — an input + a calendar in a popover. The `value`/`onChange` are `Date`s. E.g.:
 * `<DatePicker value={date} onChange={setDate} />`. It shows the date in the app's LOCALE (`formatDate`) — pt-BR → dd/mm/aaaa,
 * en-US → mm/dd/yyyy — instead of a fixed format. Prefer it over the native `<input type="date">` (which follows the browser,
 * not the app). Deterministic (with no hydration mismatch: there is no SSR).
 */
function DatePicker({
  value, onChange, placeholder, className, disabled,
}: {
  value?: Date;
  onChange?: (date?: Date) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const loc = useLocale();
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          "flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-[13px] outline-none transition-[color,box-shadow]",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/15 disabled:pointer-events-none disabled:opacity-50",
          !value && "text-muted-foreground",
          className,
        )}
      >
        <CalendarIcon className="size-4 text-muted-foreground" />
        {value ? formatDate(value) : (placeholder ?? t(loc, "ui.pickDate"))}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={(date) => { onChange?.(date); setOpen(false); }} />
      </PopoverContent>
    </Popover>
  );
}

export { DatePicker };
