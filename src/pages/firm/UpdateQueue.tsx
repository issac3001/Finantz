import { useState } from 'react';
import { Link } from 'react-router-dom';
import { STAFF, staffName } from '../../data/clients';
import { addDays, fmtDate, fmtDateTime } from '../../lib/date';
import { actorLabel, useStore } from '../../store/store';
import { dueDate, Status, STATUS_LABEL } from '../../store/workflow';
import { Card, Seg, StatusBadge } from '../../components/ui';
import { usePortfolio } from './portfolio';
import { WorkflowActions } from './Workflow';

export default function UpdateQueue() {
  const rows = usePortfolio().filter((r) => r.c.active);
  const { currentWeek, persona, transition, canAct } = useStore();
  const isAdmin = persona?.kind === 'staff' && STAFF.find((s) => s.id === persona.staffId)?.role === 'admin';
  const [tab, setTab] = useState<Status | 'all'>('all');
  const shown = rows.filter((r) => tab === 'all' || r.u.status === tab);
  const approved = rows.filter((r) => r.u.status === 'approved' && canAct(r.c, 'published'));
  const count = (s: Status) => rows.filter((r) => r.u.status === s).length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Weekly updates</h1>
          <div className="sub">Transactions {fmtDate(addDays(currentWeek, -6))} to {fmtDate(currentWeek)} · due {fmtDate(dueDate(currentWeek))}</div>
        </div>
        {isAdmin && (
          <div className="actions">
            <button className="btn primary" disabled={approved.length === 0} onClick={() => approved.forEach((r) => transition(r.c.id, 'published'))}>
              Publish all approved ({approved.length})
            </button>
          </div>
        )}
      </div>
      <div className="banner">
        Workflow: enter and reconcile → submit for review → approve → publish. Publishing makes the week visible on the client's dashboard, notifies the client and records a version in the audit trail.
      </div>
      <div className="filters">
        <Seg label="Status" value={tab} onChange={setTab} options={[{ id: 'all' as const, label: `All · ${rows.length}` }, ...(['not_started', 'draft', 'in_review', 'approved', 'published'] as Status[]).map((s) => ({ id: s, label: `${STATUS_LABEL[s]} · ${count(s)}` }))]} />
      </div>
      <Card>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Client</th><th>Accountant</th><th>Status</th><th>Exceptions</th><th>Last change</th><th>Action</th></tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.c.id}>
                  <td><Link to={`/firm/clients/${r.c.id}/workflow`} style={{ fontWeight: 600 }}>{r.c.name}</Link></td>
                  <td>{staffName(r.c.accountantId)}</td>
                  <td><StatusBadge status={r.u.status} overdue={r.overdue} /></td>
                  <td>{r.open > 0 ? <span className="badge amber">{r.open} open</span> : <span className="muted small">None</span>}</td>
                  <td className="small"><div>{fmtDateTime(r.u.updatedAt)}</div><div className="muted">{actorLabel(r.u.updatedBy)}</div></td>
                  <td><WorkflowActions clientId={r.c.id} compact /></td>
                </tr>
              ))}
              {shown.length === 0 && <tr><td colSpan={6} className="empty">No updates in this state.</td></tr>}
            </tbody>
          </table>
        </div>
        {!isAdmin && <p className="small muted">You can start, reconcile and submit your own clients. Approval and publishing are done by the administrator.</p>}
      </Card>
    </>
  );
}
