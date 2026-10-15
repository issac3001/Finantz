import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { STAFF } from './data/clients';
import { Layout, NavItem } from './components/Layout';
import { StoreProvider, useStore } from './store/store';
import SignIn from './pages/SignIn';
import FirmOverview from './pages/firm/FirmOverview';
import ClientsList from './pages/firm/ClientsList';
import UpdateQueue from './pages/firm/UpdateQueue';
import AuditLog from './pages/firm/AuditLog';
import ClientWorkspace from './pages/firm/ClientWorkspace';
import ClientPortal from './pages/ClientPortal';
import { useVisibleClients } from './pages/firm/portfolio';

function FirmShell() {
  const { persona, update, currentWeek } = useStore();
  const clients = useVisibleClients();
  if (persona?.kind !== 'staff') return <Navigate to="/" replace />;
  const isAdmin = STAFF.find((s) => s.id === persona.staffId)?.role === 'admin';
  const pending = clients.filter((c) => c.active && update(c.id, currentWeek).status !== 'published').length;
  const nav: { group: string; items: NavItem[] }[] = [
    {
      group: 'Practice',
      items: [
        { to: '/firm', label: isAdmin ? 'Overview' : 'My overview', end: true },
        { to: '/firm/clients', label: 'Clients' },
        { to: '/firm/updates', label: 'Weekly updates', count: pending },
        ...(isAdmin ? [{ to: '/firm/audit', label: 'Audit log' }] : []),
      ],
    },
  ];
  return (
    <Layout nav={nav}>
      <Routes>
        <Route index element={<FirmOverview />} />
        <Route path="clients" element={<ClientsList />} />
        <Route path="clients/:id/:tab?" element={<ClientWorkspace />} />
        <Route path="updates" element={<UpdateQueue />} />
        <Route path="audit" element={isAdmin ? <AuditLog /> : <Navigate to="/firm" replace />} />
        <Route path="*" element={<Navigate to="/firm" replace />} />
      </Routes>
    </Layout>
  );
}

function ClientShell() {
  const { persona } = useStore();
  if (persona?.kind !== 'client') return <Navigate to="/" replace />;
  const base = `/client/${persona.clientId}`;
  const nav = [{
    group: 'My business',
    items: [
      { to: base, label: 'Overview', end: true },
      { to: `${base}/pl`, label: 'Profit & loss' },
      { to: `${base}/cash`, label: 'Cash' },
      { to: `${base}/receivables`, label: 'Receivables' },
      { to: `${base}/payables`, label: 'Payables' },
      { to: `${base}/updates`, label: 'Weekly updates' },
      { to: `${base}/reports`, label: 'Reports' },
    ],
  }];
  return (
    <Layout nav={nav}>
      <Routes>
        <Route path=":id/:tab?" element={<ClientPortal />} />
        <Route path="*" element={<Navigate to={base} replace />} />
      </Routes>
    </Layout>
  );
}

function Home() {
  const { persona } = useStore();
  if (!persona) return <Navigate to="/signin" replace />;
  return <Navigate to={persona.kind === 'staff' ? '/firm' : `/client/${persona.clientId}`} replace />;
}

export default function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/firm/*" element={<FirmShell />} />
          <Route path="/client/*" element={<ClientShell />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </StoreProvider>
  );
}
