import * as React from "react";
import { Search } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/fab-client";
import { t } from "@/lib/fab-i18n";
import { Icon, ICON_NAMES } from "@/components/ui/icon";

// The common set shown BEFORE the search (it does not render the ~1500 up front). The search sweeps the whole library.
const COMMON = [
  "Store", "ShoppingBag", "ShoppingCart", "Coffee", "Utensils", "Pizza", "Heart", "Star", "Home", "MapPin",
  "Phone", "Mail", "User", "Users", "Calendar", "Clock", "Camera", "Image", "Music", "Video", "Gift", "Tag",
  "Bell", "Settings", "Search", "Car", "Plane", "Briefcase", "Book", "Bookmark", "Dumbbell", "Scissors",
  "Sparkles", "Palette", "Wrench", "Truck", "Package", "CreditCard", "DollarSign", "Percent", "Award", "Trophy",
  "Flame", "Leaf", "Sun", "Moon", "Cloud", "Zap", "Wifi", "Globe", "Building2", "Hospital", "Stethoscope",
  "GraduationCap", "PawPrint", "Baby", "Shirt", "Wine", "Beer", "IceCream", "Cake", "Apple", "Bike", "Bus",
  "Anchor", "Tent", "Mountain", "Waves", "TreePine", "Gem", "Crown", "Ticket", "Megaphone", "Film", "Gamepad2",
  "Headphones", "Mic", "Tv", "Smartphone", "Laptop", "Monitor", "Lightbulb", "Key", "Lock", "Shield", "Flag",
  "Compass", "Map", "Navigation", "Send", "MessageCircle", "ThumbsUp",
];

/**
 * IconPicker — it picks a Lucide icon (https://lucide.dev). The `value`/`onChange` = the icon's NAME (PascalCase).
 * It shows a common set and searches the whole library. It is how you FILL an `icon` field. E.g.:
 * `<IconPicker value={icon} onChange={setIcon} />` and save the `icon` on the record; display it with an `<Icon name={icon} />`.
 */
function IconPicker({
  value, onChange, className, placeholder = "Escolher ícone",
}: {
  value?: string | null;
  onChange?: (name: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const loc = useLocale();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const results = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return COMMON;
    return ICON_NAMES.filter((n) => String(n).toLowerCase().includes(term)).slice(0, 60);
  }, [q]);
  const pick = (name: string) => { onChange?.(name); setOpen(false); setQ(""); };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={cn("flex w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-[13px]", className)}>
          <Icon name={value} className="size-5 shrink-0 text-foreground" />
          <span className={cn("truncate", !value && "text-muted-foreground")}>{value || placeholder}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="mb-2 flex items-center gap-2 rounded-md border border-input px-2">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t(loc, "ui.searchIcon")}
            className="h-8 w-full bg-transparent text-base md:text-[13px] outline-none placeholder:text-muted-foreground" />
        </div>
        <div className="grid max-h-52 grid-cols-6 gap-1 overflow-y-auto">
          {results.map((n) => (
            <button key={n} type="button" title={n} onClick={() => pick(n)}
              className={cn("flex aspect-square items-center justify-center rounded-md hover:bg-accent", value === n && "bg-accent ring-1 ring-ring")}>
              <Icon name={n} className="size-4" />
            </button>
          ))}
          {results.length === 0 && <div className="col-span-6 py-6 text-center text-[13px] text-muted-foreground">Nenhum ícone.</div>}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { IconPicker };
