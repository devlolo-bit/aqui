import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/fab-client";
import { t } from "@/lib/fab-i18n";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export type ComboboxOption = { value: string; label: string };

/**
 * Combobox — a SEARCHABLE Select (type and filter). Ideal for picking a related record, a category etc.
 * `<Combobox options={[{value,label}]} value={v} onChange={setV} placeholder="Pick one…" />`.
 */
function Combobox({
  options, value, onChange, placeholder, searchPlaceholder, emptyText,
  className, disabled,
}: {
  options: ComboboxOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
}) {
  const loc = useLocale();
  const [open, setOpen] = React.useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-[13px] outline-none transition-[color,box-shadow]",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/15 disabled:pointer-events-none disabled:opacity-50",
          className,
        )}
      >
        <span className={cn("truncate", !selected && "text-muted-foreground")}>{selected ? selected.label : (placeholder ?? t(loc, "ui.select"))}</span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder ?? t(loc, "ui.search")} />
          <CommandList>
            <CommandEmpty>{emptyText ?? t(loc, "ui.notFound")}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={o.label}
                  onSelect={() => { onChange?.(o.value); setOpen(false); }}
                >
                  <Check className={cn("size-4 text-primary", o.value === value ? "opacity-100" : "opacity-0")} />
                  {o.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export { Combobox };
