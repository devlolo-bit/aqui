import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * OTPInput — a verification code in N boxes (auto-advance, a paste fills them all, backspace goes back). The `value`/`onChange`
 * are the code's string. E.g.: `<OTPInput length={6} value={code} onChange={setCode} />`.
 */
function OTPInput({
  length = 6, value = "", onChange, disabled, className,
}: {
  length?: number;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);
  const chars = Array.from({ length }, (_, i) => value[i] ?? "");

  const set = (i: number, ch: string) => {
    const next = chars.slice();
    next[i] = ch;
    onChange?.(next.join("").slice(0, length));
  };

  return (
    <div className={cn("flex flex-wrap justify-center gap-2", className)}>
      {chars.map((ch, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={ch}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, "").slice(-1);
            set(i, d);
            if (d && i < length - 1) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !chars[i] && i > 0) refs.current[i - 1]?.focus();
          }}
          onPaste={(e) => {
            e.preventDefault();
            const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
            if (pasted) { onChange?.(pasted); refs.current[Math.min(pasted.length, length - 1)]?.focus(); }
          }}
          className="size-11 rounded-md border border-input bg-background text-center text-lg font-semibold tabular-nums outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/15 disabled:pointer-events-none disabled:opacity-50"
        />
      ))}
    </div>
  );
}

export { OTPInput };
