import { useMemo, useState } from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Doc } from '../../data/generate';
import { ageing, Bucket, BUCKETS, byParty, openAt, total } from '../../finance/calc';
import { fmtDate } from '../../lib/date';
import { inr, inrCompact, pct } from '../../lib/format';
import { Card, ChartTip, Seg } from '../../components/ui';
import { AXIS, useDash } from './context';
import { BUCKET_COLORS } from './Overview';

export const Receivables = () => <DocsView kind="receivable" />;
export const Payables = () => <DocsView kind="payable" />;

function DocsView({ kind }: { kind: 'receivable' | 'payable' }) {
  const d = useDash();
  const docs: Doc[] = kind === 'receivable' ? d.ledger.invoices : d.ledger.bills;
  const items = useMemo(() => openAt(docs, d.cutoff), [docs, d.cutoff]);
  const [bucket, setBucket] = useState<Bucket | 'all'>('all');
  const [q, setQ] = useState('');
  const [party, setParty] = useState<string | null>(null);
  const party1 = kind === 'receivable' ? 'Customer' : 'Supplier';
  const buckets = ageing(items);
  const sum = total(items);
  const overdue = total(items.filter((i) => i.daysPastDue > 0));
  const parties = byParty(items);
  const shown = items.filter((i) => (bucket === 'all' || i.bucket === bucket) && (!party || i.party === party) && (q === '' || `${i.id} ${i.party}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <>
      <div className="kpis">
        <div className="card kpi"><div className="label">Total {kind === 'receivable' ? 'receivables' : 'payables'}</div><div className="value">{inrCompact(sum)}</div><div className="delta"><span className="vs">{items.length} open {kind === 'receivable' ? 'invoices' : 'bills'} at {fmtDate(d.cutoff)}</span></div></div>
        <div className={`card kpi ${overdue / Math.max(sum, 1) > 0.4 ? 'warn' : ''}`}><div className="label">Overdue</div><div className="value">{inrCompact(overdue)}</div><div className="delta"><span className="vs">{pct(overdue / Math.max(sum, 1), 0)} of the total</span></div></div>
        <div className={`card kpi ${buckets[4].amount / Math.max(sum, 1) > 0.15 ? 'adverse' : ''}`}><div className="label">Over 90 days past due</div><div className="value">{inrCompact(buckets[4].amount)}</div><div className="delta"><span className="vs">{buckets[4].count} {kind === 'receivable' ? 'invoices' : 'bills'}</span></div></div>
        <div className="card kpi"><div className="label">Largest {party1.toLowerCase()}</div><div className="value" style={{ fontSize: 16 }}>{parties[0]?.party ?? '—'}</div><div className="delta"><span className="vs">{parties[0] ? `${inrCompact(parties[0].amount)} · ${pct(parties[0].amount / sum, 0)} of total` : ''}</span></div></div>
      </div>

      <div className="grid g2">
        <Card title="Ageing" hint="Click a bar to filter the list">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={buckets.map((b) => ({ label: b.bucket, Amount: b.amount }))} layout="vertical" margin={{ left: 0, right: 12 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" tick={AXIS} tickLine={false} axisLine={false} width={92} />
              <Tooltip content={<ChartTip fmt={inr} />} cursor={{ fill: '#f1f4f9' }} />
              <Bar dataKey="Amount" radius={[0, 4, 4, 0]} maxBarSize={20} onClick={(p: { label?: string }) => setBucket((p.label as Bucket) ?? 'all')} style={{ cursor: 'pointer' }}>
                {buckets.map((b, i) => <Cell key={b.bucket} fill={BUCKET_COLORS[i]} fillOpacity={bucket === 'all' || bucket === b.bucket ? 1 : 0.35} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title={`By ${party1.toLowerCase()}`} hint="Click a row to filter the list">
          <div className="table-wrap" style={{ maxHeight: 240, overflowY: 'auto' }}>
            <table>
              <thead><tr><th>{party1}</th><th className="num">Open</th><th className="num">Overdue</th><th className="num">Over 90 days</th></tr></thead>
              <tbody>
                {parties.map((p) => (
                  <tr key={p.party} className="clickable" onClick={() => setParty(party === p.party ? null : p.party)} style={party === p.party ? { background: 'var(--brand-50)' } : undefined}>
                    <td>{p.party}</td>
                    <td className="num">{inr(p.amount)}</td>
                    <td className="num">{inr(p.overdue)}</td>
                    <td className={`num ${p.over90 > 0 ? 'neg' : ''}`}>{inr(p.over90)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card title={kind === 'receivable' ? 'Outstanding invoices' : 'Outstanding bills'} className="mt"
        right={<span className="small muted">{shown.length} shown · {inr(total(shown))}</span>}>
        <div className="filters">
          <input className="input" placeholder={`Search ${party1.toLowerCase()} or number`} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
          <Seg label="Ageing bucket" options={[{ id: 'all' as const, label: 'All' }, ...BUCKETS.map((b) => ({ id: b, label: b }))]} value={bucket} onChange={setBucket} />
          {party && <button className="btn small" onClick={() => setParty(null)}>{party} ✕</button>}
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Number</th><th>{party1}</th><th>Issued</th><th>Due</th><th className="num">Days past due</th><th className="num">Amount</th></tr></thead>
            <tbody>
              {shown.slice(0, 200).map((i) => (
                <tr key={i.id}>
                  <td>{i.id}</td>
                  <td>{i.party}</td>
                  <td>{fmtDate(i.issue)}</td>
                  <td>{fmtDate(i.due)}</td>
                  <td className="num">{i.daysPastDue > 0 ? <span className={`badge ${i.daysPastDue > 90 ? 'red' : i.daysPastDue > 30 ? 'amber' : ''}`}>{i.daysPastDue}</span> : <span className="muted">Not due</span>}</td>
                  <td className="num">{inr(i.amount)}</td>
                </tr>
              ))}
              {shown.length === 0 && <tr><td colSpan={6} className="empty">Nothing matches these filters.</td></tr>}
            </tbody>
          </table>
        </div>
        {shown.length > 200 && <p className="small muted">Showing the first 200. Download the full list from Reports.</p>}
      </Card>
    </>
  );
}
