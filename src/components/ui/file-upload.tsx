import * as React from "react";
import { Loader2, Paperclip, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadFile } from "@/lib/fab-client";

export type UploadedFile = { id: string; url: string; name: string };

/**
 * FileUpload — a generic dropzone (drag/click) that uploads files through uploadFile and returns the list. It requires a login.
 * `<FileUpload accept=".pdf" onChange={setFiles} />` — `onChange` receives UploadedFile[].
 * A `visibility='private'` for sensitive documents (a receipt, a contract): the URL becomes signed and only for whoever reads the record.
 */
function FileUpload({
  onChange, accept, multiple = false, className, disabled, visibility,
}: {
  onChange?: (files: UploadedFile[]) => void;
  accept?: string;
  multiple?: boolean;
  className?: string;
  disabled?: boolean;
  visibility?: "public" | "private";
}) {
  const [files, setFiles] = React.useState<UploadedFile[]>([]);
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function add(list?: FileList | null) {
    if (!list || list.length === 0) return;
    setBusy(true);
    try {
      const uploaded: UploadedFile[] = [];
      for (const f of Array.from(list)) {
        const { id, url } = await uploadFile(f, visibility ? { visibility } : undefined);
        uploaded.push({ id, url, name: f.name });
      }
      const next = multiple ? [...files, ...uploaded] : uploaded;
      setFiles(next);
      onChange?.(next);
    } finally {
      setBusy(false);
    }
  }

  function remove(id: string) {
    const next = files.filter((f) => f.id !== id);
    setFiles(next);
    onChange?.(next);
  }

  return (
    <div className={cn("space-y-2", className)}>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); add(e.dataTransfer.files); }}
        className="flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-input bg-muted/40 px-4 py-6 text-center text-muted-foreground transition-colors hover:bg-accent/50 disabled:pointer-events-none disabled:opacity-50"
      >
        {busy ? <Loader2 className="size-5 animate-spin" /> : <UploadCloud className="size-5" />}
        <span className="text-[13px]">{busy ? "Enviando…" : "Arraste ou clique para enviar"}</span>
      </button>
      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-[13px]">
              <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">{f.name}</span>
              <button type="button" onClick={() => remove(f.id)} className="text-muted-foreground hover:text-destructive"><X className="size-3.5" /></button>
            </li>
          ))}
        </ul>
      )}
      <input ref={inputRef} type="file" accept={accept} multiple={multiple} hidden onChange={(e) => add(e.target.files)} />
    </div>
  );
}

export { FileUpload };
