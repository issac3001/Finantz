import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { change, comparablePL, OPEX_LINES, PL, rangePL } from '../../finance/calc';
import { inr, inrCompact, pct, signedPct } from '../../lib/format';
import { Card, ChartTip, Delta, Legend } from '../../components/ui';
import { AXIS, C, useDash } from './context';

type PLLine = [label: string, key: keyof PL, kind: 'line' | 'sub' | 'total' | 'indent', good: 'up' | 'down'];

export const PL_LINES: PLLine[] = [
  ['Revenue', 'revenue', 'line', 'up'],
  ['Cost of sales', 'cogs', 'line', 'down'],
  ['Gross profit', 'grossProfit', 'sub', 'up'],
  ...OPEX_LINES.map(([k, label]) => [label, k, 'indent', 'down'] as PLLine),
  ['Operating expenses', 'operatingExpenses', 'line', 'down'],
  ['EBITDA', 'ebitda', 'sub', 'up'],
  ['Depreciation', 'depreciation', 'line', 'down'],
  ['Operating profit', 'operatingProfit', 'sub', 'up'],
  ['Interest', 'interest', 'line', 'down'],
  ['Income tax (estimated)', 'tax', 'line', 'down'],
  ['Net profit', 'netProfit', 'total', 'up'],
];

export default function ProfitLoss() {
  const d = useDash();
  const cur = rangePL(d.ledger, d.cutoff, d.range);
  const prev = comparablePL(d.ledger, d.cutoff, d.range, d.comp);
  const budgetRows = d.rows.filter((r) => r.budgetRevenue !== null);
  const hasBudget = budgetRows.length === d.rows.length && d.rows.length > 0;
  const budRev = budgetRows.reduce((a, r) => a + (r.budgetRevenue ?? 0), 0);
  const budNp = budgetRows.reduce((a, r) => a + (r.budgetNetProfit ?? 0), 0);

  const margins = d.rows.map((r) => ({
    label: r.label, partial: r.partial,
    'Gross margin': r.revenue ? r.grossProfit / r.revenue : 0,
    'Net margin': r.revenue ? r.netProfit / r.revenue : 0,
  }));
  const costs = OPEX_LINES.map(([k, label]): { label: string; Amount: number } => ({ label, Amount: cur[k] })).concat([{ label: 'Cost of sales', Amount: cur.cogs }]).sort((a, b) => b.Amount - a.Amount);
  const budget = d.rows.map((r) => ({ label: r.label, partial: r.partial, Actual: r.revenue, Budget: r.budgetRevenue ?? 0 }));

  return (
    <>
      <Card title="Profit and loss statement" hint={`${d.rangeLabel} compared with ${d.compLabel}`}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Line</th>
                <th className="num">{d.rangeLabel}</th>
                <th className="num">{d.compLabel}</th>
                <th className="num">Change</th>
                <th className="num">% of revenue</th>
              </tr>
            </thead>
            <tbody>
              {PL_LINES.map(([label, key, kind, good]) => (
                <tr key={key} className={kind === 'sub' ? 'sub' : kind === 'total' ? 'total' : ''}>
                  <td className={kind === 'indent' ? 'indent' : ''}>{label}</td>
                  <td className={`num ${cur[key] < 0 ? 'neg' : ''}`}>{inr(cur[key])}</td>
                  <td className="num muted">{inr(prev[key])}</td>
                  <td className="num"><Delta value={change(cur[key], prev[key])} good={good} /></td>
                  <td className="num muted">{cur.revenue ? pct(cur[key] / cur.revenue) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted">Income tax is estimated at 25% of weekly profit before tax for management reporting. It is not a tax computation.</p>
      </Card>

      <div className="grid g2 mt">
        <Card title="Margins" right={<Legend items={[{ label: 'Gross margin', color: C.c1, line: true }, { label: 'Net margin', color: C.c2, line: true }]} />}>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={margins} margin={{ left: 4, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} stroke={C.grid} />
              <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => pct(v, 0)} width={48} />
              <Tooltip content={<ChartTip fmt={(n) => pct(n)} />} />
              <Line dataKey="Gross margin" stroke={C.c1} strokeWidth={2} dot={{ r: 3 }} />
              <Line dataKey="Net margin" stroke={C.c2} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Where the money goes" hint={d.rangeLabel}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={costs} layout="vertical" margin={{ left: 0, right: 12 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" tick={AXIS} tickLine={false} axisLine={false} width={150} />
              <Tooltip content={<ChartTip fmt={inr} />} cursor={{ fill: '#f1f4f9' }} />
              <Bar dataKey="Amount" fill={C.c1} radius={[0, 4, 4, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {hasBudget ? (
        <Card title="Budget versus actual" hint="Revenue" className="mt" right={<Legend items={[{ label: 'Actual', color: C.c1 }, { label: 'Budget', color: C.c3 }]} />}>
          <div className="row" style={{ gap: 24, marginBottom: 8 }}>
            <div><div className="small muted">Revenue vs budget</div><b>{inrCompact(cur.revenue)}</b> of {inrCompact(budRev)} <span className={cur.revenue < budRev ? 'up-adverse' : 'ok-move'}>({signedPct(cur.revenue / budRev - 1)})</span></div>
            <div><div className="small muted">Net profit vs budget</div><b>{inrCompact(cur.netProfit)}</b> of {inrCompact(budNp)} <span className={cur.netProfit < budNp ? 'up-adverse' : 'ok-move'}>({signedPct((cur.netProfit - budNp) / Math.abs(budNp || 1))})</span></div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={budget} barGap={2} margin={{ left: 4, right: 4, top: 8 }}>
              <CartesianGrid vertical={false} stroke={C.grid} />
              <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={inrCompact} width={70} />
              <Tooltip content={<ChartTip fmt={inr} />} cursor={{ fill: '#f1f4f9' }} />
              <Bar dataKey="Actual" fill={C.c1} radius={[4, 4, 0, 0]} maxBarSize={24}>
                {budget.map((b) => <Cell key={b.label} fillOpacity={b.partial ? 0.45 : 1} />)}
              </Bar>
              <Bar dataKey="Budget" fill={C.c3} radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
          {budget.some((b) => b.partial) && <div className="small muted">The current month is part-way through, so it will sit below a full-month budget.</div>}
        </Card>
      ) : (
        <Card className="mt" title="Budget versus actual"><div className="muted">No budget is maintained for {d.client.name} for this whole period.</div></Card>
      )}

      <Card title={d.gran === 'month' ? 'Monthly trend' : 'Quarterly trend'} className="mt">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Period</th><th className="num">Revenue</th><th className="num">Gross profit</th><th className="num">Operating expenses</th><th className="num">Net profit</th><th className="num">Net margin</th><th>Status</th></tr>
            </thead>
            <tbody>
              {d.rows.map((r) => (
                <tr key={r.key}>
                  <td>{r.label}</td>
                  <td className="num">{inr(r.revenue)}</td>
                  <td className="num">{inr(r.grossProfit)}</td>
                  <td className="num">{inr(r.operatingExpenses)}</td>
                  <td className={`num ${r.netProfit < 0 ? 'neg' : ''}`}>{inr(r.netProfit)}</td>
                  <td className="num">{r.revenue ? pct(r.netProfit / r.revenue) : '—'}</td>
                  <td>{r.partial ? <span className="badge amber">Provisional</span> : <span className="badge">Final</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
