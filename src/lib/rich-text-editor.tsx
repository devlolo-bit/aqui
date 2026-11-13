/**
 * The PLATFORM's rich-text editor (an encapsulated TipTap). It lives in a separate module and is loaded on demand through a
 * `React.lazy` in the fab-client → the TipTap does not go into the shared chunk. An image upload goes through the curated
 * `uploadFile` integration (files/R2) — just like the Base44 model (the app never imports TipTap directly).
 */
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, type ReactNode } from "react";

import { uploadFile, useLocale } from "./fab-client";
import { t } from "./fab-i18n";
import { RICH_TEXT_TYPOGRAPHY } from "./rich-text-view";

// `label` is for the buttons whose face is a SYMBOL (B, I) and nothing else. A button that already shows words has
// an accessible name — its text — and putting an `aria-label` over it REPLACES what a screen reader announces with
// whatever the programmer typed, which is how a visible "• Lista" ends up being read as something else.
function ToolbarBtn({ on, active, label, children }:
                    { on: () => void; active?: boolean; label?: string; children: ReactNode }) {
  return (
    <button type="button" onClick={on} aria-label={label} aria-pressed={active}
            className={`rounded px-2 py-1 text-sm hover:bg-accent ${active ? "bg-accent font-semibold" : ""}`}>
      {children}
    </button>
  );
}

export function RichTextEditor({ value = "", onChange, placeholder }: {
  value?: string; onChange?: (html: string) => void; placeholder?: string;
}) {
  // The toolbar reads the app's locale, like every other ready-made piece. It used to be hardcoded Portuguese —
  // "Título", "• Lista", "Imagem" and a "Escreva…" placeholder — so an English app put Portuguese over its text box,
  // and so did the French one.
  const loc = useLocale();
  const editor = useEditor({
    immediatelyRender: false,                                  // it avoids a synchronous render on the 1st paint (more predictable)
    extensions: [StarterKit, Image, Link.configure({ openOnClick: false }), Placeholder.configure({ placeholder: placeholder ?? t(loc, "rte.placeholder") })],
    content: value,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
    // The SAME typography the viewer uses: what you type has to look like what the reader gets, and the shorter
    // list this used to carry made them disagree on every tag it did not know about.
    editorProps: { attributes: { class: "min-h-[140px] focus:outline-none " + RICH_TEXT_TYPOGRAPHY } },
  });

  const addImage = useCallback(async (file: File) => {
    try { const { url } = await uploadFile(file); editor?.chain().focus().setImage({ src: url }).run(); }
    catch { /* the upload failed — silent */ }
  }, [editor]);

  if (!editor) return null;
  return (
    <div className="rounded-lg border">
      <div className="flex flex-wrap items-center gap-1 border-b p-1">
        <ToolbarBtn on={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} label={t(loc, "rte.bold")}>B</ToolbarBtn>
        <ToolbarBtn on={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} label={t(loc, "rte.italic")}><span className="italic">I</span></ToolbarBtn>
        <ToolbarBtn on={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })}>{t(loc, "rte.heading")}</ToolbarBtn>
        <ToolbarBtn on={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}>{"• " + t(loc, "rte.list")}</ToolbarBtn>
        <label className="cursor-pointer rounded px-2 py-1 text-sm hover:bg-accent">
          {t(loc, "rte.image")}
          <input type="file" accept="image/*" className="hidden"
                 onChange={(e) => { const f = e.target.files?.[0]; if (f) addImage(f); e.currentTarget.value = ""; }} />
        </label>
      </div>
      <EditorContent editor={editor} className="p-3" />
    </div>
  );
}
