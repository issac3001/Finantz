import { describe, expect, it } from 'vitest';
import { CLIENTS } from '../data/clients';
import { getLedger } from '../data/generate';
import { ageing, cashAt, openAt, periodRows, rangePL, reconciliationChecks, total } from '../finance/calc';
import { lastCompletedWeekEnd, monthKey, addMonths } from '../lib/date';

const week = lastCompletedWeekEnd('2026-10-15');

describe('synthetic ledgers reconcile', () => {
  it('uses the Sunday before today as the latest closed week', () => {
    expect(week).toBe('2026-10-11');
  });

  for (const c of CLIENTS) {
    it(`${c.name}: every reconciliation check passes`, () => {
      const l = getLedger(c, week);
      for (const ch of reconciliationChecks(l, week)) expect(ch.ok, `${ch.label}: ${ch.detail}`).toBe(true);
    });
  }

  it('monthly rows sum to the range total', () => {
    const l = getLedger(CLIENTS[0], week);
    const from = addMonths(monthKey(week), -11);
    const rows = periodRows(l, week, from, monthKey(week), 'month');
    const quarters = periodRows(l, week, from, monthKey(week), 'quarter');
    const range = rangePL(l, week, { from, to: monthKey(week) });
    expect(rows.reduce((a, r) => a + r.netProfit, 0)).toBe(range.netProfit);
    expect(quarters.reduce((a, r) => a + r.revenue, 0)).toBe(range.revenue);
  });

  it('ageing buckets add up to the open balance', () => {
    const l = getLedger(CLIENTS[3], week);
    const items = openAt(l.invoices, week);
    expect(ageing(items).reduce((a, b) => a + b.amount, 0)).toBe(total(items));
  });

  it('cash is never read past the published cutoff', () => {
    const l = getLedger(CLIENTS[2], week);
    const earlier = '2026-09-27';
    expect(cashAt(l, earlier, week)).toBe(l.weeks.find((w) => w.weekEnd === earlier)!.cashEnd);
    expect(cashAt(l, week, week)).toBe(l.weeks.find((w) => w.weekEnd === week)!.cashEnd);
  });
});
