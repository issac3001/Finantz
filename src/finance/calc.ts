// Financial calculation logic. Pure functions over the ledger: no UI, no storage.

import { addMonths, diffDays, fyStartYear, ISODate, monthKey, monthLabel, monthsBetween, quarterKey } from '../lib/date';
import type { ClientLedger, DayRow, Doc, Flow, WeekRow } from '../data/generate';

export interface PL {
  revenue: number;
  cogs: number;
  grossProfit: number;
  salaries: number;
  rent: number;
  marketing: number;
  utilities: number;
  software: number;
  other: number;
  operatingExpenses: number;
  ebitda: number;
  depreciation: number;
  operatingProfit: number;
  interest: number;
  tax: number;
  netProfit: number;
  receipts: number;
  payments: number;
  drawings: number;
}

export const OPEX_LINES = [
  ['salaries', 'Salaries & wages'],
  ['rent', 'Rent'],
  ['marketing', 'Marketing'],
  ['utilities', 'Utilities'],
  ['software', 'Software & subscriptions'],
  ['other', 'Other overheads'],
] as const;

export function sumPL(rows: Flow[]): PL {
  const s = (k: keyof Flow) => rows.reduce((a, w) => a + w[k], 0);
  const revenue = s('revenue');
  const cogs = s('cogs');
  const grossProfit = revenue - cogs;
  const salaries = s('salaries'), rent = s('rent'), marketing = s('marketing');
  const utilities = s('utilities'), software = s('software'), other = s('other');
  const operatingExpenses = salaries + rent + marketing + utilities + software + other;
  const ebitda = grossProfit - operatingExpenses;
  const depreciation = s('depreciation');
  const operatingProfit = ebitda - depreciation;
  const interest = s('interest');
  const tax = s('tax');
  const netProfit = operatingProfit - interest - tax;
  return {
    revenue, cogs, grossProfit, salaries, rent, marketing, utilities, software, other, operatingExpenses,
    ebitda, depreciation, operatingProfit, interest, tax, netProfit,
    receipts: s('receipts'),
    payments: s('supplierPayments') + s('cashOpex'),
    drawings: s('drawings'),
  };
}

export const visibleWeeks = (l: ClientLedger, cutoff: ISODate) => l.weeks.filter((w) => w.weekEnd <= cutoff);
export const visibleDays = (l: ClientLedger, cutoff: ISODate) => l.days.filter((d) => d.date <= cutoff);

/** Days whose calendar month falls in the range. Profit and loss is always cut on calendar dates. */
export const daysInMonths = (days: DayRow[], from: string, to: string) =>
  days.filter((d) => monthKey(d.date) >= from && monthKey(d.date) <= to);

/** Range figures as published: calendar days in the range, up to the cutoff. */
export const rangePL = (l: ClientLedger, cutoff: ISODate, r: { from: string; to: string }) => sumPL(daysInMonths(visibleDays(l, cutoff), r.from, r.to));

/** For weekly charts: weeks assigned to the month in which the week ends. */
export const weeksInMonths = (weeks: WeekRow[], from: string, to: string) =>
  weeks.filter((w) => monthKey(w.weekEnd) >= from && monthKey(w.weekEnd) <= to);

export type Granularity = 'month' | 'quarter';

export interface PeriodRow extends PL {
  key: string;
  label: string;
  partial: boolean;
  cashEnd: number;
  budgetRevenue: number | null;
  budgetNetProfit: number | null;
}

export function periodRows(l: ClientLedger, cutoff: ISODate, from: string, to: string, g: Granularity): PeriodRow[] {
  const days = visibleDays(l, cutoff);
  const cutoffMonth = monthKey(cutoff);
  const monthComplete = monthKey(addDaysSafe(cutoff, 1)) !== cutoffMonth;
  const groups = new Map<string, { label: string; months: string[] }>();
  for (const mk of monthsBetween(from, to)) {
    const key = g === 'month' ? mk : quarterKey(mk);
    const label = g === 'month' ? monthLabel(mk) : key;
    if (!groups.has(key)) groups.set(key, { label, months: [] });
    groups.get(key)!.months.push(mk);
  }
  return [...groups.entries()].map(([key, { label, months }]) => {
    const ds = days.filter((d) => months.includes(monthKey(d.date)));
    const pl = sumPL(ds);
    const budgets = months.map((m) => l.budgetByMonth[m]).filter(Boolean);
    const hasBudget = budgets.length === months.length && budgets.length > 0;
    const quarterComplete = g === 'month' || months.length === 3;
    return {
      key, label, ...pl,
      partial: (months.includes(cutoffMonth) && !monthComplete) || !quarterComplete || months.some((m) => m > cutoffMonth),
      cashEnd: ds.length ? ds[ds.length - 1].cashEnd : cashAt(l, cutoff, monthEndOf(months[0], -1)),
      budgetRevenue: hasBudget ? budgets.reduce((a, b) => a + b.revenue, 0) : null,
      budgetNetProfit: hasBudget ? budgets.reduce((a, b) => a + b.netProfit, 0) : null,
    };
  });
}

function addDaysSafe(d: ISODate, n: number): ISODate {
  const t = new Date(d + 'T00:00:00Z');
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}

function monthEndOf(mk: string, offset = 0): ISODate {
  const m = addMonths(mk, offset + 1);
  return addDaysSafe(`${m}-01`, -1);
}

/** Cash balance at the end of `asOf`, never looking past the published cutoff. */
export function cashAt(l: ClientLedger, cutoff: ISODate, asOf: ISODate): number {
  const limit = asOf < cutoff ? asOf : cutoff;
  let c = l.openingCash;
  for (const d of l.days) {
    if (d.date > limit) break;
    c = d.cashEnd;
  }
  return c;
}

export const BUCKETS = ['Not yet due', '1–30 days', '31–60 days', '61–90 days', 'Over 90 days'] as const;
export type Bucket = (typeof BUCKETS)[number];

export interface OpenItem extends Doc {
  daysPastDue: number;
  bucket: Bucket;
}

export function bucketFor(daysPastDue: number): Bucket {
  if (daysPastDue <= 0) return 'Not yet due';
  if (daysPastDue <= 30) return '1–30 days';
  if (daysPastDue <= 60) return '31–60 days';
  if (daysPastDue <= 90) return '61–90 days';
  return 'Over 90 days';
}

export function openAt(docs: Doc[], asOf: ISODate): OpenItem[] {
  return docs
    .filter((d) => d.issue <= asOf && (d.paid === null || d.paid > asOf))
    .map((d) => {
      const daysPastDue = diffDays(asOf, d.due);
      return { ...d, daysPastDue, bucket: bucketFor(daysPastDue) };
    })
    .sort((a, b) => b.daysPastDue - a.daysPastDue);
}

export function ageing(items: OpenItem[]): { bucket: Bucket; amount: number; count: number }[] {
  return BUCKETS.map((bucket) => {
    const its = items.filter((i) => i.bucket === bucket);
    return { bucket, amount: its.reduce((a, i) => a + i.amount, 0), count: its.length };
  });
}

export const total = (items: { amount: number }[]) => items.reduce((a, i) => a + i.amount, 0);

export function byParty(items: OpenItem[]) {
  const m = new Map<string, { party: string; amount: number; overdue: number; over90: number; count: number }>();
  for (const i of items) {
    const row = m.get(i.party) ?? { party: i.party, amount: 0, overdue: 0, over90: 0, count: 0 };
    row.amount += i.amount;
    row.count += 1;
    if (i.daysPastDue > 0) row.overdue += i.amount;
    if (i.daysPastDue > 90) row.over90 += i.amount;
    m.set(i.party, row);
  }
  return [...m.values()].sort((a, b) => b.amount - a.amount);
}

/** Trailing 13-week (91 day) working-capital measures as at the cutoff. */
export function workingCapital(l: ClientLedger, cutoff: ISODate) {
  const weeks = visibleWeeks(l, cutoff).slice(-13);
  const rev = weeks.reduce((a, w) => a + w.revenue, 0);
  const spend = weeks.reduce((a, w) => a + w.cogs + w.marketing + w.software + w.other, 0);
  const ar = total(openAt(l.invoices, cutoff));
  const ap = total(openAt(l.bills, cutoff));
  const cash = cashAt(l, cutoff, cutoff);
  const days = weeks.length * 7;
  return {
    ar, ap, cash,
    dso: rev > 0 ? (ar / rev) * days : null,
    dpo: spend > 0 ? (ap / spend) * days : null,
    quickRatio: ap > 0 ? (Math.max(cash, 0) + ar) / ap : null,
    netWorkingCapital: cash + ar - ap,
  };
}

export interface Check {
  label: string;
  ok: boolean;
  detail: string;
}

/** Reconciliation checks run before a weekly update can be submitted. */
export function reconciliationChecks(l: ClientLedger, cutoff: ISODate): Check[] {
  const days = visibleDays(l, cutoff);
  const pl = sumPL(days);
  const invoiced = l.invoices.filter((d) => d.issue <= cutoff).reduce((a, d) => a + d.amount, 0);
  const arItems = openAt(l.invoices, cutoff);
  const arByAgeing = ageing(arItems).reduce((a, b) => a + b.amount, 0);
  const arRollforward = l.invoices.filter((d) => d.issue <= cutoff).reduce((a, d) => a + d.amount, 0)
    - l.invoices.filter((d) => d.paid !== null && d.paid <= cutoff).reduce((a, d) => a + d.amount, 0);
  const cashRoll = l.openingCash + pl.receipts - pl.payments - pl.drawings;
  const cashLedger = cashAt(l, cutoff, cutoff);
  const weeklyRevenue = visibleWeeks(l, cutoff).reduce((a, w) => a + w.revenue, 0);
  const plIdentity = pl.revenue - pl.cogs - pl.operatingExpenses - pl.depreciation - pl.interest - pl.tax;
  return [
    { label: 'Revenue agrees to sales invoices', ok: invoiced === pl.revenue, detail: `${invoiced} vs ${pl.revenue}` },
    { label: 'Receivables ageing agrees to ledger', ok: arByAgeing === arRollforward, detail: `${arByAgeing} vs ${arRollforward}` },
    { label: 'Cash roll-forward agrees to bank balance', ok: Math.abs(cashRoll - cashLedger) < 1, detail: `${cashRoll} vs ${cashLedger}` },
    { label: 'Daily and weekly records agree', ok: weeklyRevenue === pl.revenue, detail: `${weeklyRevenue} vs ${pl.revenue}` },
    { label: 'Profit and loss totals are internally consistent', ok: plIdentity === pl.netProfit, detail: `${plIdentity} vs ${pl.netProfit}` },
  ];
}

// ---- Date-range presets ----

export type Preset = 'mtd' | '3m' | '6m' | '12m' | 'fytd' | 'lastfy' | 'custom';

export const PRESETS: { id: Preset; label: string }[] = [
  { id: 'mtd', label: 'This month' },
  { id: '3m', label: '3 months' },
  { id: '6m', label: '6 months' },
  { id: '12m', label: '12 months' },
  { id: 'fytd', label: 'FY to date' },
  { id: 'lastfy', label: 'Last FY' },
  { id: 'custom', label: 'Custom' },
];

export type Compare = 'previous' | 'lastyear';

export function resolveRange(preset: Preset, cutoff: ISODate, custom: { from: string; to: string }) {
  const cm = monthKey(cutoff);
  switch (preset) {
    case 'mtd': return { from: cm, to: cm };
    case '3m': return { from: addMonths(cm, -2), to: cm };
    case '6m': return { from: addMonths(cm, -5), to: cm };
    case '12m': return { from: addMonths(cm, -11), to: cm };
    case 'fytd': return { from: `${fyStartYear(cm)}-04`, to: cm };
    case 'lastfy': { const y = fyStartYear(cm) - 1; return { from: `${y}-04`, to: `${y + 1}-03` }; }
    case 'custom': return custom.from <= custom.to ? custom : { from: custom.to, to: custom.from };
  }
}

export function comparisonRange(from: string, to: string, mode: Compare) {
  if (mode === 'lastyear') return { from: addMonths(from, -12), to: addMonths(to, -12) };
  const n = monthsBetween(from, to).length;
  return { from: addMonths(from, -n), to: addMonths(to, -n) };
}

export const change = (cur: number, prev: number) => (prev === 0 ? null : (cur - prev) / Math.abs(prev));

/**
 * Comparison-range figures. When the current range ends in a part-month, the
 * comparison's final month is cut at the same day of the month, so like is compared with like.
 */
export function comparablePL(l: ClientLedger, cutoff: ISODate, cur: { from: string; to: string }, comp: { from: string; to: string }) {
  const ds = daysInMonths(visibleDays(l, cutoff), comp.from, comp.to);
  const partial = cur.to === monthKey(cutoff) && monthKey(addDaysSafe(cutoff, 1)) === monthKey(cutoff);
  if (!partial) return sumPL(ds);
  const day = Number(cutoff.slice(8, 10));
  return sumPL(ds.filter((d) => monthKey(d.date) !== comp.to || Number(d.date.slice(8, 10)) <= day));
}
