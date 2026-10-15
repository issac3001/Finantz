import { ReactNode, useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clientById, STAFF } from '../data/clients';
import { fmtDate, fmtDateTime } from '../lib/date';
import { useStore } from '../store/store';
import { initials } from './ui';

const LOGO = `${import.meta.env.BASE_URL}finantz-logo.png`;

export interface NavItem { to: string; label: string; count?: number; end?: boolean }

export function Layout({ nav, children }: { nav: { group: string; items: NavItem[] }[]; children: ReactNode }) {
  const { persona, actorName, signOut, currentWeek, notices, markNoticesRead } = useStore();
  const navigate = useNavigate();
  const staff = persona?.kind === 'staff' ? STAFF.find((s) => s.id === persona.staffId) : undefined;
  const client = persona?.kind === 'client' ? clientById(persona.clientId) : undefined;
  const role = staff ? (staff.role === 'admin' ? 'Finantz administrator' : 'Finantz accountant') : client ? `Owner · ${client.name}` : '';
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const mine = client ? notices.filter((n) => n.clientId === client.id) : [];
  const unread = mine.filter((n) => !n.read).length;

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brandblock">
          <img className="logo" src={LOGO} alt="Finantz" />
          <div className="tag">{staff ? 'Practice workspace' : 'Financial intelligence'}</div>
        </div>
        <nav className="nav">
          {nav.map((g) => (
            <div key={g.group} style={{ display: 'contents' }}>
              <div className="group">{g.group}</div>
              {g.items.map((i) => (
                <NavLink key={i.to} to={i.to} end={i.end}>
                  {i.label}
                  {!!i.count && <span className="count">{i.count}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="foot">
          Demo build with fictional data.
          <br />
          Latest week closed {fmtDate(currentWeek)}.
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <img className="mobile-logo" src={LOGO} alt="Finantz" />
          <span className="demo-pill" title="All businesses, people and figures in this demo are fictional">Demo data</span>
          <div className="spacer" />
          {client && (
            <div className="bell" ref={ref}>
              <button
                className="btn ghost"
                aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
                onClick={() => {
                  setOpen(!open);
                  if (!open && unread) markNoticesRead(client.id);
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
              </button>
              {unread > 0 && <span className="dot" />}
              {open && (
                <div className="popover">
                  {mine.length === 0 && <div className="empty">No notifications yet.</div>}
                  {mine.slice(0, 8).map((n) => (
                    <div key={n.id} className={`item ${n.read ? '' : 'unread'}`}>
                      <div style={{ fontWeight: 600 }}>{n.title}</div>
                      <div className="small">{n.body}</div>
                      <div className="small muted">{fmtDateTime(n.at)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="who">
            <div className="avatar">{initials(actorName)}</div>
            <div className="name">
              <div style={{ fontWeight: 600 }}>{actorName}</div>
              <div className="small muted">{role}</div>
            </div>
            <button className="btn small" onClick={() => { signOut(); navigate('/signin'); }}>Switch user</button>
          </div>
        </header>
        <main className="page">{children}</main>
      </div>
    </div>
  );
}
