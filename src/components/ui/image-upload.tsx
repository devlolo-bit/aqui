import * as React from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadFile } from "@/lib/fab-client";

/**
 * ImageUpload — it uploads ONE image (through the platform's uploadFile) and returns the public URL. The `value`/`onChange` = the URL.
 * A `shape="circle"` for an avatar. It requires a logged-in user. E.g.: `<ImageUpload value={photo} onChange={setPhoto} />`.
 */
function ImageUpload({
  value, onChange, shape = "square", className, disabled, removeLabel = "Remove", errorLabel = "Upload failed. Try again.",
}: {
  value?: string;
  onChange?: (url: string) => void;
  shape?: "square" | "circle";
  className?: string;
  disabled?: boolean;
  removeLabel?: string;  // the default is English; the AI passes the text in the target language
  errorLabel?: string;   // the default is English; the AI passes the text in the target language
}) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function pick(file?: File) {
    if (!file) return;
    setBusy(true); setError("");
    try {
      const { url } = await uploadFile(file);
      onChange?.(url);
    } catch {
      setError(errorLabel);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]); }}
        className={cn(
          "relative flex size-28 items-center justify-center overflow-hidden border border-dashed border-input bg-muted/40 text-muted-foreground transition-colors hover:bg-accent/50 disabled:pointer-events-none disabled:opacity-50",
          shape === "circle" ? "rounded-full" : "rounded-xl",
        )}
      >
        {value ? (
          <img src={value} alt="" className="size-full object-cover" />
        ) : (
          <ImagePlus className="size-6" />
        )}
        {busy && <span className="absolute inset-0 flex items-center justify-center bg-background/60"><Loader2 className="size-5 animate-spin" /></span>}
      </button>
      {value && !busy && (
        <button type="button" onClick={() => onChange?.("")} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive">
          <X className="size-3" /> {removeLabel}
        </button>
      )}
      {error && <p className="text-[11px] font-semibold text-destructive">{error}</p>}
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0] ?? undefined)} />
    </div>
  );
}

/** AvatarUpload — the ImageUpload's circular shortcut (a profile photo). */
function AvatarUpload(props: Omit<React.ComponentProps<typeof ImageUpload>, "shape">) {
  return <ImageUpload shape="circle" {...props} />;
}

export { ImageUpload, AvatarUpload };
