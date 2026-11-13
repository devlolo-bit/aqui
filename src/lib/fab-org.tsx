/**
 * <OrgSwitcher/> and <Members/> — the READY-MADE multi-tenant pieces (the "orgs" blueprint). OrgSwitcher: it switches/creates an
 * organization (the list already comes scoped to MY orgs by the owner_in access). Members: a members table with the
 * role/status, an invite by email (a pending membership), a role change and a removal — the management actions only for the
 * owner/an admin. Token-driven (it inherits the theme) and light/dark.
 *
 * It consumes the canonical models `organization` (name, logo, owner→ref, members[]) and `membership` (organization→ref,
 * user→ref, email, role, status, org_owner→ref, members[]). Platform components — the app USES them, it does not recreate them.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { collection, createOrg, joinOrgByCode, SpaceContext, useAuth, useLocale, type Row } from "./fab-client";
import { t as i18n, type FabI18nKey } from "./fab-i18n";

export type Organization = Row & { name?: string; logo?: string; owner?: string; members?: string[]; code?: string };
export type Membership = Row & { organization?: string; user?: string; email?: string; role?: string; status?: string; org_owner?: string; members?: string[]; user_name?: string };

const SKEL = "animate-pulse bg-muted";
const ORG_KEY = "fab_current_org";
const ROLES = ["owner", "admin", "editor", "viewer"] as const;
function initials(s?: string | null): string {
  const v = (s || "").trim(); if (!v) return "•";
  const p = v.split(/\s+/); return ((p[0]?.[0] || "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}
function roleKey(r?: string): FabI18nKey {
  return r === "owner" ? "og.owner" : r === "admin" ? "og.admin" : r === "viewer" ? "og.viewer" : "og.editor";
}

export function OrgSwitcher({ orgModel = "organization", membershipModel = "membership", currentOrgId, onSwitch }:
  { orgModel?: string; membershipModel?: string; currentOrgId?: string; onSwitch?: (orgId: string) => void }) {
  const loc = useLocale();
  const T = useCallback((k: FabI18nKey) => i18n(loc, k), [loc]);
  const orgs = useMemo(() => collection<Organization>(orgModel), [orgModel]);

  const [list, setList] = useState<Organization[] | null>(null);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [newName, setNewName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const current = (currentOrgId && list?.find((o) => o.id === currentOrgId))
    || list?.find((o) => o.id === (typeof localStorage !== "undefined" ? localStorage.getItem(ORG_KEY) : null))
    || list?.[0] || null;

  const load = useCallback(() => { orgs.list({ limit: 100 }).then(setList).catch(() => setList([])); }, [orgs]);
  useEffect(() => { load(); }, [load]);

  function pick(o: Organization) {
    if (typeof localStorage !== "undefined" && o.id) localStorage.setItem(ORG_KEY, o.id);
    setOpen(false); if (o.id) onSwitch?.(o.id);
  }
  // creating: a PLATFORM op (it generates the invite code + the owner's membership on the server, atomically)
  async function doCreateOrg() {
    const name = newName.trim(); if (!name || busy) return;
    setBusy(true);
    try {
      const o = await createOrg(name, { orgModel, membershipModel }) as Organization;
      setList((l) => [...(l ?? []), o]); setNewName(""); setCreating(false); pick(o);
    } catch { /* */ } finally { setBusy(false); }
  }
  // joining by code (a privileged op) → it reloads the list and selects the just-joined org
  async function doJoin() {
    const code = joinCode.trim(); if (!code || busy) return;
    setBusy(true);
    try {
      const o = await joinOrgByCode(code, { orgModel, membershipModel }) as Organization;
      await new Promise<void>((r) => { orgs.list({ limit: 100 }).then((l) => { setList(l); r(); }).catch(() => r()); });
      setJoinCode(""); setJoining(false); pick(o);
    } catch { /* an invalid/full code */ } finally { setBusy(false); }
  }

  return (
    <div className="relative w-full max-w-xs">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left">
        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">{initials(current?.name)}</div>
        <div className="min-w-0 flex-1"><div className="truncate text-[13.5px] font-bold text-foreground">{current?.name || "—"}</div></div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
          <div className="max-h-64 overflow-auto p-1.5">
            {list === null && <div className="p-3"><div className={`${SKEL} h-8 rounded-lg`} /></div>}
            {list?.map((o) => (
              <button key={o.id} onClick={() => pick(o)} className={`flex w-full items-center gap-2.5 rounded-lg p-2 text-left ${o.id === current?.id ? "bg-accent" : "hover:bg-muted"}`}>
                <div className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-muted text-[11px] font-bold text-foreground">{initials(o.name)}</div>
                <span className="flex-1 truncate text-[12.5px] font-semibold text-foreground">{o.name}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-border p-1.5">
            {creating ? (
              <div className="flex gap-1.5 p-1">
                <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") doCreateOrg(); }}
                  placeholder={T("og.newOrg")} className="flex-1 rounded-lg border border-border bg-muted px-2.5 py-1.5 text-[13px] text-foreground outline-none focus:border-primary" />
                <button onClick={doCreateOrg} disabled={busy || !newName.trim()} className="rounded-lg bg-primary px-3 text-[12px] font-bold text-primary-foreground disabled:opacity-50">OK</button>
              </div>
            ) : joining ? (
              <div className="flex gap-1.5 p-1">
                <input autoFocus value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} onKeyDown={(e) => { if (e.key === "Enter") doJoin(); }}
                  placeholder={T("og.enterCode")} className="flex-1 rounded-lg border border-border bg-muted px-2.5 py-1.5 text-[13px] uppercase tracking-widest text-foreground outline-none focus:border-primary" />
                <button onClick={doJoin} disabled={busy || !joinCode.trim()} className="rounded-lg bg-primary px-3 text-[12px] font-bold text-primary-foreground disabled:opacity-50">OK</button>
              </div>
            ) : (
              <div className="flex flex-col">
                <button onClick={() => setCreating(true)} className="flex w-full items-center gap-2.5 rounded-lg p-2 text-primary">
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg border border-dashed border-primary/40"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg></span>
                  <span className="text-[12.5px] font-bold">{T("og.createOrg")}</span>
                </button>
                <button onClick={() => setJoining(true)} className="flex w-full items-center gap-2.5 rounded-lg p-2 text-foreground/80 hover:bg-muted">
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg border border-border"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" /></svg></span>
                  <span className="text-[12.5px] font-bold">{T("og.joinCode")}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const STATUS_DOT: Record<string, string> = { active: "var(--success)", pending: "var(--warning)", inactive: "var(--muted-foreground)" };
const STATUS_KEY: Record<string, FabI18nKey> = { active: "og.active", pending: "og.pendingStatus", inactive: "og.inactive" };

export function Members({ orgId, orgModel = "organization", membershipModel = "membership" }:
  { orgId: string; orgModel?: string; membershipModel?: string }) {
  const { user } = useAuth();
  const loc = useLocale();
  const T = useCallback((k: FabI18nKey) => i18n(loc, k), [loc]);
  const orgs = useMemo(() => collection<Organization>(orgModel), [orgModel]);
  const memberships = useMemo(() => collection<Membership>(membershipModel), [membershipModel]);
  const meId = user?.id;

  const [org, setOrg] = useState<Organization | null>(null);
  const [rows, setRows] = useState<Membership[] | null>(null);
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    orgs.get(orgId).then(setOrg).catch(() => setOrg(null));
    memberships.list({ filter: { organization: orgId }, sort: "created_at", limit: 200 }).then(setRows).catch(() => setRows([]));
  }, [orgs, memberships, orgId]);
  useEffect(() => { if (orgId) load(); }, [load, orgId]);

  const myRole = rows?.find((r) => r.user === meId)?.role;
  const canManage = org?.owner === meId || myRole === "owner" || myRole === "admin";
  const pending = (rows || []).filter((r) => r.status === "pending").length;

  async function invite() {
    const em = email.trim(); if (!em || !meId || busy) return;
    setBusy(true);
    try {
      const m = await memberships.create({ organization: orgId, email: em, role, status: "pending",
        org_owner: org?.owner || meId, members: org?.members || [meId] } as Partial<Membership>);
      setRows((r) => [...(r ?? []), m]); setEmail(""); setInviting(false);
    } catch { /* */ } finally { setBusy(false); }
  }
  async function changeRole(m: Membership, r: string) {
    if (!m.id) return;
    setRows((rs) => rs?.map((x) => (x.id === m.id ? { ...x, role: r } : x)) ?? rs);
    memberships.update(m.id, { role: r } as Partial<Membership>).catch(() => {});
  }
  async function remove(m: Membership) {
    if (!m.id) return;
    setRows((rs) => rs?.filter((x) => x.id !== m.id) ?? rs);
    memberships.remove(m.id).catch(() => {});
    if (m.user && org?.members?.includes(m.user))   // best-effort: it removes the user from the org's member list
      orgs.update(orgId, { members: org.members.filter((u) => u !== m.user) } as Partial<Organization>).catch(() => {});
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div>
          <div className="text-[15px] font-bold text-foreground">{T("og.members")}</div>
          <div className="text-[11.5px] text-muted-foreground">{(rows?.length ?? 0)} · {pending} {T("og.pending")}</div>
        </div>
        {canManage && <button onClick={() => setInviting(true)} className="flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-[13px] font-bold text-primary-foreground">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 .01M19 8v6M22 11h-6" /></svg>{T("og.invite")}
        </button>}
      </div>

      {rows === null && (
        <div className="p-4">{Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2.5"><div className={`${SKEL} h-9 w-9 flex-none rounded-full`} /><div className="flex-1"><div className={`${SKEL} mb-1.5 h-3 w-2/5 rounded`} /><div className={`${SKEL} h-2.5 w-3/5 rounded`} /></div></div>
        ))}</div>
      )}
      {rows?.length === 0 && (
        <div className="flex flex-col items-center gap-2 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-primary"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 .01M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg></div>
          <div className="text-[13.5px] font-bold text-foreground">{T("og.empty")}</div>
          <div className="text-xs text-muted-foreground">{T("og.emptySub")}</div>
        </div>
      )}
      {rows?.map((m) => {
        const isSelf = m.user === meId;
        const name = isSelf ? T("og.you") : (m.user_name || m.email || "—");
        const st = m.status || "active";
        return (
          <div key={m.id} className={`flex items-center gap-3 border-b border-border px-4 py-3 ${st === "pending" ? "bg-[var(--warning)]/10" : ""}`}>
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-primary/15 text-[12px] font-bold text-primary">{initials(m.user_name || m.email)}</div>
            <div className="min-w-0 flex-1"><div className="truncate text-[13px] font-bold text-foreground">{name}</div><div className="truncate text-[11px] text-muted-foreground">{m.email || ""}</div></div>
            {canManage && !isSelf ? (
              <select value={m.role || "editor"} onChange={(e) => changeRole(m, e.target.value)} className="rounded-lg border border-border bg-card px-2 py-1.5 text-[12px] text-foreground outline-none">
                {ROLES.map((r) => <option key={r} value={r}>{T(roleKey(r))}</option>)}
              </select>
            ) : (
              <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-bold ${m.role === "owner" ? "bg-accent text-primary" : "border border-border text-foreground/80"}`}>{T(roleKey(m.role))}</span>
            )}
            <span className="hidden items-center gap-1.5 text-[11.5px] font-bold sm:flex" style={{ color: STATUS_DOT[st] }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_DOT[st] }} />{T(STATUS_KEY[st] || "og.active")}
            </span>
            {canManage && !isSelf && (
              <button onClick={() => remove(m)} aria-label={T("og.remove")} className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
              </button>
            )}
          </div>
        );
      })}

      {inviting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setInviting(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <div className="text-[15px] font-bold text-foreground">{T("og.inviteMember")}</div>
            <div className="mb-4 text-xs text-muted-foreground">{T("og.inviteSub")}</div>
            <label className="mb-1 block text-[11px] text-muted-foreground">{T("og.email")}</label>
            <input autoFocus type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="novo@email.com"
              className="mb-3 w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-[13px] text-foreground outline-none focus:border-primary" />
            <label className="mb-1 block text-[11px] text-muted-foreground">{T("og.role")}</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="mb-5 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-[13px] text-foreground outline-none">
              {ROLES.filter((r) => r !== "owner").map((r) => <option key={r} value={r}>{T(roleKey(r))}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={() => setInviting(false)} className="h-11 flex-1 rounded-xl border border-border text-[13px] font-semibold text-foreground/80">{T("og.cancel")}</button>
              <button onClick={invite} disabled={busy || !email.trim()} className="h-11 flex-1 rounded-xl bg-primary text-[13px] font-bold text-primary-foreground disabled:opacity-50">{T("og.send")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- <InviteCode/> — it shows the space's invite CODE to share (to copy) --------------------------------------
export function InviteCode({ orgId, orgModel = "organization" }: { orgId: string; orgModel?: string }) {
  const loc = useLocale();
  const T = useCallback((k: FabI18nKey) => i18n(loc, k), [loc]);
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    collection<Organization>(orgModel).get(orgId).then((o) => setCode(o.code || null)).catch(() => setCode(null));
  }, [orgId, orgModel]);
  const copy = () => {
    if (!code) return;
    try { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* */ }
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-1 text-[13px] font-bold text-foreground">{T("og.inviteCode")}</div>
      <div className="mb-3 text-xs text-muted-foreground">{T("og.inviteCodeSub")}</div>
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-xl border border-dashed border-primary/40 bg-accent/40 py-3 text-center font-mono text-xl font-bold tracking-[0.3em] text-primary">{code || "······"}</div>
        <button onClick={copy} disabled={!code} className="h-12 rounded-xl bg-primary px-4 text-[13px] font-bold text-primary-foreground disabled:opacity-50">{copied ? T("og.copied") : T("og.copy")}</button>
      </div>
    </div>
  );
}

// ---- <PairingGate/> — the door of a SHARED SPACE app (a couple/pair). It provides the SpaceContext (from the fab-client) -
// With no space → the create/join-by-code screen. With a space → it renders the children; inside them, the `useSpace()` gives
// { org, members, partner, code }. A `maxMembers=2` limits it to the couple.
export function PairingGate({ children, maxMembers = 2, orgModel = "organization", membershipModel = "membership", title, subtitle }:
  { children: ReactNode; maxMembers?: number; orgModel?: string; membershipModel?: string; title?: string; subtitle?: string }) {
  const { user } = useAuth();
  const loc = useLocale();
  const T = useCallback((k: FabI18nKey) => i18n(loc, k), [loc]);
  const orgs = useMemo(() => collection<Organization>(orgModel), [orgModel]);
  const mems = useMemo(() => collection<Membership>(membershipModel), [membershipModel]);
  const [org, setOrg] = useState<Organization | null | undefined>(undefined);   // undefined = loading
  const [members, setMembers] = useState<Membership[]>([]);
  const [tab, setTab] = useState<"create" | "join">("create");
  const [name, setName] = useState(""); const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const os = await orgs.list({ limit: 1 });
      const o = os[0] || null; setOrg(o);
      if (o?.id) setMembers(await mems.list({ filter: { organization: o.id }, sort: "created_at", limit: 50 }).catch(() => []));
    } catch { setOrg(null); }
  }, [orgs, mems]);
  useEffect(() => { load(); }, [load]);

  async function doCreate() {
    if (!name.trim() || busy) return; setBusy(true); setErr(null);
    try { await createOrg(name.trim(), { orgModel, membershipModel }); await load(); }
    catch (e) { setErr(e instanceof Error ? e.message : T("og.pairError")); } finally { setBusy(false); }
  }
  async function doJoin() {
    if (!code.trim() || busy) return; setBusy(true); setErr(null);
    try { await joinOrgByCode(code.trim(), { maxMembers, orgModel, membershipModel }); await load(); }
    catch (e) { setErr(e instanceof Error ? e.message : T("og.pairError")); } finally { setBusy(false); }
  }

  if (org === undefined) return <div className="flex min-h-[60vh] items-center justify-center"><div className={`${SKEL} h-24 w-64 rounded-2xl`} /></div>;
  if (org) {
    const partner = members.find((m) => m.user && m.user !== user?.id) || null;
    return <SpaceContext.Provider value={{ org, members, partner, code: org.code || null }}>{children}</SpaceContext.Provider>;
  }
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-sm flex-col justify-center gap-5 p-6">
      <div className="text-center">
        <div className="text-2xl font-bold text-foreground">{title || T("og.pairTitle")}</div>
        <div className="mt-1 text-[13px] text-muted-foreground">{subtitle || T("og.pairSubtitle")}</div>
      </div>
      <div className="flex rounded-xl bg-muted p-1">
        {(["create", "join"] as const).map((k) => (
          <button key={k} onClick={() => { setTab(k); setErr(null); }} className={`flex-1 rounded-lg py-2 text-[13px] font-bold ${tab === k ? "bg-card text-foreground shadow" : "text-muted-foreground"}`}>
            {T(k === "create" ? "og.pairCreate" : "og.pairJoin")}
          </button>
        ))}
      </div>
      {tab === "create" ? (
        <div className="flex flex-col gap-3">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") doCreate(); }}
            placeholder={T("og.pairNamePh")} className="rounded-xl border border-border bg-muted px-4 py-3 text-[14px] text-foreground outline-none focus:border-primary" />
          <button onClick={doCreate} disabled={busy || !name.trim()} className="rounded-xl bg-primary py-3 text-[14px] font-bold text-primary-foreground disabled:opacity-50">{T("og.pairCreateCta")}</button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <input autoFocus value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} onKeyDown={(e) => { if (e.key === "Enter") doJoin(); }}
            placeholder={T("og.enterCode")} className="rounded-xl border border-border bg-muted px-4 py-3 text-center text-[16px] uppercase tracking-[0.3em] text-foreground outline-none focus:border-primary" />
          <button onClick={doJoin} disabled={busy || !code.trim()} className="rounded-xl bg-primary py-3 text-[14px] font-bold text-primary-foreground disabled:opacity-50">{T("og.pairJoinCta")}</button>
        </div>
      )}
      {err && <div className="text-center text-[12.5px] text-destructive">{err}</div>}
    </div>
  );
}
