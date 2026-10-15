import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { STAFF, staffName } from '../../data/clients';
import { fmtDate, fmtDateTime } from '../../lib/date';
import { inrCompact } from '../../lib/format';
import { useStore } from '../../store/store';
import { Status, STATUS_LABEL } from '../../store/workflow';
import { Card, StatusBadge } from '../../components/ui';
import { PortfolioRow, usePortfolio } from './portfolio';

type SortKey = 'name' | 'accountant' | 'status' | 'published' | 'revenue' | 'cash' | 'flags';

export default function ClientsList() {
  const rows = usePortfolio();
  const navigate = useNavigate();
  const { persona } = useStore();
  const isAdmin = persona?.kind === 'staff' && STAFF.find((s) => s.id === persona.staffId)?.role === 'admin';
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [active, setActive] = useState<'active' | 'inactive' | 'all'>('active');
  const [status, setStatus] = useState<Status | 'all'>('all');
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: 'name', dir: 1 });
  const accountant = params.get('accountant') ?? 'all';

  const val = (r: PortfolioRow, k: SortKey): string | number => {
    switch (k) {
      case 'name': return r.c.name;
      case 'accountant': return staffName(r.c.accountantId);
      case 'status': return Object.keys(STATUS_LABEL).indexOf(r.u.status);
      case 'published': return r.publishedThrough;
      case 'revenue': return r.revenue13;
      case 'cash': return r.cash;
      case 'flags': return r.flags.filter((f) => f.level === 'red').length * 10 + r.flags.length;
    }
  };

  const shown = rows
    .filter((r) => active === 'all' || (active === 'active') === r.c.active)
    .filter((r) => accountant === 'all' || r.c.accountantId === accountant)
    .filter((r) => status === 'all' || r.u.status === status)
    .filter((r) => !q || `${r.c.name} ${r.c.industry} ${r.c.city} ${r.c.owner}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => {
      const x = val(a, sort.k), y = val(b, sort.k);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });

  const Th = ({ k, children, num }: { k: SortKey; children: string; num?: boolean }) => (
    <th className={`sortable ${num ? 'num' : ''}`} onClick={() => setSort({ k, dir: sort.k === k ? (-sort.dir as 1 | -1) : 1 })} aria-sort={sort.k === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      {children}{sort.k === k ? (sort.dir === 1 ? ' ↑' : ' ↓') : ''}
    </th>
  );

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Clients</h1>
          <div className="sub">{isAdmin ? 'All clients of the practice' : 'Clients assigned to you'}</div>
        </div>
      </div>
      <Card>
        <div className="filters">
          <input className="input" style={{ flex: '1 1 220px' }} placeholder="Search name, industry, city or owner" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search clients" />
          {isAdmin && (
            <select className="select" value={accountant} onChange={(e) => { const p = new URLSearchParams(params); if (e.target.value === 'all') p.delete('accountant'); else p.set('accountant', e.target.value); setParams(p); }} aria-label="Accountant">
              <option value="all">All accountants</option>
              {STAFF.filter((s) => s.role === 'accountant').map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value as Status | 'all')} aria-label="Update status">
            <option value="all">Any update status</option>
            {(Object.keys(STATUS_LABEL) as Status[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <select className="select" value={active} onChange={(e) => setActive(e.target.value as typeof active)} aria-label="Client status">
            <option value="active">Active clients</option>
            <option value="inactive">Inactive clients</option>
            <option value="all">All clients</option>
          </select>
          <span className="small muted">{shown.length} shown</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <Th k="name">Client</Th>
                <Th k="accountant">Accountant</Th>
                <Th k="status">This week</Th>
                <Th k="published">Published to</Th>
                <Th k="revenue" num>Revenue (13 wks)</Th>
                <Th k="cash" num>Cash</Th>
                <Th k="flags">Flags</Th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.c.id} className="clickable" onClick={() => navigate(`/firm/clients/${r.c.id}`)}>
                  <td><div style={{ fontWeight: 600 }}>{r.c.name}</div><div className="small muted">{r.c.industry} · {r.c.city}</div></td>
                  <td>{staffName(r.c.accountantId)}</td>
                  <td>{r.c.active ? <StatusBadge status={r.u.status} overdue={r.overdue} /> : <span className="badge">Inactive</span>}{r.open > 0 && <div className="small muted">{r.open} open exception{r.open > 1 ? 's' : ''}</div>}</td>
                  <td><div>{fmtDate(r.publishedThrough)}</div>{r.lastPublishedAt && <div className="small muted">on {fmtDateTime(r.lastPublishedAt)}</div>}</td>
                  <td className="num">{inrCompact(r.revenue13)}</td>
                  <td className={`num ${r.cash < 0 ? 'neg' : ''}`}>{inrCompact(r.cash)}</td>
                  <td>
                    <div className="row" style={{ gap: 4 }}>
                      {r.flags.length === 0 && <span className="muted small">None</span>}
                      {r.flags.filter((f) => f.level === 'red').length > 0 && <span className="badge red">{r.flags.filter((f) => f.level === 'red').length} red</span>}
                      {r.flags.filter((f) => f.level === 'amber').length > 0 && <span className="badge amber">{r.flags.filter((f) => f.level === 'amber').length} amber</span>}
                    </div>
                  </td>
                </tr>
              ))}
              {shown.length === 0 && <tr><td colSpan={7} className="empty">No clients match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
