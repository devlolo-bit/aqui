import * as React from "react";
import { cn } from "@/lib/utils";

const PRESETS = ["#742fc2", "#2a6fdb", "#0e9f6e", "#e0a92b", "#c0392b", "#db2777", "#0891b2", "#4b5563", "#16121e"];

/**
 * ColorPicker — quick swatches + a free picker (HEX). `value`/`onChange` = a HEX string. E.g.:
 * `<ColorPicker value={cor} onChange={setCor} />`.
 */
function ColorPicker({
  value = "#742fc2", onChange, presets = PRESETS, className,
}: {
  value?: string;
  onChange?: (hex: string) => void;
  presets?: string[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {presets.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange?.(c)}
          aria-label={c}
          className={cn("size-6 rounded-md border border-border transition-transform hover:scale-105", value.toLowerCase() === c.toLowerCase() && "ring-2 ring-ring ring-offset-1")}
          style={{ backgroundColor: c }}
        />
      ))}
      <label className="relative flex size-6 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-border" style={{ backgroundColor: value }}>
        <input type="color" value={value} onChange={(e) => onChange?.(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
      </label>
    </div>
  );
}

export { ColorPicker };
