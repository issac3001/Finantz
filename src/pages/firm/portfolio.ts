import { useMemo } from 'react';
import { CLIENTS, Client, STAFF } from '../../data/clients';
import { getLedger } from '../../data/generate';
import { workingCapital, sumPL, visibleWeeks } from '../../finance/calc';
import { clientFlags, Flag } from '../../finance/insights';
import { ISODate } from '../../lib/date';
import { useStore } from '../../store/store';
import { dueDate, WeekUpdate } from '../../store/workflow';

export interface PortfolioRow {
  c: Client;
  u: WeekUpdate;
  publishedThrough: ISODate;
  lastPublishedAt?: string;
  overdue: boolean;
  open: number;
  flags: Flag[];
  revenue13: number;
  cash: number;
  ar: number;
}

/** Clients the signed-in staff member may see: everyone for the administrator, assigned clients for accountants. */
export function useVisibleClients(): Client[] {
  const { persona } = useStore();
  if (persona?.kind !== 'staff') return [];
  const s = STAFF.find((x) => x.id === persona.staffId);
  return s?.role === 'admin' ? CLIENTS : CLIENTS.filter((c) => c.accountantId === s?.id);
}

export function usePortfolio(): PortfolioRow[] {
  const store = useStore();
  const clients = useVisibleClients();
  const { update, publishedThrough, openExceptions, currentWeek, today } = store;
  return useMemo(
    () =>
      clients.map((c) => {
        const u = update(c.id);
        const pt = publishedThrough(c.id);
        const l = getLedger(c, currentWeek);
        const wc = workingCapital(l, pt);
        return {
          c, u,
          publishedThrough: pt,
          lastPublishedAt: update(c.id, pt).publishedAt,
          overdue: c.active && today > dueDate(currentWeek) && u.status !== 'published',
          open: c.active ? openExceptions(c.id) : 0,
          flags: clientFlags(l, pt),
          revenue13: sumPL(visibleWeeks(l, pt).slice(-13)).revenue,
          cash: wc.cash,
          ar: wc.ar,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clients, store],
  );
}
