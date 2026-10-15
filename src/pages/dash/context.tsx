import { createContext, useContext } from 'react';
import type { Client } from '../../data/clients';
import type { ClientLedger } from '../../data/generate';
import type { Compare, Granularity, PeriodRow } from '../../finance/calc';
import type { ISODate } from '../../lib/date';

export interface Dash {
  client: Client;
  ledger: ClientLedger;
  cutoff: ISODate;
  range: { from: string; to: string };
  comp: { from: string; to: string };
  compare: Compare;
  gran: Granularity;
  rows: PeriodRow[];
  asAt: ISODate;
  compAsAt: ISODate;
  compLabel: string;
  rangeLabel: string;
  isFirm: boolean;
  base: string;
}

export const DashCtx = createContext<Dash | null>(null);
export const useDash = () => useContext(DashCtx)!;

export const AXIS = { fontSize: 12, fill: '#747d90' };
export const C = { c1: '#3d5da6', c2: '#11a08e', c3: '#7e9ee6', c4: '#8a5cc2', red: '#b93a2b', amber: '#e0a800', grid: '#e5e9f0' };
