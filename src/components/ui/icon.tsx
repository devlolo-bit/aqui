import * as React from "react";
import { icons, HelpCircle, type LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

export type IconName = keyof typeof icons;

// The available names (PascalCase, e.g. "Store", "Coffee") — without the duplicate `*Icon` aliases; it feeds the IconPicker.
export const ICON_NAMES = (Object.keys(icons) as IconName[]).filter((n) => !String(n).endsWith("Icon"));

/**
 * Icon — it renders a Lucide icon (https://lucide.dev) by NAME (PascalCase). A graceful fallback when the name
 * is empty/unknown. It is how you DISPLAY an `icon` field. E.g.:
 * `<Icon name={categoria.icon} className="size-5 text-primary" />`.
 */
function Icon({ name, className, ...props }: { name?: string | null } & Omit<LucideProps, "name">) {
  const map = icons as Record<string, React.ComponentType<LucideProps>>;
  const Cmp = (name && map[name]) || HelpCircle;
  return <Cmp className={cn(className)} {...props} />;
}

export { Icon };
