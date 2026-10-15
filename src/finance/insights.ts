// Rule-based flags for adverse movements. Plain thresholds, no forecasting.

import type { ClientLedger } from '../data/generate';
import { ISODate, monthKey, addMonths, monthLabel, fmtDate } from '../lib/date';
import { inrCompact, pct } from '../lib/format';
import { ageing, openAt, periodRows, total, visibleWeeks, workingCapital } from './calc';

export interface Flag {
  level: 'red' | 'amber' | 'info';
  title: string;
  detail: string;
}

export function clientFlags(l: ClientLedger, cutoff: ISODate): Flag[] {
  const flags: Flag[] = [];
  const cm = monthKey(cutoff);
  const lastFull = addMonths(cm, -1);
  const [prev, last] = periodRows(l, cutoff, addMonths(lastFull, -1), lastFull, 'month');
  const wc = workingCapital(l, cutoff);
  const recent = visibleWeeks(l, cutoff).slice(-4);
  const weeklyOut = recent.reduce((a, w) => a + w.supplierPayments + w.cashOpex, 0) / Math.max(recent.length, 1);

  if (wc.cash < 0) flags.push({ level: 'red', title: 'Bank balance is overdrawn', detail: `Cash stands at ${inrCompact(wc.cash)} at ${fmtDate(cutoff)}.` });
  else if (wc.cash < weeklyOut * 4) flags.push({ level: 'amber', title: 'Cash covers less than 4 weeks of outgoings', detail: `${inrCompact(wc.cash)} against average weekly outgoings of ${inrCompact(weeklyOut)}.` });

  if (last && last.netProfit < 0) flags.push({ level: 'red', title: `Net loss in ${monthLabel(lastFull)}`, detail: `Net loss of ${inrCompact(-last.netProfit)} on revenue of ${inrCompact(last.revenue)}.` });

  const ar = openAt(l.invoices, cutoff);
  const arTotal = total(ar);
  const over90 = ageing(ar)[4];
  if (arTotal > 0 && over90.amount / arTotal > 0.2) flags.push({ level: over90.amount / arTotal > 0.35 ? 'red' : 'amber', title: 'Receivables over 90 days are high', detail: `${inrCompact(over90.amount)} across ${over90.count} invoices, ${pct(over90.amount / arTotal, 0)} of receivables.` });

  if (prev && last && prev.revenue > 0) {
    const ch = (last.revenue - prev.revenue) / prev.revenue;
    if (ch < -0.15) flags.push({ level: 'amber', title: `Revenue fell ${pct(-ch, 0)} in ${monthLabel(lastFull)}`, detail: `${inrCompact(last.revenue)} against ${inrCompact(prev.revenue)} in ${monthLabel(addMonths(lastFull, -1))}.` });
    const gmNow = last.grossProfit / Math.max(last.revenue, 1);
    const gmPrev = prev.grossProfit / Math.max(prev.revenue, 1);
    if (gmPrev - gmNow > 0.02) flags.push({ level: 'amber', title: 'Gross margin narrowed', detail: `${pct(gmNow)} in ${monthLabel(lastFull)}, down from ${pct(gmPrev)}.` });
  }

  if (last?.budgetRevenue && last.revenue < last.budgetRevenue * 0.9) flags.push({ level: 'amber', title: `Revenue below budget in ${monthLabel(lastFull)}`, detail: `${inrCompact(last.revenue)} against a budget of ${inrCompact(last.budgetRevenue)} (${pct(last.revenue / last.budgetRevenue - 1)}).` });

  if (wc.dso !== null && wc.dso > l.terms + 30) flags.push({ level: 'amber', title: 'Customers are paying slowly', detail: `Debtor days are ${Math.round(wc.dso)} against ${l.terms}-day payment terms (trailing 13 weeks).` });

  return flags.sort((a, b) => (a.level === b.level ? 0 : a.level === 'red' ? -1 : b.level === 'red' ? 1 : 0));
}
