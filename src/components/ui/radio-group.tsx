import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";

function RadioGroup({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return <RadioGroupPrimitive.Root className={cn("grid gap-2.5", className)} {...props} />;
}

function RadioGroupItem({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      className={cn(
        "aspect-square size-[18px] shrink-0 rounded-full border border-input text-primary outline-none transition-shadow",
        "focus-visible:ring-[3px] focus-visible:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary",
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <Circle className="size-2.5 fill-primary text-primary" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

/**
 * RadioCard — the "selectable card" variant (great for picking a plan/goal). It wraps the value: when checked, the
 * border turns primary + a tinted background. Use it inside a <RadioGroup>: `<RadioCard value="hypertrophy">Gain muscle</RadioCard>`.
 */
function RadioCard({ className, children, value, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      value={value}
      className={cn(
        "group relative flex items-start gap-3 rounded-xl border border-input bg-background p-4 text-left outline-none transition-all",
        "focus-visible:ring-[3px] focus-visible:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:border-primary data-[state=checked]:bg-accent/60 data-[state=checked]:ring-[3px] data-[state=checked]:ring-ring/10",
        className,
      )}
      {...props}
    >
      <span className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border border-input group-data-[state=checked]:border-primary">
        <RadioGroupPrimitive.Indicator><Circle className="size-2.5 fill-primary text-primary" /></RadioGroupPrimitive.Indicator>
      </span>
      <span className="text-[13px]">{children}</span>
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem, RadioCard };
