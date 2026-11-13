import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale } from '@/lib/fab-client';
import { t } from '@/lib/fab-i18n';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

type Country = { iso: string; name: string; dial: string; mask?: string };

// A curated dataset (self-contained — with no external lib). The `mask` = the NATIONAL number's formatting ('#' = a digit).
const COUNTRIES: Country[] = [
  { iso: 'BR', name: 'Brasil', dial: '55', mask: '(##) #####-####' },
  { iso: 'PT', name: 'Portugal', dial: '351', mask: '### ### ###' },
  { iso: 'US', name: 'Estados Unidos', dial: '1', mask: '(###) ###-####' },
  { iso: 'AR', name: 'Argentina', dial: '54', mask: '## ####-####' },
  { iso: 'MX', name: 'México', dial: '52', mask: '## #### ####' },
  { iso: 'CL', name: 'Chile', dial: '56', mask: '# #### ####' },
  { iso: 'CO', name: 'Colômbia', dial: '57', mask: '### ### ####' },
  { iso: 'PE', name: 'Peru', dial: '51', mask: '### ### ###' },
  { iso: 'UY', name: 'Uruguai', dial: '598', mask: '#### ####' },
  { iso: 'PY', name: 'Paraguai', dial: '595', mask: '### ######' },
  { iso: 'ES', name: 'Espanha', dial: '34', mask: '### ## ## ##' },
  { iso: 'GB', name: 'Reino Unido', dial: '44', mask: '#### ######' },
  { iso: 'FR', name: 'França', dial: '33', mask: '# ## ## ## ##' },
  { iso: 'DE', name: 'Alemanha', dial: '49' },
  { iso: 'IT', name: 'Itália', dial: '39' },
  { iso: 'CA', name: 'Canadá', dial: '1', mask: '(###) ###-####' },
  { iso: 'JP', name: 'Japão', dial: '81' },
  { iso: 'CN', name: 'China', dial: '86' },
  { iso: 'IN', name: 'Índia', dial: '91', mask: '##### #####' },
  { iso: 'AU', name: 'Austrália', dial: '61' },
  { iso: 'AO', name: 'Angola', dial: '244', mask: '### ### ###' },
  { iso: 'MZ', name: 'Moçambique', dial: '258', mask: '## ### ####' },
];

const flagEmoji = (iso: string) =>
  iso.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));

function applyMask(digits: string, mask?: string): string {
  if (!mask) return digits;
  let out = '';
  let di = 0;
  for (let i = 0; i < mask.length && di < digits.length; i++) {
    out += mask[i] === '#' ? digits[di++] : mask[i];
  }
  if (di < digits.length) out += digits.slice(di);
  return out;
}

function findByE164(value?: string): { country: Country; national: string } | null {
  if (!value || !value.startsWith('+')) return null;
  const digits = value.slice(1).replace(/\D/g, '');
  // it matches the LONGEST dial code first (it avoids the ambiguity between +1 and +55 etc.)
  const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  const c = sorted.find((x) => digits.startsWith(x.dial));
  if (!c) return null;
  return { country: c, national: digits.slice(c.dial.length) };
}

/**
 * PhoneInput — a phone with a country code/flag/mask. The value is ALWAYS in E.164 (`+5511997998229`) — it plugs straight into
 * `notify('sms', { to })`. `defaultCountry` sets the default dial code/format; `countrySelector={false}` pins the
 * country (the national number only). Stylable through the `className`.
 */
function PhoneInput({
  value,
  onChange,
  defaultCountry = 'BR',
  countrySelector = true,
  placeholder,
  className,
  disabled,
  ...rest
}: {
  value?: string;
  onChange?: (e164: string) => void;
  defaultCountry?: string;
  countrySelector?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
} & Omit<React.ComponentProps<'input'>, 'value' | 'onChange'>) {
  const parsed = findByE164(value);
  const initial = COUNTRIES.find((c) => c.iso === defaultCountry.toUpperCase()) ?? COUNTRIES[0];
  // THE COUNTRY IS DERIVED, NOT STORED, and that is the whole bug this shape fixes. It used to be
  // `useState(parsed?.country ?? initial)`, and a state INITIALISER runs once: on an edit form the record arrives
  // AFTER mount, so `parsed` was still null and the country stayed on the default. The field then showed the wrong
  // flag, the wrong dial code and the wrong mask over a foreign number, and the first keystroke called `emit` with
  // the default country, REWRITING a real phone number as `+55…`. The state now holds only the manual pick, which
  // is the one case the value cannot answer: the picker used before any digits exist.
  const [picked, setPicked] = React.useState<Country | null>(null);
  const country = parsed?.country ?? picked ?? initial;
  const [open, setOpen] = React.useState(false);
  const loc = useLocale();

  // A value that does not parse as E.164 still has to SHOW. Rendering an empty field over a stored number is the same
  // class of loss as rewriting it: the person sees a blank, types, and overwrites what was there. A value with no `+`
  // is read as national digits for the current country; one that starts with `+` and matches no country is genuinely
  // unknown, and blank is the honest answer.
  const raw = String(value ?? '');
  const rawDigits = raw.replace(/\D/g, '');
  const maskLen = (country.mask?.match(/#/g) || []).length;
  // …and a value stored WITHOUT the `+` but WITH the country code ("5511…") is read as national digits too unless we
  // strip the dial first: `applyMask` appends whatever the mask cannot hold, so the field would show the country code
  // twice. Only strip when the digits are longer than the mask can take, so a national number starting with the same
  // two digits as the dial code is left alone.
  const semDDI =
    maskLen > 0 && rawDigits.length > maskLen && rawDigits.startsWith(String(country.dial))
      ? rawDigits.slice(String(country.dial).length)
      : rawDigits;
  const nationalDigits = parsed ? parsed.national.replace(/\D/g, '') : raw.startsWith('+') ? '' : semDDI;
  const display = applyMask(nationalDigits, country.mask);

  const emit = (nat: string, c: Country) => {
    const d = nat.replace(/\D/g, '');
    onChange?.(d ? `+${c.dial}${d}` : '');
  };

  return (
    <div className={cn('flex items-stretch gap-2', className)}>
      {countrySelector ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            type="button"
            disabled={disabled}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-[13px] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/15 disabled:pointer-events-none disabled:opacity-50"
          >
            <span className="text-base leading-none">{flagEmoji(country.iso)}</span>
            <span className="text-muted-foreground">+{country.dial}</span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput placeholder={t(loc, 'ui.searchCountry')} />
              <CommandList>
                <CommandEmpty>{t(loc, 'ui.notFound')}</CommandEmpty>
                <CommandGroup>
                  {COUNTRIES.map((c) => (
                    <CommandItem
                      key={c.iso}
                      value={`${c.name} +${c.dial}`}
                      onSelect={() => {
                        setPicked(c);
                        setOpen(false);
                        emit(nationalDigits, c);
                      }}
                    >
                      <span className="text-base leading-none">{flagEmoji(c.iso)}</span>
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="text-muted-foreground">+{c.dial}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      ) : (
        <span className="flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-input bg-muted px-2.5 text-[13px] text-muted-foreground">
          <span className="text-base leading-none">{flagEmoji(country.iso)}</span>+{country.dial}
        </span>
      )}
      <input
        type="tel"
        inputMode="tel"
        disabled={disabled}
        value={display}
        placeholder={placeholder ?? country.mask?.replace(/#/g, '0') ?? 'Telefone'}
        onChange={(e) => emit(e.target.value.replace(/\D/g, ''), country)}
        className={cn(
          'flex h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-base md:text-[13px] outline-none transition-[color,box-shadow]',
          'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/15',
          'aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/15 disabled:pointer-events-none disabled:opacity-50'
        )}
        {...rest}
      />
    </div>
  );
}

export { PhoneInput };
