import * as React from "react";
import { cn } from "@/lib/utils";
import { fabConfig } from "@/lib/fab-client";

// the decimal digits per currency (most = 2; JPY/KRW = 0). Used both to format and to read the input.
function fractionDigits(currency: string): number {
  return /^(JPY|KRW|CLP|VND|ISK|HUF)$/i.test(currency) ? 0 : 2;
}

/** It formats a value (in the major unit, e.g. 12.34) in the given currency/locale through Intl.NumberFormat. */
function formatMoney(value: number, currency: string, locale?: string): string {
  try {
    return new Intl.NumberFormat(locale || undefined, { style: "currency", currency }).format(value);
  } catch {
    // a defensive fallback if the currency/locale is invalid
    return `${currency} ${value.toFixed(fractionDigits(currency))}`;
  }
}

/**
 * CurrencyInput — a CURRENCY-AWARE money input with a mask. The `value`/`onChange` in the major unit (a number,
 * e.g. 1234.56). The `currency` (ISO 4217, e.g. 'USD'|'BRL'|'EUR'; the APP's currency by default) sets the symbol and the
 * decimal places; the `locale` (e.g. 'pt-BR'; the app's locale by default) controls the formatting. E.g.: `<CurrencyInput value={price} onChange={setPrice} currency="BRL" locale="pt-BR" />`.
 */
function CurrencyInput({
  value, onChange, currency: currencyProp, locale: localeProp, className, disabled, placeholder, ...rest
}: {
  value?: number;
  onChange?: (value: number) => void;
  currency?: string;
  locale?: string;
  className?: string;
} & Omit<React.ComponentProps<"input">, "value" | "onChange">) {
  // The app's own currency and locale, not a fixed "USD": a field written without a `currency` prop showed US$ in a
  // Brazilian app even after the app's currency was set to BRL, because the default here never read it.
  const currency = currencyProp || fabConfig.currency || "USD";
  const locale = localeProp || fabConfig.locale || undefined;
  const digits = fractionDigits(currency);
  const factor = Math.pow(10, digits);
  const ph = placeholder ?? formatMoney(0, currency, locale);
  return (
    <input
      inputMode="numeric"
      disabled={disabled}
      value={value == null ? "" : formatMoney(value, currency, locale)}
      placeholder={ph}
      onChange={(e) => {
        const raw = e.target.value.replace(/\D/g, "");
        onChange?.(raw ? Number(raw) / factor : 0);
      }}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-background px-3 text-base md:text-[13px] tabular-nums outline-none transition-[color,box-shadow]",
        "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/15",
        "aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/15 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...rest}
    />
  );
}

export { CurrencyInput };
