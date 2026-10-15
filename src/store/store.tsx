// Demo application state. Persisted in this browser's localStorage only:
// there is no server, database or real authentication in this demo build.

import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { CLIENTS, Client, clientById, staffName, STAFF } from '../data/clients';
import { getLedger } from '../data/generate';
import { addDays, fmtDate, ISODate, lastCompletedWeekEnd, todayISO } from '../lib/date';
import { inrCompact } from '../lib/format';
import { reconciliationChecks, sumPL, visibleWeeks } from '../finance/calc';
import { defaultUpdate, Exception, seededExceptions, Status, STATUS_LABEL, WeekUpdate } from './workflow';

export type Persona = { kind: 'staff'; staffId: string } | { kind: 'client'; clientId: string };

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  clientId?: string;
  detail: string;
}

export interface Notice {
  id: string;
  at: string;
  clientId: string;
  title: string;
  body: string;
  read: boolean;
}

interface Saved {
  persona: Persona | null;
  updates: Record<string, Record<ISODate, WeekUpdate>>;
  resolved: Record<string, string>;
  audit: AuditEntry[];
  notices: Notice[];
}

const KEY = 'finantz-demo-v1';

function load(): Saved | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

function persist(s: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable: state lives for this tab only */
  }
}

const uid = () => Math.random().toString(36).slice(2, 10);

function initial(currentWeek: ISODate, today: ISODate): Saved {
  // Seed the audit trail and client notices from the default state of the current week.
  const audit: AuditEntry[] = [];
  const notices: Notice[] = [];
  for (const c of CLIENTS) {
    for (const wk of [addDays(currentWeek, -7), currentWeek]) {
      const u = defaultUpdate(c, wk, currentWeek, today);
      if (u.status === 'published' && u.publishedAt) {
        audit.push({ id: uid(), at: u.publishedAt, actor: 'meera', action: 'Published update', clientId: c.id, detail: `Week ending ${fmtDate(wk)} · version 1` });
        notices.push({ id: uid(), at: u.publishedAt, clientId: c.id, title: 'Weekly figures published', body: `Your dashboard now shows figures to ${fmtDate(wk)}.`, read: wk !== currentWeek });
      }
    }
  }
  audit.sort((a, b) => b.at.localeCompare(a.at));
  return { persona: null, updates: {}, resolved: {}, audit, notices };
}

interface Ctx {
  today: ISODate;
  currentWeek: ISODate;
  persona: Persona | null;
  actorName: string;
  signIn: (p: Persona) => void;
  signOut: () => void;
  update: (clientId: string, weekEnd?: ISODate) => WeekUpdate;
  publishedThrough: (clientId: string) => ISODate;
  history: (clientId: string, weeks?: number) => { weekEnd: ISODate; u: WeekUpdate }[];
  exceptions: (clientId: string) => (Exception & { resolvedBy?: string })[];
  openExceptions: (clientId: string) => number;
  resolveException: (clientId: string, id: string) => void;
  transition: (clientId: string, to: Status, note?: string) => void;
  canAct: (c: Client, to: Status) => boolean;
  audit: AuditEntry[];
  logDownload: (clientId: string, what: string) => void;
  notices: Notice[];
  markNoticesRead: (clientId: string) => void;
  reset: () => void;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const today = todayISO();
  const currentWeek = lastCompletedWeekEnd(today);
  const [state, setState] = useState<Saved>(() => load() ?? initial(currentWeek, today));

  const commit = useCallback((fn: (s: Saved) => Saved) => {
    setState((s) => {
      const next = fn(s);
      persist(next);
      return next;
    });
  }, []);

  const actorId = state.persona?.kind === 'staff' ? state.persona.staffId : state.persona?.kind === 'client' ? `client:${state.persona.clientId}` : 'system';
  const actorName = actorId.startsWith('client:') ? clientById(actorId.slice(7))?.owner ?? 'Client' : staffName(actorId);

  const update = useCallback(
    (clientId: string, weekEnd: ISODate = currentWeek) => {
      const saved = state.updates[clientId]?.[weekEnd];
      return saved ?? defaultUpdate(clientById(clientId)!, weekEnd, currentWeek, today);
    },
    [state.updates, currentWeek, today],
  );

  const publishedThrough = useCallback(
    (clientId: string) => {
      for (let wk = currentWeek, i = 0; i < 20; i++, wk = addDays(wk, -7)) {
        if (update(clientId, wk).status === 'published') return wk;
      }
      return addDays(currentWeek, -140);
    },
    [update, currentWeek],
  );

  const history = useCallback(
    (clientId: string, weeks = 12) =>
      Array.from({ length: weeks }, (_, i) => addDays(currentWeek, -7 * i))
        .map((weekEnd) => ({ weekEnd, u: update(clientId, weekEnd) }))
        .filter((h) => h.u.status === 'published'),
    [update, currentWeek],
  );

  const exceptions = useCallback(
    (clientId: string) => {
      const c = clientById(clientId)!;
      const u = update(clientId);
      const list = seededExceptions(c, currentWeek);
      const preSubmit = u.status === 'not_started' || u.status === 'draft';
      return list.map((e) => {
        const by = state.resolved[`${clientId}:${currentWeek}:${e.id}`];
        return { ...e, resolvedBy: by ?? (preSubmit ? undefined : c.accountantId) };
      });
    },
    [state.resolved, update, currentWeek],
  );

  const openExceptions = useCallback((clientId: string) => exceptions(clientId).filter((e) => !e.resolvedBy).length, [exceptions]);

  const addAudit = (s: Saved, action: string, clientId: string | undefined, detail: string): Saved => ({
    ...s,
    audit: [{ id: uid(), at: new Date().toISOString(), actor: actorId, action, clientId, detail }, ...s.audit].slice(0, 500),
  });

  const resolveException = (clientId: string, id: string) => {
    const e = exceptions(clientId).find((x) => x.id === id);
    commit((s) => addAudit({ ...s, resolved: { ...s.resolved, [`${clientId}:${currentWeek}:${id}`]: actorId } }, 'Resolved exception', clientId, `${e?.kind}: ${e?.text}`));
  };

  const canAct = (c: Client, to: Status) => {
    const p = state.persona;
    if (!p || p.kind !== 'staff' || !c.active) return false;
    const isAdmin = STAFF.find((s) => s.id === p.staffId)?.role === 'admin';
    const mine = c.accountantId === p.staffId;
    const from = update(c.id).status;
    switch (to) {
      case 'draft': return (from === 'not_started' && (mine || isAdmin)) || (from === 'in_review' && isAdmin);
      case 'in_review': return from === 'draft' && (mine || isAdmin) && openExceptions(c.id) === 0;
      case 'approved': return from === 'in_review' && isAdmin;
      case 'published': return from === 'approved' && isAdmin;
      default: return false;
    }
  };

  const transition = (clientId: string, to: Status, note?: string) => {
    const c = clientById(clientId)!;
    if (!canAct(c, to)) return;
    const prev = update(clientId);
    const now = new Date().toISOString();
    const nextVersion = to === 'published' ? Math.max(prev.version, 0) + 1 : prev.version;
    const next: WeekUpdate = {
      ...prev,
      status: to,
      updatedAt: now,
      updatedBy: actorId,
      version: nextVersion,
      note,
      ...(to === 'published' ? { publishedAt: now, publishedBy: actorId } : {}),
    };
    const action =
      to === 'draft' && prev.status === 'in_review' ? 'Returned for changes'
      : to === 'draft' ? 'Started preparation'
      : to === 'in_review' ? 'Submitted for review'
      : to === 'approved' ? 'Approved update'
      : 'Published update';
    commit((s) => {
      let n: Saved = { ...s, updates: { ...s.updates, [clientId]: { ...s.updates[clientId], [currentWeek]: next } } };
      let detail = `Week ending ${fmtDate(currentWeek)} · ${STATUS_LABEL[prev.status]} → ${STATUS_LABEL[to]}${note ? ` · “${note}”` : ''}`;
      if (to === 'in_review') {
        const l = getLedger(c, currentWeek);
        const checks = reconciliationChecks(l, currentWeek);
        detail += ` · ${checks.filter((x) => x.ok).length}/${checks.length} reconciliation checks passed`;
      }
      if (to === 'published') {
        const l = getLedger(c, currentWeek);
        const wk = sumPL(visibleWeeks(l, currentWeek).slice(-1));
        detail += ` · version ${nextVersion}`;
        n = {
          ...n,
          notices: [{ id: uid(), at: now, clientId, title: 'Weekly figures published', body: `Your dashboard now shows figures to ${fmtDate(currentWeek)}. Revenue for the week was ${inrCompact(wk.revenue)}.`, read: false }, ...n.notices],
        };
      }
      return addAudit(n, action, clientId, detail);
    });
  };

  const value: Ctx = {
    today,
    currentWeek,
    persona: state.persona,
    actorName,
    signIn: (p) => commit((s) => {
      const name = p.kind === 'staff' ? staffName(p.staffId) : clientById(p.clientId)?.owner;
      const next = { ...s, persona: p };
      return { ...next, audit: [{ id: uid(), at: new Date().toISOString(), actor: p.kind === 'staff' ? p.staffId : `client:${p.clientId}`, action: 'Signed in', clientId: p.kind === 'client' ? p.clientId : undefined, detail: `${name} (demo sign-in)` }, ...s.audit] };
    }),
    signOut: () => commit((s) => ({ ...s, persona: null })),
    update,
    publishedThrough,
    history,
    exceptions,
    openExceptions,
    resolveException,
    transition,
    canAct,
    audit: state.audit,
    logDownload: (clientId, what) => commit((s) => addAudit(s, 'Downloaded report', clientId, what)),
    notices: state.notices,
    markNoticesRead: (clientId) => commit((s) => ({ ...s, notices: s.notices.map((n) => (n.clientId === clientId ? { ...n, read: true } : n)) })),
    reset: () => {
      try { localStorage.removeItem(KEY); } catch { /* ignore */ }
      setState(initial(currentWeek, today));
    },
  };

  return <StoreCtx.Provider value={useMemo(() => value, [state])}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const s = useContext(StoreCtx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}

export const actorLabel = (id: string) =>
  id.startsWith('client:') ? `${clientById(id.slice(7))?.owner ?? 'Client'} (client)` : id === 'system' ? 'System' : staffName(id);
