import * as React from "react";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiError, geoAutocomplete, geoPlace } from "@/lib/fab-client";

export type GeoValue = { address: string; lat?: number; lng?: number };

/**
 * AddressInput — an address autocomplete (the Maps integration). It returns `{address, lat, lng}` (the `geo` field's format).
 * If the Maps is not configured, it degrades to a plain text input. `<AddressInput value={addr} onChange={setAddr} />`.
 * The lookup goes through the SDK (`geoAutocomplete`/`geoPlace`), never a hand-written `fetch`: only the SDK sends the
 * session, and without it the server answers 401 to a signed-in user. A visitor with no session gets suggestions only
 * when the owner allowed it in the Maps card; otherwise this is a plain text input for them, by design.
 */
function AddressInput({
  value, onChange, placeholder = "Digite um endereço…", className, disabled,
}: {
  value?: GeoValue;
  onChange?: (v: GeoValue) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [query, setQuery] = React.useState(value?.address ?? "");
  const [suggestions, setSuggestions] = React.useState<{ place_id: string; description: string }[]>([]);
  const [open, setOpen] = React.useState(false);
  const session = React.useRef<string>("");
  if (!session.current && typeof crypto !== "undefined") session.current = crypto.randomUUID();
  // Set once the server has said this field will get nothing: Maps not connected (`configured:false`) or a visitor
  // the owner did not let in (401). Without it every debounced keystroke fired another request the server loads,
  // rate-limits and METERS to the owner before refusing — forty metered calls to type one address into a text box.
  // Per mount on purpose: the answer can change (the owner connects Maps, the visitor signs in) and a remount asks again.
  const unavailable = React.useRef(false);

  React.useEffect(() => {
    if (!query.trim() || query === value?.address || unavailable.current) { setSuggestions([]); return; }
    let alive = true;   // a slower answer for an OLDER query must not overwrite the newer one's suggestions
    const t = setTimeout(async () => {
      try {
        const r = await geoAutocomplete(query, session.current);
        if (r?.configured === false) unavailable.current = true;
        if (!alive) return;
        setSuggestions(r?.results ?? []);
        setOpen((r?.results ?? []).length > 0);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) unavailable.current = true;   // a guest, by the owner's choice
      }
    }, 280);
    return () => { alive = false; clearTimeout(t); };
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  async function choose(place_id: string, description: string) {
    setQuery(description); setOpen(false); setSuggestions([]);
    try {
      const r = await geoPlace(place_id, session.current);
      const p = r?.place;
      onChange?.(p ? { address: p.address || description, lat: p.lat, lng: p.lng } : { address: description });
    } catch {
      onChange?.({ address: description });
    }
  }

  return (
    <div className={cn("relative", className)}>
      <MapPin className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={query}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => { setQuery(e.target.value); onChange?.({ address: e.target.value }); }}
        onFocus={() => suggestions.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="h-9 w-full rounded-md border border-input bg-background pr-3 pl-9 text-base md:text-[13px] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/15 disabled:pointer-events-none disabled:opacity-50"
      />
      {open && (
        <ul className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-md border bg-popover p-1 shadow-md">
          {suggestions.map((s) => (
            <li key={s.place_id}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => choose(s.place_id, s.description)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[13px] hover:bg-accent">
                <MapPin className="size-3.5 shrink-0 text-muted-foreground" />{s.description}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { AddressInput };
