import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/fab-client";
import { t } from "@/lib/fab-i18n";

/**
 * TagsInput — multiple values as chips (Enter/a comma adds, Backspace/X removes). The `value`/`onChange` = a string[].
 * `<TagsInput value={tags} onChange={setTags} placeholder="Add…" />`.
 */
function TagsInput({
  value = [], onChange, placeholder, className, disabled,
}: {
  value?: string[];
  onChange?: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const loc = useLocale();
  const [draft, setDraft] = React.useState("");
  const add = (t: string) => {
    const v = t.trim();
    if (v && !value.includes(v)) onChange?.([...value, v]);
    setDraft("");
  };
  return (
    <div className={cn("flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/15", disabled && "pointer-events-none opacity-50", className)}>
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-primary">
          {t}
          <button type="button" onClick={() => onChange?.(value.filter((x) => x !== t))} className="hover:text-destructive"><X className="size-3" /></button>
        </span>
      ))}
      <input
        value={draft}
        disabled={disabled}
        placeholder={value.length === 0 ? (placeholder ?? t(loc, "ui.addItem")) : ""}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(draft); }
          else if (e.key === "Backspace" && !draft && value.length) onChange?.(value.slice(0, -1));
        }}
        onBlur={() => draft && add(draft)}
        className="min-w-[6rem] flex-1 bg-transparent text-base outline-none md:text-[13px] placeholder:text-muted-foreground"
      />
    </div>
  );
}

export { TagsInput };
