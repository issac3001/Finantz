import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CLIENTS, STAFF } from '../data/clients';
import { initials } from '../components/ui';
import { useStore } from '../store/store';

const LOGO = `${import.meta.env.BASE_URL}finantz-logo.png`;

export default function SignIn() {
  const { signIn, reset } = useStore();
  const navigate = useNavigate();
  const [clientId, setClientId] = useState(CLIENTS[0].id);
  const featured = ['lotus-bay-interiors', 'copperleaf-foods', 'saffron-table-restaurants'].map((id) => CLIENTS.find((c) => c.id === id)!);

  return (
    <div className="login">
      <div className="hero">
        <img src={LOGO} alt="Finantz" />
        <div>
          <h1>Your numbers, reviewed by accountants and ready every week.</h1>
          <p>Finantz turns your books into a clear view of revenue, profit, cash, receivables and payables, published after review by your accounting team.</p>
        </div>
        <p className="small">Demonstration build. Every business, person and figure shown is fictional.</p>
      </div>
      <div className="panel">
        <div>
          <h1>Choose a demo user</h1>
          <p className="muted">This demo has no passwords. Pick a role to see the experience that user gets. Production sign-in, server-side permissions and tenant isolation are not built yet.</p>
        </div>
        <div className="stack">
          <div className="small muted">Finantz team</div>
          {STAFF.slice(0, 3).map((s) => (
            <button key={s.id} className="persona" onClick={() => { signIn({ kind: 'staff', staffId: s.id }); navigate('/firm'); }}>
              <div className="avatar">{initials(s.name)}</div>
              <div><div className="n">{s.name}</div><div className="r">{s.role === 'admin' ? 'Administrator · approves and publishes' : `${s.title} · prepares assigned clients`}</div></div>
            </button>
          ))}
        </div>
        <div className="stack">
          <div className="small muted">Client business owner</div>
          {featured.map((c) => (
            <button key={c.id} className="persona" onClick={() => { signIn({ kind: 'client', clientId: c.id }); navigate(`/client/${c.id}`); }}>
              <div className="avatar">{initials(c.owner)}</div>
              <div><div className="n">{c.owner}</div><div className="r">{c.name} · {c.industry}</div></div>
            </button>
          ))}
          <div className="row">
            <select className="select" style={{ flex: 1 }} value={clientId} onChange={(e) => setClientId(e.target.value)} aria-label="Any client">
              {CLIENTS.filter((c) => c.active).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button className="btn primary" onClick={() => { signIn({ kind: 'client', clientId }); navigate(`/client/${clientId}`); }}>Open as owner</button>
          </div>
        </div>
        <button className="btn ghost small" style={{ alignSelf: 'flex-start' }} onClick={() => { if (confirm('Reset all demo changes made in this browser?')) reset(); }}>Reset demo data</button>
      </div>
    </div>
  );
}
