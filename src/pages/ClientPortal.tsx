import { Link, useParams } from 'react-router-dom';
import { clientById } from '../data/clients';
import { useStore } from '../store/store';
import { ClientDashboard } from './dash/ClientDashboard';

export default function ClientPortal() {
  const { id = '' } = useParams();
  const { persona, publishedThrough } = useStore();
  const c = clientById(id);
  // Demo-only check in the browser. Production needs server-side authorisation per tenant.
  if (!c || persona?.kind !== 'client' || persona.clientId !== c.id) {
    return <div className="empty">You do not have access to this business. <Link to="/">Go to your dashboard</Link></div>;
  }
  return <ClientDashboard client={c} cutoff={publishedThrough(c.id)} base={`/client/${c.id}`} isFirm={false} />;
}
