import { useState } from 'react';
import { CLIENTS, clientById } from '../../data/clients';
import { fmtDateTime } from '../../lib/date';
import { actorLabel, useStore } from '../../store/store';
import { Card } from '../../components/ui';

export default function AuditLog() {
  const { audit } = useStore();
  const [client, setClient] = useState('all');
  const [action, setAction] = useState('all');
  const actions = [...new Set(audit.map((a) => a.action))].sort();
  const shown = audit.filter((a) => (client === 'all' || a.clientId === client) && (action === 'all' || a.action === action));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Audit log</h1>
          <div className="sub">Sign-ins, workflow changes, publications and downloads. Stored in this browser for the demo.</div>
        </div>
      </div>
      <Card>
        <div className="filters">
          <select className="select" value={client} onChange={(e) => setClient(e.target.value)} aria-label="Client">
            <option value="all">All clients</option>
            {CLIENTS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="select" value={action} onChange={(e) => setAction(e.target.value)} aria-label="Action">
            <option value="all">All actions</option>
            {actions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <span className="small muted">{shown.length} entries</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Client</th><th>Detail</th></tr></thead>
            <tbody>
              {shown.slice(0, 300).map((a) => (
                <tr key={a.id}>
                  <td className="small" style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(a.at)}</td>
                  <td>{actorLabel(a.actor)}</td>
                  <td><span className="badge">{a.action}</span></td>
                  <td>{a.clientId ? clientById(a.clientId)?.name : '—'}</td>
                  <td className="small">{a.detail}</td>
                </tr>
              ))}
              {shown.length === 0 && <tr><td colSpan={5} className="empty">No entries.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
