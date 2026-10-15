import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cashAt, daysInMonths, sumPL, visibleDays, visibleWeeks, weeksInMonths, workingCapital } from '../../finance/calc';
import { addDays, fmtDate } from '../../lib/date';
import { days as fmtDays, inr, inrCompact } from '../../lib/format';
import { Card, ChartTip, Kpi, Legend } from '../../components/ui';
import { AXIS, C, useDash } from './context';

export default function Cash() {
  const d = useDash();
  const l = d.ledger;
  const weeks = weeksInMonths(visibleWeeks(l, d.cutoff), d.range.from, d.range.to);
  const days = daysInMonths(visibleDays(l, d.cutoff), d.range.from, d.range.to);
  const pl = sumPL(days);
  const opening = cashAt(l, d.cutoff, addDays(`${d.range.from}-01`, -1));
  const closing = cashAt(l, d.cutoff, d.asAt);
  const wc = workingCapital(l, d.cutoff);
  const supplier = days.reduce((a, w) => a + w.supplierPayments, 0);
  const opex = days.reduce((a, w) => a + w.cashOpex, 0);
  const series = weeks.map((w) => ({ label: fmtDate(w.weekEnd), Cash: w.cashEnd, 'Money in': w.receipts, 'Money out': w.supplierPayments + w.cashOpex + w.drawings }));

  return (
    <>
      <div className="kpis">
        <Kpi label={`Cash & bank · ${fmtDate(d.cutoff)}`} value={<span className={wc.cash < 0 ? 'neg' : ''}>{inrCompact(wc.cash)}</span>} tone={wc.cash < 0 ? 'adverse' : undefined} />
        <Kpi label="Debtor days (DSO)" value={fmtDays(wc.dso)} foot="Receivables ÷ last 13 weeks' revenue" tone={wc.dso !== null && wc.dso > 60 ? 'warn' : undefined} />
        <Kpi label="Creditor days (DPO)" value={fmtDays(wc.dpo)} foot="Payables ÷ last 13 weeks' supplier spend" />
        <Kpi label="Quick ratio" value={wc.quickRatio === null ? '—' : wc.quickRatio.toFixed(2)} foot="(Cash + receivables) ÷ payables" tone={wc.quickRatio !== null && wc.quickRatio < 1 ? 'adverse' : undefined} />
        <Kpi label="Net working capital" value={inrCompact(wc.netWorkingCapital)} foot="Cash + receivables − payables" />
      </div>

      <div className="grid g2">
        <Card title="Cash & bank balance" hint="End of each week">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={series} margin={{ left: 4, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} stroke={C.grid} />
              <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={50} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={inrCompact} width={70} />
              <ReferenceLine y={0} stroke={C.red} strokeDasharray="4 4" />
              <Tooltip content={<ChartTip fmt={inr} />} />
              <Line dataKey="Cash" stroke={C.c1} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Money in and out" hint="By week" right={<Legend items={[{ label: 'Money in', color: C.c1 }, { label: 'Money out', color: C.c3 }]} />}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={series} barGap={2} margin={{ left: 4, right: 4, top: 8 }}>
              <CartesianGrid vertical={false} stroke={C.grid} />
              <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={50} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={inrCompact} width={70} />
              <Tooltip content={<ChartTip fmt={inr} />} cursor={{ fill: '#f1f4f9' }} />
              <Bar dataKey="Money in" fill={C.c1} radius={[3, 3, 0, 0]} maxBarSize={12} />
              <Bar dataKey="Money out" fill={C.c3} radius={[3, 3, 0, 0]} maxBarSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="Cash movement" hint={d.rangeLabel} className="mt">
        <div className="table-wrap">
          <table>
            <tbody>
              <tr className="sub"><td>Opening cash & bank</td><td className="num">{inr(opening)}</td></tr>
              <tr><td className="indent">Received from customers</td><td className="num">{inr(pl.receipts)}</td></tr>
              <tr><td className="indent">Paid to suppliers</td><td className="num">({inr(supplier)})</td></tr>
              <tr><td className="indent">Salaries, rent, utilities, interest and tax</td><td className="num">({inr(opex)})</td></tr>
              <tr><td className="indent">Owner drawings and loan repayments</td><td className="num">({inr(pl.drawings)})</td></tr>
              <tr className="total"><td>Closing cash & bank</td><td className={`num ${closing < 0 ? 'neg' : ''}`}>{inr(closing)}</td></tr>
            </tbody>
          </table>
        </div>
        <p className="small muted">Net profit for the same period was {inr(pl.netProfit)}. The difference is timing of customer and supplier payments, depreciation, and drawings.</p>
      </Card>
    </>
  );
}
