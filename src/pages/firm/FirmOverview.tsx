import { useNavigate } from 'react-router-dom';
import { STAFF } from '../../data/clients';
import { addDays, fmtDate } from '../../lib/date';
import { inrCompact } from '../../lib/format';
import { useStore } from '../../store/store';
import { dueDate, Status, STATUS_LABEL } from '../../store/workflow';
import { Card, Kpi, StatusBadge } from '../../components/ui';
import { usePortfolio } from './portfolio';

const STATUS_COLOR: Record<Status, string> = {
  published: 'var(--brand)',
  approved: '#7e9ee6',
  in_review: 'var(--amber-mark)',
  draft: '#c3cad8',
  not_started: '#e5e9f0',
};

export default function FirmOverview() {
  const rows = usePortfolio();
  const { currentWeek, persona, today } = useStore();
  const navigate = useNavigate();
  const me = persona?.kind === 'staff' ? STAFF.find((s) => s.id === persona.staffId) : undefined;
  const active = rows.filter((r) => r.c.active);
  const count = (s: Status) => active.filter((r) => r.u.status === s).length;
  const overdue = active.filter((r) => r.overdue);
  const exceptions = active.reduce((a, r) => a + r.open, 0);
  const redFlags = active.filter((r) => r.flags.some((f) => f.level === 'red'));
  const team = STAFF.filter((s) => s.role === 'accountant' && (me?.role === 'admin' || s.id === me?.id));
  const attention = [
    ...overdue.map((r) => ({ r, kind: 'Overdue update', text: `${STATUS_LABEL[r.u.status]}, was due ${fmtDate(dueDate(currentWeek))}`, tone: 'red' as const })),
    ...active.filter((r) => r.open > 0).map((r) => ({ r, kind: `${r.open} open exception${r.open > 1 ? 's' : ''}`, text: 'Blocking submission for review', tone: 'amber' as const })),
    ...redFlags.map((r) => ({ r, kind: r.flags[0].title, text: r.flags[0].detail, tone: 'red' as const })),
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{me?.role === 'admin' ? 'Practice overview' : 'My clients'}</h1>
          <div className="sub">Weekly cycle for transactions to {fmtDate(currentWeek)} · updates due {fmtDate(dueDate(currentWeek))}{today > dueDate(currentWeek) ? ' (passed)' : ''}</div>
        </div>
      </div>

      <div className="kpis">
        <Kpi label="Clients" value={rows.length} foot={`${active.length} active · ${rows.length - active.length} inactive`} />
        <Kpi label="Published this week" value={`${count('published')} / ${active.length}`} foot={`${Math.round((count('published') / Math.max(active.length, 1)) * 100)}% of active clients`} />
        <Kpi label="Awaiting review" value={count('in_review')} foot={`${count('approved')} approved, not yet published`} tone={count('in_review') > 0 ? 'warn' : undefined} />
        <Kpi label="Overdue updates" value={overdue.length} tone={overdue.length ? 'adverse' : undefined} foot={`Due ${fmtDate(dueDate(currentWeek))}`} />
        <Kpi label="Open exceptions" value={exceptions} foot="Reconciliations, documents, queries" tone={exceptions ? 'warn' : undefined} />
        <Kpi label="Clients with red flags" value={redFlags.length} foot="Loss, overdraft or old receivables" tone={redFlags.length ? 'adverse' : undefined} />
      </div>

      <Card title="This week's publication status" hint={`${active.length} active clients`}>
        <div className="statusbar" style={{ height: 14 }}>
          {(['published', 'approved', 'in_review', 'draft', 'not_started'] as Status[]).map((s) => count(s) > 0 && (
            <div key={s} title={`${STATUS_LABEL[s]}: ${count(s)}`} style={{ flex: count(s), background: STATUS_COLOR[s] }} />
          ))}
        </div>
        <div className="legend" style={{ marginTop: 10 }}>
          {(['published', 'approved', 'in_review', 'draft', 'not_started'] as Status[]).map((s) => (
            <span key={s}><i style={{ background: STATUS_COLOR[s] }} />{STATUS_LABEL[s]} · {count(s)}</span>
          ))}
        </div>
      </Card>

      <div className="grid g2 mt">
        <Card title="Team workload" hint="Active clients this week">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Accountant</th><th className="num">Clients</th><th className="num">Published</th><th className="num">In review</th><th className="num">Preparing</th><th className="num">Overdue</th><th className="num">Exceptions</th></tr></thead>
              <tbody>
                {team.map((s) => {
                  const mine = active.filter((r) => r.c.accountantId === s.id);
                  return (
                    <tr key={s.id} className="clickable" onClick={() => navigate(`/firm/clients?accountant=${s.id}`)}>
                      <td>{s.name}</td>
                      <td className="num">{mine.length}</td>
                      <td className="num">{mine.filter((r) => r.u.status === 'published').length}</td>
                      <td className="num">{mine.filter((r) => r.u.status === 'in_review').length}</td>
                      <td className="num">{mine.filter((r) => r.u.status === 'draft' || r.u.status === 'not_started').length}</td>
                      <td className={`num ${mine.some((r) => r.overdue) ? 'neg' : ''}`}>{mine.filter((r) => r.overdue).length}</td>
                      <td className="num">{mine.reduce((a, r) => a + r.open, 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Needs attention" hint={`${attention.length} items`}>
          <div className="alerts" style={{ maxHeight: 340, overflowY: 'auto' }}>
            {attention.length === 0 && <div className="muted">Nothing needs attention.</div>}
            {attention.map((a, i) => (
              <div key={i} className={`alert ${a.tone}`} style={{ cursor: 'pointer' }} onClick={() => navigate(`/firm/clients/${a.r.c.id}/workflow`)}>
                <div className="icon">{a.tone === 'red' ? '!' : '•'}</div>
                <div><div className="t">{a.r.c.name}</div><div className="d">{a.kind}. {a.text}</div></div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Upcoming deadlines" className="mt">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Deadline</th><th>What</th><th>Clients</th></tr></thead>
            <tbody>
              <tr><td>{fmtDate(dueDate(currentWeek))}</td><td>Weekly update for transactions to {fmtDate(currentWeek)}</td><td>{active.length - count('published')} still to publish</td></tr>
              <tr><td>{fmtDate(dueDate(addDays(currentWeek, 7)))}</td><td>Weekly update for transactions to {fmtDate(addDays(currentWeek, 7))}</td><td>{active.length} clients</td></tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Largest clients by recent revenue" hint="Last 13 published weeks" className="mt">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Client</th><th>This week</th><th className="num">Revenue</th><th className="num">Cash</th><th className="num">Receivables</th></tr></thead>
            <tbody>
              {[...active].sort((a, b) => b.revenue13 - a.revenue13).slice(0, 8).map((r) => (
                <tr key={r.c.id} className="clickable" onClick={() => navigate(`/firm/clients/${r.c.id}`)}>
                  <td>{r.c.name}</td>
                  <td><StatusBadge status={r.u.status} overdue={r.overdue} /></td>
                  <td className="num">{inrCompact(r.revenue13)}</td>
                  <td className={`num ${r.cash < 0 ? 'neg' : ''}`}>{inrCompact(r.cash)}</td>
                  <td className="num">{inrCompact(r.ar)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
