import { useMemo, useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import type { Client } from '../../data/clients';
import { getLedger } from '../../data/generate';
import { Compare, comparisonRange, Granularity, periodRows, Preset, PRESETS, resolveRange } from '../../finance/calc';
import { addMonths, fmtDate, fmtDateTime, ISODate, monthEnd, monthKey, monthLabel, monthsBetween, shiftMonthsDate } from '../../lib/date';
import { actorLabel, useStore } from '../../store/store';
import { dueDate } from '../../store/workflow';
import { Seg } from '../../components/ui';
import { DashCtx, Dash } from './context';
import Overview from './Overview';
import ProfitLoss from './ProfitLoss';
import Cash from './Cash';
import { Payables, Receivables } from './Docs';
import Updates from './Updates';
import Reports from './Reports';
import PrintReport from './PrintReport';

export const DASH_TABS = [
  { id: '', label: 'Overview' },
  { id: 'pl', label: 'Profit & loss' },
  { id: 'cash', label: 'Cash' },
  { id: 'receivables', label: 'Receivables' },
  { id: 'payables', label: 'Payables' },
  { id: 'updates', label: 'Weekly updates' },
  { id: 'reports', label: 'Reports' },
];

const FIRST_MONTH = '2024-04';

export function ClientDashboard({ client, cutoff, base, isFirm, extraTabs = [], extra }: {
  client: Client;
  cutoff: ISODate;
  base: string;
  isFirm: boolean;
  extraTabs?: { id: string; label: string }[];
  extra?: Record<string, JSX.Element>;
}) {
  const { tab = '' } = useParams();
  const { update, currentWeek, publishedThrough } = useStore();
  const [preset, setPreset] = useState<Preset>('6m');
  const cm = monthKey(cutoff);
  const [custom, setCustom] = useState({ from: addMonths(cm, -5), to: cm });
  const [gran, setGran] = useState<Granularity>('month');
  const [compare, setCompare] = useState<Compare>('previous');

  const ledger = getLedger(client, currentWeek);
  const dash: Dash = useMemo(() => {
    const r = resolveRange(preset, cutoff, custom);
    const range = { from: r.from < FIRST_MONTH ? FIRST_MONTH : r.from, to: r.to > cm ? cm : r.to };
    const comp = comparisonRange(range.from, range.to, compare);
    const asAt = range.to >= cm ? cutoff : monthEnd(range.to);
    const shift = compare === 'lastyear' ? -12 : -monthsBetween(range.from, range.to).length;
    const rangeLabel = range.from === range.to ? monthLabel(range.from) : `${monthLabel(range.from)} – ${monthLabel(range.to)}`;
    const compLabel = comp.from === comp.to ? monthLabel(comp.from) : `${monthLabel(comp.from)} – ${monthLabel(comp.to)}`;
    return {
      client, ledger, cutoff, range, comp, compare, gran,
      rows: periodRows(ledger, cutoff, range.from, range.to, gran),
      asAt, compAsAt: shiftMonthsDate(asAt, shift),
      rangeLabel, compLabel, isFirm, base,
    };
  }, [client, ledger, cutoff, preset, custom, gran, compare, cm, isFirm, base]);

  const months = monthsBetween(FIRST_MONTH, cm).reverse();
  const pub = update(client.id, cutoff);
  const nextDue = publishedThrough(client.id) === currentWeek ? dueDate(addDaysWeek(currentWeek)) : dueDate(currentWeek);
  const partial = dash.range.to === cm && dash.rows.some((r) => r.partial);
  const tabs = [...DASH_TABS, ...extraTabs];
  const views: Record<string, JSX.Element> = {
    '': <Overview />, pl: <ProfitLoss />, cash: <Cash />, receivables: <Receivables />, payables: <Payables />, updates: <Updates />, reports: <Reports />, print: <PrintReport />,
    ...extra,
  };
  const showFilters = ['', 'pl', 'cash', 'reports'].includes(tab);
  const printing = tab === 'print';

  return (
    <DashCtx.Provider value={dash}>
      <div className={`page-head ${printing ? 'no-print' : ''}`}>
        <div>
          <h1>{client.name}</h1>
          <div className="sub">{client.industry} · {client.city}{!client.active && ' · Inactive client'}</div>
        </div>
      </div>

      <div className={`banner ${printing ? 'no-print' : ''}`}>
        <div className="meta" style={{ flex: 1 }}>
          <span>Transactions to <b>{fmtDate(cutoff)}</b></span>
          {pub.status === 'published' && pub.publishedAt && (
            <span>Reviewed and published <b>{fmtDateTime(pub.publishedAt)}</b> by <b>{actorLabel(pub.publishedBy ?? '')}</b></span>
          )}
          <span>Update frequency <b>Weekly</b> (prepared by the accounting team, not real-time)</span>
          {client.active && <span>Next update due <b>{fmtDate(nextDue)}</b></span>}
        </div>
        {partial && <span className="badge amber">{monthLabel(cm)} is month to date and provisional</span>}
      </div>

      {!printing && <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <NavLink key={t.id} to={`${base}${t.id ? `/${t.id}` : ''}`} end className={({ isActive }) => (isActive ? 'active' : '')}>
            {t.label}
          </NavLink>
        ))}
      </div>}

      {showFilters && (
        <div className="filters">
          <Seg label="Period" options={PRESETS} value={preset} onChange={setPreset} />
          {preset === 'custom' && (
            <span className="row">
              <select className="select" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} aria-label="From month">
                {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
              </select>
              <span className="muted">to</span>
              <select className="select" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} aria-label="To month">
                {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
              </select>
            </span>
          )}
          <Seg label="Granularity" options={[{ id: 'month', label: 'Monthly' }, { id: 'quarter', label: 'Quarterly' }]} value={gran} onChange={setGran} />
          <span className="row">
            <span className="lbl">Compare with</span>
            <Seg label="Compare with" options={[{ id: 'previous', label: 'Previous period' }, { id: 'lastyear', label: 'Same period last year' }]} value={compare} onChange={setCompare} />
          </span>
        </div>
      )}

      {views[tab] ?? <div className="empty">Unknown view.</div>}
    </DashCtx.Provider>
  );
}

function addDaysWeek(d: ISODate): ISODate {
  const t = new Date(d + 'T00:00:00Z');
  t.setUTCDate(t.getUTCDate() + 7);
  return t.toISOString().slice(0, 10);
}
