/**
 * <Feed/> — the READY-MADE piece of a social feed (the "social" blueprint). A composer (text + an image), a list of posts with a card
 * (the author, the time, the text, an image/gallery), an animated like (optimistic), expandable comments with a composer, and a
 * "load more". Token-driven (it inherits the theme) and light/dark. Reading is public; acting requires a login.
 *
 * It consumes the canonical models: `post` (author→ref, body, image, images[], like_count, comment_count), `comment`
 * (post→ref, author→ref, body) and `like` (post→ref, user→ref). A platform component — the app USES the <Feed/>, it does not
 * recreate it. Code-split by the fab-client.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collection, uploadFile, useAuth, useLocale, type Row } from "./fab-client";
import { t as i18n, type FabI18nKey } from "./fab-i18n";

export type Post = Row & { author?: string; body?: string; image?: string; images?: string[]; like_count?: number; comment_count?: number; author_name?: string };
export type Comment = Row & { post?: string; author?: string; body?: string; author_name?: string };
export type Like = Row & { post?: string; user?: string };

const SKEL = "animate-pulse bg-muted";
function initials(name?: string | null): string {
  const s = (name || "").trim(); if (!s) return "•";
  const p = s.split(/\s+/); return ((p[0]?.[0] || "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}
function Avatar({ name, size = 44 }: { name?: string | null; size?: number }) {
  return <div className="flex flex-none items-center justify-center rounded-full bg-primary/15 font-bold text-primary"
    style={{ width: size, height: size, fontSize: size * 0.34 }}>{initials(name)}</div>;
}
function timeAgo(iso: string | undefined, loc: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime(); if (isNaN(then)) return "";
  const s = Math.round((then - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(loc, { numeric: "auto" });
  const abs = Math.abs(s);
  if (abs < 60) return rtf.format(Math.round(s), "second");
  if (abs < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(s / 3600), "hour");
  return rtf.format(Math.round(s / 86400), "day");
}

export function Feed({ postModel = "post", commentModel = "comment", likeModel = "like", filter, pageSize = 10 }:
  { postModel?: string; commentModel?: string; likeModel?: string; filter?: Record<string, string | number | boolean>; pageSize?: number }) {
  const { user, isLoggedIn } = useAuth();
  const loc = useLocale();
  const T = useCallback((k: FabI18nKey) => i18n(loc, k), [loc]);
  const posts = useMemo(() => collection<Post>(postModel), [postModel]);
  const comments = useMemo(() => collection<Comment>(commentModel), [commentModel]);
  const likes = useMemo(() => collection<Like>(likeModel), [likeModel]);
  const meId = user?.id;

  const [items, setItems] = useState<Post[] | null>(null);
  const [limit, setLimit] = useState(pageSize);
  const [hasMore, setHasMore] = useState(false);
  const [myLikes, setMyLikes] = useState<Map<string, string>>(new Map());   // postId → likeId
  const [text, setText] = useState("");
  const [img, setImg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());                  // the posts with their comments open
  const [threads, setThreads] = useState<Record<string, Comment[] | null>>({});
  const [cText, setCText] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement | null>(null);
  const likeBusy = useRef<Set<string>>(new Set());   // the likes in flight per post → it serializes the toggles (anti double fire)

  const load = useCallback((lim: number) => {
    posts.list({ sort: "-created_at", limit: lim + 1, ...(filter ? { filter } : {}) })
      .then((r) => { setHasMore(r.length > lim); setItems(r.slice(0, lim)); }).catch(() => setItems([]));
  }, [posts, filter]);
  useEffect(() => { load(limit); }, [load, limit]);
  // my likes (the source of truth for "I liked it") — one fetch, it becomes a postId→likeId map
  useEffect(() => {
    if (!meId) { setMyLikes(new Map()); return; }
    likes.list({ filter: { user: meId }, limit: 500 })
      .then((ls) => setMyLikes(new Map(ls.filter((l) => l.post).map((l) => [l.post as string, l.id]))))
      .catch(() => { /* it keeps it */ });
  }, [meId, likes]);

  const patchPost = (id: string, patch: Partial<Post>) =>
    setItems((it) => it?.map((p) => (p.id === id ? { ...p, ...patch } : p)) ?? it);

  async function createPost() {
    const body = text.trim();
    if ((!body && !img) || !meId || busy) return;
    setBusy(true);
    try {
      const p = await posts.create({ author: meId, author_name: user?.name, body, image: img || undefined, like_count: 0, comment_count: 0 } as Partial<Post>);
      setItems((it) => [p, ...(it ?? [])]); setText(""); setImg(null);
    } catch { /* ignore */ } finally { setBusy(false); }
  }
  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    setBusy(true); try { const { url } = await uploadFile(f); setImg(url); } catch { /* */ } finally { setBusy(false); }
  }

  async function toggleLike(p: Post) {
    // it serializes per post: while the create/remove has NOT resolved, it ignores new taps — it avoids the double like (two
    // `like` records) on a fast like→unlike→like, which would desynchronize the counter and the state.
    if (!meId || !p.id || likeBusy.current.has(p.id)) return;
    likeBusy.current.add(p.id);
    try {
      const likeId = myLikes.get(p.id);
      if (likeId) {                                          // unlike
        setMyLikes((m) => { const n = new Map(m); n.delete(p.id!); return n; });
        patchPost(p.id, { like_count: Math.max(0, (p.like_count || 0) - 1) });
        await likes.remove(likeId).catch(() => {});
        posts.update(p.id, { like_count: Math.max(0, (p.like_count || 0) - 1) } as Partial<Post>).catch(() => {});
      } else {                                               // like
        patchPost(p.id, { like_count: (p.like_count || 0) + 1 });
        posts.update(p.id, { like_count: (p.like_count || 0) + 1 } as Partial<Post>).catch(() => {});
        try { const l = await likes.create({ post: p.id, user: meId } as Partial<Like>); setMyLikes((m) => new Map(m).set(p.id!, l.id)); } catch { /* */ }
      }
    } finally { likeBusy.current.delete(p.id); }
  }
  function toggleComments(p: Post) {
    if (!p.id) return;
    setOpen((s) => { const n = new Set(s); n.has(p.id!) ? n.delete(p.id!) : n.add(p.id!); return n; });
    if (threads[p.id] === undefined)
      comments.list({ filter: { post: p.id }, sort: "created_at", limit: 200 })
        .then((c) => setThreads((t) => ({ ...t, [p.id!]: c }))).catch(() => setThreads((t) => ({ ...t, [p.id!]: [] })));
  }
  async function addComment(p: Post) {
    const body = (cText[p.id!] || "").trim(); if (!body || !meId || !p.id) return;
    try {
      const c = await comments.create({ post: p.id, author: meId, author_name: user?.name, body } as Partial<Comment>);
      setThreads((t) => ({ ...t, [p.id!]: [...(t[p.id!] || []), c] }));
      setCText((s) => ({ ...s, [p.id!]: "" }));
      patchPost(p.id, { comment_count: (p.comment_count || 0) + 1 });
      posts.update(p.id, { comment_count: (p.comment_count || 0) + 1 } as Partial<Post>).catch(() => {});
    } catch { /* */ }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-3.5">
      {/* composer */}
      {isLoggedIn && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex gap-3">
            <Avatar name={user?.name} size={42} />
            <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder={T("fd.placeholder")}
              className="flex-1 resize-none bg-transparent pt-2 text-sm leading-relaxed text-foreground outline-none" />
          </div>
          {img && <div className="mt-2 overflow-hidden rounded-xl border border-border"><img src={img} alt="" className="max-h-72 w-full object-cover" /></div>}
          <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-3">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
            <button aria-label={T("fd.addImage")} onClick={() => fileRef.current?.click()} className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-primary">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></svg>
            </button>
            <div className="flex-1" />
            <button onClick={createPost} disabled={busy || (!text.trim() && !img)} className="h-10 rounded-lg bg-primary px-5 text-[13px] font-bold text-primary-foreground disabled:opacity-50">{T("fd.publish")}</button>
          </div>
        </div>
      )}

      {/* loading */}
      {items === null && Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3.5 flex items-center gap-3"><div className={`${SKEL} h-10 w-10 rounded-full`} /><div className="flex-1"><div className={`${SKEL} mb-1.5 h-3 w-2/5 rounded`} /><div className={`${SKEL} h-2.5 w-1/4 rounded`} /></div></div>
          <div className={`${SKEL} mb-2 h-3 w-full rounded`} /><div className={`${SKEL} mb-3.5 h-3 w-4/5 rounded`} /><div className={`${SKEL} h-40 w-full rounded-xl`} />
        </div>
      ))}

      {/* empty */}
      {items?.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card p-8 text-center">
          <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-accent p-3.5 text-primary"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v12H5.17L4 17.17Z" /></svg></div>
          <div className="text-[13.5px] font-bold text-foreground">{T("fd.empty")}</div>
          <div className="text-xs text-muted-foreground">{T("fd.emptySub")}</div>
        </div>
      )}

      {/* posts */}
      {items?.map((p) => {
        const liked = !!p.id && myLikes.has(p.id);
        const gallery = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
        const isOpen = !!p.id && open.has(p.id);
        const thread = p.id ? threads[p.id] : null;
        return (
          <div key={p.id} className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center gap-3 px-4 pb-3 pt-4">
              <Avatar name={p.author_name} />
              <div className="flex-1"><div className="text-sm font-bold text-foreground">{p.author_name || "—"}</div><div className="text-[11.5px] text-muted-foreground">{timeAgo(p.created_at, loc)}</div></div>
            </div>
            {p.body && <div className="px-4 pb-3 text-sm leading-relaxed text-foreground/80">{p.body}</div>}
            {p.image && !gallery.length && <img src={p.image} alt="" className="max-h-96 w-full border-y border-border object-cover" />}
            {gallery.length > 0 && (
              <div className="grid grid-cols-2 gap-0.5">
                {gallery.slice(0, 4).map((src, i) => (
                  <div key={i} className="relative h-28">
                    <img src={src} alt="" className="h-full w-full object-cover" />
                    {i === 3 && gallery.length > 4 && <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-lg font-bold text-white">+{gallery.length - 4}</div>}
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between px-4 pt-2.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">{!!p.like_count && <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-destructive text-[10px] text-white">♥</span>}{p.like_count || 0}</span>
              <span>{p.comment_count || 0}</span>
            </div>
            <div className="mt-2 flex border-t border-border p-1.5">
              <button onClick={() => toggleLike(p)} className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg text-[13px] font-bold ${liked ? "text-destructive" : "text-muted-foreground hover:bg-muted"}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={liked ? "scale-110 transition-transform" : "transition-transform"}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" /></svg>{T("fd.like")}
              </button>
              <button onClick={() => toggleComments(p)} className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg text-[13px] font-bold text-muted-foreground hover:bg-muted">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" /></svg>{T("fd.comment")}
              </button>
            </div>
            {isOpen && (
              <div className="flex flex-col gap-3 border-t border-border p-4">
                {thread === undefined || thread === null ? <div className={`${SKEL} h-10 rounded-xl`} />
                  : thread.length === 0 ? <div className="text-center text-xs text-muted-foreground">{T("fd.noComments")}</div>
                  : thread.map((c) => (
                    <div key={c.id} className="flex gap-2.5">
                      <Avatar name={c.author_name} size={34} />
                      <div className="flex-1"><div className="rounded-xl bg-muted px-3 py-2"><div className="text-[12.5px] font-bold text-foreground">{c.author_name || "—"}</div><div className="text-[13px] leading-snug text-foreground/80">{c.body}</div></div><div className="ml-3 mt-1 text-[11px] text-muted-foreground">{timeAgo(c.created_at, loc)}</div></div>
                    </div>
                  ))}
                {isLoggedIn && (
                  <div className="flex items-center gap-2.5">
                    <Avatar name={user?.name} size={34} />
                    <div className="flex flex-1 items-center rounded-full border border-border bg-muted py-1 pl-3.5 pr-1.5">
                      <input value={cText[p.id!] || ""} onChange={(e) => setCText((s) => ({ ...s, [p.id!]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") addComment(p); }} placeholder={T("fd.commentPh")}
                        className="flex-1 bg-transparent text-[13px] text-foreground outline-none" />
                      <button aria-label={T("fd.send")} onClick={() => addComment(p)} className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {hasMore && (
        <button onClick={() => setLimit((l) => l + pageSize)} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card text-[13px] font-bold text-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>{T("fd.loadMore")}
        </button>
      )}
    </div>
  );
}
