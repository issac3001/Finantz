import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ageing, cashAt, change, comparablePL, openAt, rangePL, total } from '../../finance/calc';
import { clientFlags } from '../../finance/insights';
import { fmtDate, fmtDateTime } from '../../lib/date';
import { inr, pct, signedPct } from '../../lib/format';
import { actorLabel, useStore } from '../../store/store';
import { Card } from '../../components/ui';
import { useDash } from './context';
import { PL_LINES } from './ProfitLoss';

export default function PrintReport() {
  const d = useDash();
  const { update } = useStore();
  const navigate = useNavigate();
  const cur = rangePL(d.ledger, d.cutoff, d.range);
  const prev = comparablePL(d.ledger, d.cutoff, d.range, d.comp);
  const ar = ageing(openAt(d.ledger.invoices, d.asAt));
  const ap = ageing(openAt(d.ledger.bills, d.asAt));
  const u = update(d.client.id, d.cutoff);
  const flags = clientFlags(d.ledger, d.cutoff);

  useEffect(() => {
    const t = setTimeout(() => window.print(), 700);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="row no-print">
        <button className="btn" onClick={() => navigate(`${d.base}/reports`)}>← Back to reports</button>
        <button className="btn primary" onClick={() => window.print()}>Print or save as PDF</button>
      </div>
      <Card title={`Management report · ${d.rangeLabel}`}>
        <div className="meta">
          <span>Business <b>{d.client.name}</b></span>
          <span>Period <b>{d.rangeLabel}</b>, compared with <b>{d.compLabel}</b></span>
          <span>Transactions to <b>{fmtDate(d.cutoff)}</b></span>
          {u.publishedAt && <span>Published <b>{fmtDateTime(u.publishedAt)}</b> by <b>{actorLabel(u.publishedBy ?? '')}</b></span>}
          <span>Source <b>Finantz weekly bookkeeping (demo data, fictional business)</b></span>
        </div>
        {d.rows.some((r) => r.partial) && <p className="small"><span className="badge amber">Provisional</span> The latest period is incomplete and may change.</p>}
      </Card>
      <Card title="Summary">
        <table>
          <tbody>
            <tr><td>Revenue</td><td className="num">{inr(cur.revenue)}</td><td className="num muted">{signedPct(change(cur.revenue, prev.revenue))}</td></tr>
            <tr><td>Gross profit ({pct(cur.grossProfit / Math.max(cur.revenue, 1))} margin)</td><td className="num">{inr(cur.grossProfit)}</td><td className="num muted">{signedPct(change(cur.grossProfit, prev.grossProfit))}</td></tr>
            <tr><td>Net profit ({pct(cur.netProfit / Math.max(cur.revenue, 1))} margin)</td><td className="num">{inr(cur.netProfit)}</td><td className="num muted">{signedPct(change(cur.netProfit, prev.netProfit))}</td></tr>
            <tr><td>Cash & bank at {fmtDate(d.asAt)}</td><td className="num">{inr(cashAt(d.ledger, d.cutoff, d.asAt))}</td><td /></tr>
            <tr><td>Receivables at {fmtDate(d.asAt)}</td><td className="num">{inr(total(ar))}</td><td /></tr>
            <tr><td>Payables at {fmtDate(d.asAt)}</td><td className="num">{inr(total(ap))}</td><td /></tr>
          </tbody>
        </table>
        {flags.length > 0 && (
          <>
            <h3 className="mt">Points to note</h3>
            <ul>{flags.map((f) => <li key={f.title}><b>{f.title}.</b> {f.detail}</li>)}</ul>
          </>
        )}
      </Card>
      <Card title="Profit and loss">
        <table>
          <thead><tr><th>Line</th><th className="num">{d.rangeLabel}</th><th className="num">{d.compLabel}</th></tr></thead>
          <tbody>
            {PL_LINES.map(([label, k, kind]) => (
              <tr key={k} className={kind === 'sub' ? 'sub' : kind === 'total' ? 'total' : ''}><td className={kind === 'indent' ? 'indent' : ''}>{label}</td><td className="num">{inr(cur[k])}</td><td className="num muted">{inr(prev[k])}</td></tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card title="Ageing">
        <table>
          <thead><tr><th>Bucket</th><th className="num">Receivables</th><th className="num">Payables</th></tr></thead>
          <tbody>
            {ar.map((b, i) => <tr key={b.bucket}><td>{b.bucket}</td><td className="num">{inr(b.amount)}</td><td className="num">{inr(ap[i].amount)}</td></tr>)}
            <tr className="total"><td>Total</td><td className="num">{inr(total(ar))}</td><td className="num">{inr(total(ap))}</td></tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}
