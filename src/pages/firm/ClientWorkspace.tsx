import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { clientById, staffName } from '../../data/clients';
import { fmtDate } from '../../lib/date';
import { useStore } from '../../store/store';
import { Seg } from '../../components/ui';
import { ClientDashboard } from '../dash/ClientDashboard';
import Workflow from './Workflow';
import { useVisibleClients } from './portfolio';

export default function ClientWorkspace() {
  const { id = '' } = useParams();
  const { publishedThrough, currentWeek } = useStore();
  const [view, setView] = useState<'published' | 'draft'>('published');
  const visible = useVisibleClients();
  const c = clientById(id);
  if (!c || !visible.some((v) => v.id === c.id)) {
    return <div className="empty">This client does not exist or is not assigned to you. <Link to="/firm/clients">Back to clients</Link></div>;
  }
  const pt = publishedThrough(c.id);
  const hasDraft = c.active && pt < currentWeek;
  const cutoff = view === 'draft' && hasDraft ? currentWeek : pt;

  return (
    <>
      <div className="row" style={{ marginBottom: 12, justifyContent: 'space-between' }}>
        <div className="small muted"><Link to="/firm/clients">Clients</Link> / {c.name} · Accountant {staffName(c.accountantId)} · Owner {c.owner}</div>
        {hasDraft && (
          <Seg label="Figures shown" value={view} onChange={setView} options={[
            { id: 'published', label: `As the client sees it (to ${fmtDate(pt)})` },
            { id: 'draft', label: `Include unpublished week (to ${fmtDate(currentWeek)})` },
          ]} />
        )}
      </div>
      {cutoff !== pt && <div className="banner amber"><b>Internal preview.</b> These figures include the week to {fmtDate(currentWeek)}, which has not been published. The client cannot see it yet.</div>}
      <ClientDashboard key={cutoff} client={c} cutoff={cutoff} base={`/firm/clients/${c.id}`} isFirm
        extraTabs={[{ id: 'workflow', label: "This week's update" }]} extra={{ workflow: <Workflow clientId={c.id} /> }} />
    </>
  );
}
