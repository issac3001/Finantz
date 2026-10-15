import type { WeekRow } from '../../data/generate';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link } from 'react-router-dom';
import { ageing, cashAt, change, comparablePL, openAt, rangePL, sumPL, total, visibleWeeks, weeksInMonths } from '../../finance/calc';
import { clientFlags } from '../../finance/insights';
import { fmtDate } from '../../lib/date';
import { inr, inrCompact, pct } from '../../lib/format';
import { Card, ChartTip, Delta, Kpi, Legend } from '../../components/ui';
import { AXIS, C, useDash } from './context';

export const BUCKET_COLORS = [C.c1, C.c3, C.amber, '#c98a00', C.red];

export default function Overview() {
  const d = useDash();
  const { ledger: l, cutoff } = d;
  const cur = rangePL(l, cutoff, d.range);
  const prev = comparablePL(l, cutoff, d.range, d.comp);
  const vs = `vs ${d.compLabel}`;
  const ar = openAt(l.invoices, d.asAt);
  const arPrev = openAt(l.invoices, d.compAsAt);
  const ap = openAt(l.bills, d.asAt);
  const apPrev = openAt(l.bills, d.compAsAt);
  const cash = cashAt(l, cutoff, d.asAt);
  const cashPrev = cashAt(l, cutoff, d.compAsAt);
  const arOver = ar.filter((i) => i.daysPastDue > 0);
  const flags = clientFlags(l, cutoff);
  const gm = cur.revenue ? cur.grossProfit / cur.revenue : null;
  const nm = cur.revenue ? cur.netProfit / cur.revenue : null;

  const trend = d.rows.map((r) => ({ label: r.label, partial: r.partial, Revenue: r.revenue, Expenses: r.revenue - r.netProfit, 'Net profit': r.netProfit }));
  const cashSeries = weeksInMonths(visibleWeeks(l, cutoff), d.range.from, d.range.to).map((w) => ({ label: fmtDate(w.weekEnd), Cash: w.cashEnd }));
  const ageingRows = ageing(ar).map((b) => ({ label: b.bucket, Amount: b.amount, count: b.count }));
  const lastWeek = visibleWeeks(l, cutoff).slice(-2);

  return (
    <>
      <div className="kpis">
        <Kpi label={`Revenue · ${d.rangeLabel}`} value={inrCompact(cur.revenue)} delta={<Delta value={change(cur.revenue, prev.revenue)} good="up" vs={vs} />} />
        <Kpi label="Gross profit" value={inrCompact(cur.grossProfit)} delta={<Delta value={change(cur.grossProfit, prev.grossProfit)} good="up" vs={vs} />} foot={`Gross margin ${pct(gm)}`} />
        <Kpi label="Net profit" value={<span className={cur.netProfit < 0 ? 'neg' : ''}>{inrCompact(cur.netProfit)}</span>} tone={cur.netProfit < 0 ? 'adverse' : undefined}
          delta={<Delta value={change(cur.netProfit, prev.netProfit)} good="up" vs={vs} />} foot={`Net margin ${pct(nm)}`} />
        <Kpi label={`Cash & bank · ${fmtDate(d.asAt)}`} value={<span className={cash < 0 ? 'neg' : ''}>{inrCompact(cash)}</span>} tone={cash < 0 ? 'adverse' : undefined}
          delta={<Delta value={change(cash, cashPrev)} good="up" vs={`vs ${fmtDate(d.compAsAt)}`} />} />
        <Kpi label="Receivables" value={inrCompact(total(ar))} tone={total(arOver) / Math.max(total(ar), 1) > 0.5 ? 'warn' : undefined}
          delta={<Delta value={change(total(ar), total(arPrev))} good="none" vs={`vs ${fmtDate(d.compAsAt)}`} />} foot={`${inrCompact(total(arOver))} overdue`} />
        <Kpi label="Payables" value={inrCompact(total(ap))}
          delta={<Delta value={change(total(ap), total(apPrev))} good="none" vs={`vs ${fmtDate(d.compAsAt)}`} />} foot={`${ap.filter((i) => i.daysPastDue > 0).length} bills overdue`} />
      </div>

      <div className="grid g-2-1">
        <Card title="Revenue and expenses" hint={d.gran === 'month' ? 'By month' : 'By quarter'} right={<Legend items={[{ label: 'Revenue', color: C.c1 }, { label: 'Expenses (all costs incl. tax)', color: C.c3 }]} />}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={trend} barGap={2} margin={{ left: 4, right: 4, top: 8 }}>
              <CartesianGrid vertical={false} stroke={C.grid} />
              <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: C.grid }} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={inrCompact} width={70} />
              <Tooltip content={<ChartTip fmt={inr} />} cursor={{ fill: '#f1f4f9' }} />
              <Bar dataKey="Revenue" fill={C.c1} radius={[4, 4, 0, 0]} maxBarSize={26}>
                {trend.map((t) => <Cell key={t.label} fillOpacity={t.partial ? 0.45 : 1} />)}
              </Bar>
              <Bar dataKey="Expenses" fill={C.c3} radius={[4, 4, 0, 0]} maxBarSize={26}>
                {trend.map((t) => <Cell key={t.label} fillOpacity={t.partial ? 0.45 : 1} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {trend.some((t) => t.partial) && <div className="small muted">Faded bars are provisional: the period is not yet complete.</div>}
        </Card>

        <Card title="Things to look at" hint="Flags based on published figures">
          <div className="alerts">
            {flags.length === 0 && (
              <div className="alert info"><div className="icon">i</div><div><div className="t">No adverse movements flagged</div><div className="d">Cash, margins, receivables and budget are within normal ranges.</div></div></div>
            )}
            {flags.map((f) => (
              <div key={f.title} className={`alert ${f.level}`}>
                <div className="icon">{f.level === 'red' ? '!' : '•'}</div>
                <div><div className="t">{f.title}</div><div className="d">{f.detail}</div></div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid g3 mt">
        <Card title="Net profit" hint={d.gran === 'month' ? 'By month' : 'By quarter'}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trend} margin={{ left: 4, right: 4, top: 8 }}>
              <CartesianGrid vertical={false} stroke={C.grid} />
              <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={inrCompact} width={64} />
              <ReferenceLine y={0} stroke="#9aa3b5" />
              <Tooltip content={<ChartTip fmt={inr} />} cursor={{ fill: '#f1f4f9' }} />
              <Bar dataKey="Net profit" radius={[4, 4, 0, 0]} maxBarSize={22}>
                {trend.map((t) => <Cell key={t.label} fill={t['Net profit'] < 0 ? C.red : C.c1} fillOpacity={t.partial ? 0.45 : 1} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="small muted">Losses are shown in red.</div>
        </Card>

        <Card title="Cash & bank balance" hint="Week by week">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={cashSeries} margin={{ left: 4, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} stroke={C.grid} />
              <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={40} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={inrCompact} width={64} />
              <ReferenceLine y={0} stroke={C.red} strokeDasharray="4 4" />
              <Tooltip content={<ChartTip fmt={inr} />} />
              <Line dataKey="Cash" stroke={C.c1} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="small muted">Balance at the end of each week. <Link to={`${d.base}/cash`}>Cash detail</Link></div>
        </Card>

        <Card title="Receivables ageing" hint={`At ${fmtDate(d.asAt)}`}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ageingRows} layout="vertical" margin={{ left: 0, right: 12 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" tick={AXIS} tickLine={false} axisLine={false} width={92} />
              <Tooltip content={<ChartTip fmt={inr} />} cursor={{ fill: '#f1f4f9' }} />
              <Bar dataKey="Amount" radius={[0, 4, 4, 0]} maxBarSize={20}>
                {ageingRows.map((r, i) => <Cell key={r.label} fill={BUCKET_COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="small muted">Days past due date. <Link to={`${d.base}/receivables`}>See invoices</Link></div>
        </Card>
      </div>

      {lastWeek.length === 2 && (
        <Card title={`Week ending ${fmtDate(lastWeek[1].weekEnd)}`} hint="Latest weekly update" className="mt">
          <WeekCompare a={lastWeek[0]} b={lastWeek[1]} />
        </Card>
      )}
    </>
  );
}


export function WeekCompare({ a, b }: { a: WeekRow; b: WeekRow }) {
  const pa = sumPL([a]);
  const pb = sumPL([b]);
  const items: [string, number, number, 'up' | 'down' | 'none'][] = [
    ['Revenue', pb.revenue, pa.revenue, 'up'],
    ['Gross profit', pb.grossProfit, pa.grossProfit, 'up'],
    ['Net profit', pb.netProfit, pa.netProfit, 'up'],
    ['Customer receipts', pb.receipts, pa.receipts, 'up'],
    ['Payments out', pb.payments + pb.drawings, pa.payments + pa.drawings, 'none'],
    ['Closing cash', b.cashEnd, a.cashEnd, 'up'],
  ];
  return (
    <div className="kpis" style={{ marginBottom: 0 }}>
      {items.map(([label, v, p, good]) => (
        <div key={label} className="stack" style={{ gap: 2 }}>
          <div className="small muted">{label}</div>
          <div style={{ fontWeight: 650, fontSize: 18 }} className={v < 0 ? 'neg' : ''}>{inrCompact(v)}</div>
          <Delta value={change(v, p)} good={good} vs="vs prior week" />
        </div>
      ))}
    </div>
  );
}
