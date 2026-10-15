// Synthetic ledger generator. Produces weekly P&L lines, customer invoices and
// supplier bills for each fictional client. Every rupee in the dashboards is
// derived from these records, so totals reconcile by construction.

import { addDays, diffDays, ISODate, monthKey } from '../lib/date';
import { between, gauss, pick, rng } from '../lib/rng';
import type { Client, Health } from './clients';

export const ANCHOR_WEEK_END: ISODate = '2024-01-07'; // first generated week (a Sunday)

export interface Flow {
  revenue: number;
  cogs: number;
  salaries: number;
  rent: number;
  marketing: number;
  utilities: number;
  software: number;
  other: number;
  depreciation: number;
  interest: number;
  tax: number;
  receipts: number;
  supplierPayments: number;
  cashOpex: number;
  drawings: number;
  cashEnd: number;
}

export interface WeekRow extends Flow {
  weekEnd: ISODate;
}

/** One calendar day. Monthly and quarterly figures are built from days. */
export interface DayRow extends Flow {
  date: ISODate;
}

export interface Doc {
  id: string;
  party: string;
  issue: ISODate;
  due: ISODate;
  amount: number;
  /** Date settled. A date after the as-at date means still outstanding at that date. */
  paid: ISODate | null;
}

export interface ClientLedger {
  clientId: string;
  terms: number;
  openingCash: number;
  weeks: WeekRow[];
  days: DayRow[];
  invoices: Doc[];
  bills: Doc[];
  budgetByMonth: Record<string, { revenue: number; netProfit: number }>;
}

interface Profile {
  growth: number;
  gm: number;
  fixed: number;
  pay: [number, number, number, number];
}

const PROFILES: Record<Health, Profile> = {
  strong: { growth: 0.2, gm: 0.48, fixed: 0.27, pay: [0.75, 0.22, 0.03, 0.002] },
  steady: { growth: 0.08, gm: 0.41, fixed: 0.28, pay: [0.6, 0.33, 0.06, 0.005] },
  stretched: { growth: 0.03, gm: 0.33, fixed: 0.235, pay: [0.4, 0.42, 0.16, 0.015] },
  struggling: { growth: -0.1, gm: 0.3, fixed: 0.27, pay: [0.35, 0.4, 0.21, 0.03] },
};

const PARTY_A = ['Asha', 'Vardhan', 'Krishna', 'Sapphire', 'Nova', 'Indus', 'Trident', 'Lakshmi', 'Orbit', 'Ganga', 'Summit', 'Coral', 'Apex', 'Unity', 'Prism', 'Delta', 'Cosmos', 'Shakti', 'Vista', 'Amber'];
const PARTY_B = ['Traders', 'Enterprises', 'Retail', 'Industries', 'Hospitality', 'Agencies', 'Stores', 'Systems', 'Distributors', 'Ventures', 'Corporation', 'Partners'];

function parties(r: () => number, n: number): string[] {
  const set = new Set<string>();
  while (set.size < n) set.add(`${pick(r, PARTY_A)} ${pick(r, PARTY_B)}`);
  return [...set];
}

const round = Math.round;

/** Split an integer total in proportion to weights; the parts always sum to the total. */
function allocate(totalAmount: number, weights: number[]): number[] {
  const ws = weights.reduce((a, b) => a + b, 0) || 1;
  const parts = weights.map((w) => Math.floor((totalAmount * w) / ws));
  let rest = totalAmount - parts.reduce((a, b) => a + b, 0);
  for (let i = weights.length - 1; rest !== 0; i = (i - 1 + weights.length) % weights.length) {
    if (weights[i] > 0 || ws === 1) { parts[i] += Math.sign(rest); rest -= Math.sign(rest); }
  }
  return parts;
}

function split(r: () => number, total: number, n: number): number[] {
  const w = Array.from({ length: n }, () => 0.4 + r());
  const s = w.reduce((a, b) => a + b, 0);
  const parts = w.map((x) => round((total * x) / s));
  parts[n - 1] += total - parts.reduce((a, b) => a + b, 0);
  return parts;
}

export function generateLedger(client: Client, throughWeekEnd: ISODate): ClientLedger {
  const p = PROFILES[client.health];
  const r = rng(`ledger:${client.id}`);
  const scale = client.scale;
  const amp = between(r, 0.05, 0.16);
  const phase = r() * 12;
  const vol = between(r, 0.04, 0.08);
  const gm = p.gm + between(r, -0.03, 0.03);
  const customers = parties(r, 6 + Math.floor(r() * 8));
  const suppliers = parties(r, 4 + Math.floor(r() * 5));
  const fixed = {
    salaries: scale * p.fixed * 0.62,
    rent: scale * p.fixed * 0.16,
    utilities: scale * p.fixed * 0.07,
    software: scale * p.fixed * 0.05,
    other: scale * p.fixed * 0.1,
  };
  const depreciation = round(scale * 0.012);
  const interest = round(scale * 0.006);

  const openingCash = round(scale * 5);
  let cash = openingCash;
  const weeks: WeekRow[] = [];
  const pending: (Omit<WeekRow, 'revenue' | 'receipts' | 'supplierPayments' | 'cashOpex' | 'cashEnd'> & { invoices: Doc[] })[] = [];
  const invoices: Doc[] = [];
  const bills: Doc[] = [];
  const total = Math.floor(diffDays(throughWeekEnd, ANCHOR_WEEK_END) / 7);
  let monthNet = 0;

  for (let i = 0; i <= total; i++) {
    const weekEnd = addDays(ANCHOR_WEEK_END, i * 7);
    const wr = rng(`week:${client.id}:${weekEnd}`);
    const t = i / 52;
    const month = Number(weekEnd.slice(5, 7));
    const season = 1 + amp * Math.sin(((month + phase) / 12) * 2 * Math.PI);
    const revenueTarget = Math.max(scale * 0.2, scale * Math.pow(1 + p.growth, t) * season * (1 + vol * gauss(wr)));

    // Customer invoices make up the week's revenue exactly.
    const nInv = 4 + Math.floor(wr() * 6);
    const amounts = split(wr, round(revenueTarget), nInv);
    let revenue = 0;
    const weekInvoices: Doc[] = [];
    amounts.forEach((amount, k) => {
      const issue = addDays(weekEnd, -Math.floor(wr() * 7));
      const due = addDays(issue, client.terms);
      const u = wr();
      let paid: ISODate | null;
      if (u < p.pay[0]) paid = addDays(due, Math.floor(between(wr, -4, 5)));
      else if (u < p.pay[0] + p.pay[1]) paid = addDays(due, Math.floor(between(wr, 8, 45)));
      else if (u < 1 - p.pay[3]) paid = addDays(due, Math.floor(between(wr, 62, 150)));
      else paid = addDays(due, Math.floor(between(wr, 160, 260))); // very slow, eventually settled
      const inv = { id: `INV-${weekEnd.replace(/-/g, '').slice(2)}-${k + 1}`, party: pick(wr, customers), issue, due, amount, paid };
      invoices.push(inv);
      weekInvoices.push(inv);
      revenue += amount;
    });

    const salaryStep = Math.pow(1.06, Math.floor((i + 13) / 52));
    const cogs = round(revenue * (1 - gm) * (1 + 0.04 * gauss(wr)));
    const marketing = round(revenue * between(wr, 0.02, 0.04));
    const salaries = round(fixed.salaries * salaryStep);
    const rent = round(fixed.rent);
    const utilities = round(fixed.utilities * (1 + 0.1 * gauss(wr)));
    const software = round(fixed.software);
    const other = round(fixed.other * (1 + 0.25 * gauss(wr)));
    const ebt = revenue - cogs - marketing - salaries - rent - utilities - software - other - depreciation - interest;
    const tax = ebt > 0 ? round(ebt * 0.25) : 0;

    // Supplier spend arrives as bills and is paid on terms.
    const supplierSpend = cogs + marketing + software + other;
    split(wr, supplierSpend, 1 + Math.floor(wr() * 3)).forEach((amount, k) => {
      const issue = addDays(weekEnd, -Math.floor(wr() * 7));
      const due = addDays(issue, 30);
      const slow = client.health === 'struggling' || client.health === 'stretched';
      const paid = addDays(due, Math.floor(slow ? between(wr, -2, 24) : between(wr, -6, 6)));
      bills.push({ id: `BILL-${weekEnd.replace(/-/g, '').slice(2)}-${k + 1}`, party: pick(wr, suppliers), issue, due, amount, paid });
    });

    monthNet += ebt - tax;
    const monthEnds = monthKey(addDays(weekEnd, 7)) !== monthKey(weekEnd);
    const drawings = monthEnds ? round(Math.max(0, monthNet) * 0.55) : 0;
    if (monthEnds) monthNet = 0;

    pending.push({ weekEnd, invoices: weekInvoices, cogs, salaries, rent, marketing, utilities, software, other, depreciation, interest, tax, drawings });
  }

  // Second pass: spread each week across its seven days so months can be cut on
  // calendar dates. Revenue follows invoice dates; cost of sales follows revenue;
  // other costs accrue evenly. Cash moves on the dates invoices and bills are settled.
  const receiptsOn = new Map<ISODate, number>();
  const paymentsOn = new Map<ISODate, number>();
  invoices.forEach((d) => d.paid && receiptsOn.set(d.paid, (receiptsOn.get(d.paid) ?? 0) + d.amount));
  bills.forEach((d) => d.paid && paymentsOn.set(d.paid, (paymentsOn.get(d.paid) ?? 0) + d.amount));
  const days: DayRow[] = [];
  const even = [1, 1, 1, 1, 1, 1, 1];

  for (const w of pending) {
    const dates = Array.from({ length: 7 }, (_, k) => addDays(w.weekEnd, k - 6));
    const rev = dates.map((d) => w.invoices.filter((x) => x.issue === d).reduce((a, x) => a + x.amount, 0));
    const lines = {
      cogs: allocate(w.cogs, rev),
      salaries: allocate(w.salaries, even),
      rent: allocate(w.rent, even),
      marketing: allocate(w.marketing, rev),
      utilities: allocate(w.utilities, even),
      software: allocate(w.software, even),
      other: allocate(w.other, even),
      depreciation: allocate(w.depreciation, even),
      interest: allocate(w.interest, even),
      tax: allocate(w.tax, even),
    };
    const weekDays: DayRow[] = dates.map((date, k) => {
      const receipts = receiptsOn.get(date) ?? 0;
      const supplierPayments = paymentsOn.get(date) ?? 0;
      const cashOpex = lines.salaries[k] + lines.rent[k] + lines.utilities[k] + lines.interest[k] + lines.tax[k];
      const drawings = k === 6 ? w.drawings : 0;
      cash += receipts - supplierPayments - cashOpex - drawings;
      return {
        date, revenue: rev[k], cogs: lines.cogs[k], salaries: lines.salaries[k], rent: lines.rent[k], marketing: lines.marketing[k],
        utilities: lines.utilities[k], software: lines.software[k], other: lines.other[k], depreciation: lines.depreciation[k],
        interest: lines.interest[k], tax: lines.tax[k], receipts, supplierPayments, cashOpex, drawings, cashEnd: cash,
      };
    });
    days.push(...weekDays);
    const sum = (k: keyof Flow) => weekDays.reduce((a, d) => a + d[k], 0);
    weeks.push({
      weekEnd: w.weekEnd, revenue: sum('revenue'), cogs: w.cogs, salaries: w.salaries, rent: w.rent, marketing: w.marketing,
      utilities: w.utilities, software: w.software, other: w.other, depreciation: w.depreciation, interest: w.interest, tax: w.tax,
      receipts: sum('receipts'), supplierPayments: sum('supplierPayments'), cashOpex: sum('cashOpex'), drawings: w.drawings, cashEnd: cash,
    });
  }

  // Budgets: set at the start of each financial year from a plain growth assumption.
  const budgetByMonth: ClientLedger['budgetByMonth'] = {};
  if (client.hasBudget) {
    const br = rng(`budget:${client.id}`);
    const byMonth = new Map<string, number>();
    weeks.forEach((w) => byMonth.set(monthKey(w.weekEnd), (byMonth.get(monthKey(w.weekEnd)) ?? 0) + 1));
    byMonth.forEach((n, mk) => {
      const tm = (Number(mk.slice(0, 4)) - 2024) + (Number(mk.slice(5, 7)) - 1) / 12;
      const rev = scale * n * Math.pow(1 + Math.max(p.growth, 0) + 0.03, tm) * (1 + 0.03 * gauss(br));
      budgetByMonth[mk] = { revenue: round(rev), netProfit: round(rev * Math.max(0.04, gm - p.fixed - 0.06) * 0.75) };
    });
  }

  return { clientId: client.id, terms: client.terms, openingCash, weeks, days, invoices, bills, budgetByMonth };
}

const cache = new Map<string, ClientLedger>();
export function getLedger(client: Client, throughWeekEnd: ISODate): ClientLedger {
  const key = `${client.id}:${throughWeekEnd}`;
  let l = cache.get(key);
  if (!l) {
    l = generateLedger(client, throughWeekEnd);
    cache.set(key, l);
  }
  return l;
}
