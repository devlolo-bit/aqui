/**
 * <Chat/> — the READY-MADE piece of realtime messaging (part of the "messaging" blueprint). A conversation list + a thread,
 * my/their bubbles, a read receipt, a composer with an image attachment and an optimistic send with a retry. Responsive:
 * 2 panels on desktop, 1 panel (with a back) on mobile. Token-driven (it inherits the Brand's theme) and light/dark.
 *
 * It consumes the blueprint's canonical models through the SDK: `conversation` (participants[], title?, last_message,
 * last_message_at) and `message` (conversation→ref, sender→ref, body, image?, read). The access is scoped per
 * participant in the backend (an owner_in `participants`). Realtime through light POLLING (with no websocket server).
 *
 * A platform component — the app USES the `<Chat/>`, it does not recreate it. Loaded on demand (code-split) by the fab-client.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collection, uploadFile, useAuth, useLive, useLocale, type Row } from "./fab-client";
import { t as i18n, type FabI18nKey } from "./fab-i18n";

export type Conversation = Row & {
  participants?: string[]; title?: string; last_message?: string; last_message_at?: string;
  unread?: number; peer_name?: string; peer_avatar?: string;
};
export type ChatMessage = Row & { conversation?: string; sender?: string; body?: string; image?: string; read?: boolean };

// an optimistic message (not confirmed by the server yet). A `failed` → it shows "Não enviada" + Resend.
type Draft = { key: string; body: string; image?: string; status: "sending" | "failed" };

const AVATAR_TINTS = [
  "bg-primary/15 text-primary", "bg-[var(--info)]/15 text-[var(--info)]",
  "bg-[var(--warning)]/20 text-[var(--warning)]", "bg-[var(--success)]/15 text-[var(--success)]",
];
const SKEL = "animate-pulse bg-muted";
function tintFor(seed: string): string {
  let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_TINTS[Math.abs(h) % AVATAR_TINTS.length];
}
function initials(name?: string | null): string {
  const s = (name || "").trim();
  if (!s) return "•";
  const parts = s.split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || s[0].toUpperCase();
}
function hhmm(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso); return isNaN(+d) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function Avatar({ name, size = 44, online }: { name?: string | null; size?: number; online?: boolean }) {
  return (
    <div className="relative flex-none">
      <div className={`flex items-center justify-center rounded-full font-bold ${tintFor(name || "?")}`}
           style={{ width: size, height: size, fontSize: size * 0.34 }}>{initials(name)}</div>
      {online && <span className="absolute bottom-0 right-0 rounded-full border-2 border-card bg-[var(--success)]"
                       style={{ width: size * 0.25, height: size * 0.25 }} />}
    </div>
  );
}

export function Chat({ conversationModel = "conversation", messageModel = "message", title }:
  { conversationModel?: string; messageModel?: string; title?: string }) {
  const { user } = useAuth();
  const loc = useLocale();
  const T = useCallback((k: FabI18nKey) => i18n(loc, k), [loc]);
  const msgs = useMemo(() => collection<ChatMessage>(messageModel), [messageModel]);
  const meId = user?.id;

  const [activeId, setActiveId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [text, setText] = useState("");
  const [mobileThread, setMobileThread] = useState(false);   // mobile: it shows the thread (otherwise the list)
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // REALTIME through DELTA polling (useLive): it pauses on a hidden tab, speeds up with activity, slows down when idle, backs off on
  // an error and does NOT debit the quota — it replaces the fixed setInterval that re-fetched whole lists every few seconds.
  const convLive = useLive<Conversation>(conversationModel, { sort: "-last_message_at", limit: 100 });
  const list = convLive.loading ? null : convLive.rows;
  const threadFilter = useMemo(() => ({ conversation: activeId || "" }), [activeId]);
  const threadLive = useLive<ChatMessage>(messageModel, { filter: threadFilter, sort: "created_at", limit: 200, enabled: !!activeId });
  const thread = !activeId ? null : threadLive.loading ? null : threadLive.rows;
  const threadErr = threadLive.error;
  const loadList = convLive.refresh;
  const loadThread = useCallback((_cid?: string) => threadLive.refresh(), [threadLive]);

  // it marks as read (IN A BATCH, 1 request) whatever is theirs and still unread — with no N individual updates
  const markedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!activeId || !thread || !meId) return;
    const ids = thread.filter((m) => m.sender !== meId && m.read === false && m.id && !markedRef.current.has(m.id!))
                      .map((m) => m.id!);
    if (!ids.length) return;
    ids.forEach((id) => markedRef.current.add(id));
    // it does NOT force a re-poll here: the one who marks is the RECEIVER (they already saw the message); the sender gets the `read:true` in
    // their own normal poll. A refresh() here would generate an extra poll and would also make the read receipt's echo reignite the
    // "hot" mode on both clients (an accelerated re-poll loop). A failure → it releases the ids for the next poll to re-mark.
    msgs.updateMany(ids, { read: true } as Partial<ChatMessage>)
      .catch(() => ids.forEach((id) => markedRef.current.delete(id)));
  }, [thread, activeId, meId, msgs]);
  useEffect(() => { markedRef.current.clear(); }, [activeId]);  // switching conversations → it clears the read dedup
  // it auto-scrolls to the end when the thread or the drafts change
  useEffect(() => { const el = scroller.current; if (el) el.scrollTop = el.scrollHeight; }, [thread, drafts]);

  const active = list?.find((c) => c.id === activeId) || null;
  const openConv = (c: Conversation) => { setActiveId(c.id); setDrafts([]); setMobileThread(true); };

  function autoGrow(e: React.FormEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget; el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 96) + "px";
  }
  const doSend = useCallback(async (body: string, image?: string) => {
    if (!activeId || !active) return;
    const key = `d${drafts.length}_${body.length}_${image ? 1 : 0}`;
    setDrafts((d) => [...d, { key, body, image, status: "sending" }]);
    try {
      await msgs.create({ conversation: activeId, sender: meId, body, image,
        participants: active.participants, read: false } as Partial<ChatMessage>);
      setDrafts((d) => d.filter((x) => x.key !== key));
      loadThread(activeId); loadList();
    } catch { setDrafts((d) => d.map((x) => x.key === key ? { ...x, status: "failed" } : x)); }
  }, [activeId, active, drafts.length, msgs, meId, loadThread, loadList]);

  async function onSend() {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true); setText("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    await doSend(body); setBusy(false);
  }
  function onKey(e: React.KeyboardEvent) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }
  async function onAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    setBusy(true);
    try { const { url } = await uploadFile(f); await doSend("", url); } catch { /* ignore */ } finally { setBusy(false); }
  }
  const retry = (d: Draft) => { setDrafts((x) => x.filter((y) => y.key !== d.key)); doSend(d.body, d.image); };

  // ---- subcomponents ----
  const ConversationList = (
    <div className="flex w-full flex-col border-border bg-card md:w-80 md:flex-none md:border-r">
      <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
        <span className="text-[15px] font-bold text-foreground">{title || T("ch.conversations")}</span>
      </div>
      <div className="flex flex-1 flex-col gap-0.5 overflow-auto p-2">
        {list === null && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2.5"><div className={`${SKEL} h-11 w-11 rounded-full`} /><div className="flex-1"><div className={`${SKEL} mb-1.5 h-3.5 w-24 rounded`} /><div className={`${SKEL} h-3 w-36 rounded`} /></div></div>
        ))}
        {list?.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2.5 px-4 py-8 text-center">
            <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-accent p-3.5 text-primary">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" /></svg>
            </div>
            <div className="text-[13.5px] font-bold text-foreground">{T("ch.empty")}</div>
            <div className="text-xs leading-relaxed text-muted-foreground">{T("ch.emptySub")}</div>
          </div>
        )}
        {list?.map((c) => {
          const on = c.id === activeId;
          const name = c.title || c.peer_name || T("ch.conversation");
          return (
            <button key={c.id} onClick={() => openConv(c)}
              className={`flex items-center gap-3 rounded-xl p-2.5 text-left transition-colors ${on ? "bg-accent" : "hover:bg-muted"}`}>
              <Avatar name={name} />
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-1.5"><span className="truncate text-[13.5px] font-bold text-foreground">{name}</span><span className={`flex-none text-[11px] ${c.unread ? "font-bold text-primary" : "text-muted-foreground"}`}>{hhmm(c.last_message_at)}</span></div>
                <div className="flex items-center justify-between gap-1.5">
                  <span className={`truncate text-xs ${c.unread ? "font-semibold text-foreground/80" : "text-muted-foreground"}`}>{c.last_message || ""}</span>
                  {!!c.unread && <span className="inline-flex h-[19px] min-w-[19px] flex-none items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{c.unread}</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const Thread = active && (
    <div className={`flex min-w-0 flex-1 flex-col ${mobileThread ? "flex" : "hidden"} md:flex`}>
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <button aria-label={T("ch.back")} onClick={() => setMobileThread(false)} className="-ml-1 flex h-8 w-8 items-center justify-center text-foreground md:hidden">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <Avatar name={active.title || active.peer_name} size={38} />
        <div><div className="text-sm font-bold text-foreground">{active.title || active.peer_name || T("ch.conversation")}</div></div>
      </div>
      <div ref={scroller} className="flex flex-1 flex-col gap-2 overflow-auto p-4">
        {threadErr && <div className="self-center rounded-full border border-border bg-muted px-3 py-1 text-[11px] text-muted-foreground">{T("ch.loadError")}</div>}
        {thread === null && !threadErr && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`${SKEL} h-9 ${i % 2 ? "self-end w-2/5 rounded-[14px_14px_4px_14px]" : "self-start w-3/5 rounded-[14px_14px_14px_4px]"}`} />
        ))}
        {thread?.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <Avatar name={active.title || active.peer_name} size={48} />
            <div className="text-[13px] font-bold text-foreground">{T("ch.threadEmpty")}</div>
            <div className="text-xs text-muted-foreground">{T("ch.threadEmptySub")}</div>
          </div>
        )}
        {thread?.map((m) => {
          const mine = m.sender === meId;
          return (
            <div key={m.id} className={`max-w-[76%] ${mine ? "self-end" : "self-start"}`}>
              {m.image
                ? <div className="overflow-hidden rounded-[14px] border border-border"><img src={m.image} alt="" className="max-h-64 w-full object-cover" /></div>
                : <div className={`px-3 py-2 text-[13px] leading-normal ${mine ? "rounded-[14px_14px_4px_14px] bg-primary text-primary-foreground" : "rounded-[14px_14px_14px_4px] border border-border bg-card text-foreground"}`}>{m.body}</div>}
              <div className={`mt-1 flex items-center gap-1 px-1 text-[10px] text-muted-foreground ${mine ? "justify-end" : ""}`}>
                {hhmm(m.created_at)}
                {mine && m.read && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--info)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 3.5 3.5L14 8" /><path d="m12 15 6-7" /></svg>}
              </div>
            </div>
          );
        })}
        {drafts.map((d) => (
          <div key={d.key} className="max-w-[80%] self-end">
            {d.image
              ? <div className="overflow-hidden rounded-[14px_14px_4px_14px] border border-border opacity-70"><img src={d.image} alt="" className="max-h-64 w-full object-cover" /></div>
              : <div className="rounded-[14px_14px_4px_14px] bg-primary px-3 py-2 text-[13px] text-primary-foreground opacity-70">{d.body}</div>}
            {d.status === "failed" && (
              <div className="mt-1 flex items-center justify-end gap-1.5">
                <span className="text-[10.5px] font-semibold text-destructive">{T("ch.notSent")}</span>
                <button onClick={() => retry(d)} className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-0.5 text-[10.5px] font-bold text-destructive">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>{T("ch.retry")}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-end gap-2 border-t border-border bg-card p-3">
        <label aria-label={T("ch.attach")} className="flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground">
          <input type="file" accept="image/*" className="hidden" onChange={onAttach} />
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
        </label>
        <textarea ref={inputRef} rows={1} value={text} onChange={(e) => setText(e.target.value)} onInput={autoGrow} onKeyDown={onKey}
          placeholder={T("ch.placeholder")} className="max-h-24 flex-1 resize-none rounded-xl border border-border bg-muted px-3.5 py-3 text-[13px] leading-snug text-foreground outline-none focus:border-primary" />
        <button onClick={onSend} disabled={busy || !text.trim()} aria-label={T("ch.send")}
          className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-[440px] max-h-[80vh] overflow-hidden rounded-2xl border border-border bg-card">
      <div className={`${mobileThread ? "hidden" : "flex"} w-full md:flex md:w-80 md:flex-none`}>{ConversationList}</div>
      {Thread || (
        <div className="hidden flex-1 items-center justify-center text-sm text-muted-foreground md:flex">{T("ch.threadEmpty")}</div>
      )}
    </div>
  );
}
