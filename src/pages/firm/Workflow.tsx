import { useState } from 'react';
import { clientById, staffName } from '../../data/clients';
import { getLedger } from '../../data/generate';
import { reconciliationChecks, visibleWeeks } from '../../finance/calc';
import { addDays, fmtDate, fmtDateTime } from '../../lib/date';
import { actorLabel, useStore } from '../../store/store';
import { dueDate, Status } from '../../store/workflow';
import { Card, StatusBadge } from '../../components/ui';
import { WeekCompare } from '../dash/Overview';

const STEPS: { s: Status; label: string }[] = [
  { s: 'draft', label: 'Enter and reconcile' },
  { s: 'in_review', label: 'Submit for review' },
  { s: 'approved', label: 'Approve' },
  { s: 'published', label: 'Publish to client' },
];
const ORDER: Status[] = ['not_started', 'draft', 'in_review', 'approved', 'published'];

export function WorkflowActions({ clientId, compact = false }: { clientId: string; compact?: boolean }) {
  const { update, canAct, transition, openExceptions } = useStore();
  const c = clientById(clientId)!;
  const u = update(clientId);
  const [note, setNote] = useState('');
  const [returning, setReturning] = useState(false);
  const cls = compact ? 'btn small' : 'btn';
  const open = openExceptions(clientId);

  if (!c.active) return <span className="muted small">Inactive</span>;
  return (
    <div className="row">
      {u.status === 'not_started' && <button className={`${cls} primary`} disabled={!canAct(c, 'draft')} onClick={() => transition(clientId, 'draft')}>Start update</button>}
      {u.status === 'draft' && (
        <button className={`${cls} primary`} disabled={!canAct(c, 'in_review')} title={open ? `${open} open exceptions must be resolved first` : undefined} onClick={() => transition(clientId, 'in_review')}>
          Submit for review{open ? ` (${open} open)` : ''}
        </button>
      )}
      {u.status === 'in_review' && (
        <>
          <button className={`${cls} primary`} disabled={!canAct(c, 'approved')} onClick={() => transition(clientId, 'approved')}>Approve</button>
          {!compact && !returning && <button className={cls} disabled={!canAct(c, 'draft')} onClick={() => setReturning(true)}>Return for changes</button>}
        </>
      )}
      {u.status === 'approved' && <button className={`${cls} primary`} disabled={!canAct(c, 'published')} onClick={() => transition(clientId, 'published')}>Publish</button>}
      {u.status === 'published' && <span className="small muted">Live for client</span>}
      {returning && (
        <div className="stack" style={{ width: '100%' }}>
          <textarea className="textarea" placeholder="What needs to change?" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="row">
            <button className="btn primary" disabled={!note.trim()} onClick={() => { transition(clientId, 'draft', note.trim()); setReturning(false); setNote(''); }}>Send back</button>
            <button className="btn" onClick={() => setReturning(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Workflow({ clientId }: { clientId: string }) {
  const { update, currentWeek, today, exceptions, resolveException, persona, audit } = useStore();
  const c = clientById(clientId)!;
  const u = update(clientId);
  const l = getLedger(c, currentWeek);
  const checks = reconciliationChecks(l, currentWeek);
  const ex = exceptions(clientId);
  const weeks = visibleWeeks(l, currentWeek);
  const overdue = today > dueDate(currentWeek) && u.status !== 'published';
  const staffSignedIn = persona?.kind === 'staff';
  const idx = ORDER.indexOf(u.status);
  const trail = audit.filter((a) => a.clientId === clientId && a.action !== 'Signed in').slice(0, 12);

  return (
    <div className="grid g-2-1">
      <div className="stack" style={{ gap: 16 }}>
        <Card title={`Update for week ${fmtDate(addDays(currentWeek, -6))} – ${fmtDate(currentWeek)}`} right={<StatusBadge status={u.status} overdue={overdue} />}>
          <div className="meta" style={{ marginBottom: 14 }}>
            <span>Prepared by <b>{staffName(c.accountantId)}</b></span>
            <span>Due <b>{fmtDate(dueDate(currentWeek))}</b></span>
            <span>Last change <b>{fmtDateTime(u.updatedAt)}</b> by <b>{actorLabel(u.updatedBy)}</b></span>
          </div>
          <div className="statusbar" style={{ marginBottom: 8 }}>
            {STEPS.map((s) => <div key={s.s} style={{ flex: 1, background: ORDER.indexOf(s.s) <= idx ? 'var(--brand)' : 'var(--brand-100)' }} />)}
          </div>
          <div className="row small muted" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
            {STEPS.map((s) => <span key={s.s}>{s.label}</span>)}
          </div>
          {u.note && u.status === 'draft' && <div className="banner amber"><b>Returned by reviewer:</b> {u.note}</div>}
          <WorkflowActions clientId={clientId} />
          {!c.active && <p className="small muted">This client is inactive, so no weekly updates are prepared.</p>}
          {staffSignedIn && c.active && <p className="drawer-note">Accountants prepare and submit their own clients. Only the administrator can approve, return or publish.</p>}
        </Card>

        <Card title="Exceptions" hint="Must be cleared before submission">
          {ex.length === 0 && <div className="muted">No exceptions raised this week.</div>}
          <div className="alerts">
            {ex.map((e) => (
              <div key={e.id} className={`alert ${e.resolvedBy ? '' : e.kind === 'Bank reconciliation' ? 'red' : 'amber'}`}>
                <div className="icon" style={e.resolvedBy ? { background: 'var(--brand)', color: '#fff' } : undefined}>{e.resolvedBy ? '✓' : '!'}</div>
                <div style={{ flex: 1 }}>
                  <div className="t">{e.kind}</div>
                  <div className="d">{e.text}{e.resolvedBy && ` · resolved by ${actorLabel(e.resolvedBy)}`}</div>
                </div>
                {!e.resolvedBy && (u.status === 'draft' || u.status === 'not_started') && (
                  <button className="btn small" disabled={!staffSignedIn || u.status === 'not_started'} onClick={() => resolveException(clientId, e.id)}>Mark resolved</button>
                )}
              </div>
            ))}
          </div>
        </Card>

        {weeks.length > 1 && (
          <Card title="This week against last week" hint="Figures awaiting publication">
            <WeekCompare a={weeks[weeks.length - 2]} b={weeks[weeks.length - 1]} />
          </Card>
        )}
      </div>

      <div className="stack" style={{ gap: 16 }}>
        <Card title="Reconciliation checks" hint="Computed from the ledger">
          {checks.map((ch) => (
            <div className="check" key={ch.label}>
              <span className={`tick ${ch.ok ? '' : 'bad'}`}>{ch.ok ? '✓' : '✕'}</span>
              {ch.label}
            </div>
          ))}
        </Card>
        <Card title="Activity" hint="Audit trail for this client">
          {trail.length === 0 && <div className="muted small">No recorded activity yet.</div>}
          <div className="stack">
            {trail.map((a) => (
              <div key={a.id} className="small">
                <b>{a.action}</b> · {actorLabel(a.actor)}
                <div className="muted">{fmtDateTime(a.at)} · {a.detail}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
