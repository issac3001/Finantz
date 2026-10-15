import { ReactNode } from 'react';
import { signedPct } from '../lib/format';
import { Status, STATUS_LABEL } from '../store/workflow';

export function Card({ title, hint, right, children, className = '' }: { title?: ReactNode; hint?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || right) && (
        <div className="card-head">
          {title && <h2>{title}</h2>}
          {hint && <span className="hint">{hint}</span>}
          {right && <div className="right">{right}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/** good: 'up' means an increase is favourable, 'down' a decrease, 'none' neither. */
export function Delta({ value, good, vs }: { value: number | null; good: 'up' | 'down' | 'none'; vs?: string }) {
  if (value === null || !isFinite(value)) return <span className="delta"><span className="vs">{vs ? 'No comparison data' : '—'}</span></span>;
  const adverse = (good === 'up' && value < -0.005) || (good === 'down' && value > 0.005);
  const cls = good === 'none' ? 'neutral-move' : adverse ? 'up-adverse' : 'ok-move';
  const arrow = value > 0.0005 ? '▲' : value < -0.0005 ? '▼' : '■';
  return (
    <span className="delta">
      <span className={cls}>{arrow} {signedPct(value)}</span>
      {vs && <span className="vs">{vs}</span>}
    </span>
  );
}

export function Kpi({ label, value, delta, foot, tone }: { label: string; value: ReactNode; delta?: ReactNode; foot?: ReactNode; tone?: 'adverse' | 'warn' }) {
  return (
    <div className={`card kpi ${tone ?? ''}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {delta && <div className="delta">{delta}</div>}
      {foot && <div className="delta"><span className="vs">{foot}</span></div>}
    </div>
  );
}

const STATUS_TONE: Record<Status, string> = {
  not_started: '',
  draft: '',
  in_review: 'amber',
  approved: 'brand',
  published: 'solid',
};

export function StatusBadge({ status, overdue }: { status: Status; overdue?: boolean }) {
  return (
    <span className="row" style={{ gap: 4 }}>
      <span className={`badge ${STATUS_TONE[status]}`}><span className="dot" />{STATUS_LABEL[status]}</span>
      {overdue && <span className="badge red">Overdue</span>}
    </span>
  );
}

export function Seg<T extends string>({ options, value, onChange, label }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} className={o.id === value ? 'on' : ''} aria-pressed={o.id === value} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; line?: boolean }[] }) {
  return (
    <div className="legend">
      {items.map((i) => (
        <span key={i.label}><i className={i.line ? 'line' : ''} style={{ background: i.color }} />{i.label}</span>
      ))}
    </div>
  );
}

interface TipPayload { name?: string; value?: number; color?: string; payload?: Record<string, unknown>; dataKey?: string | number }

export function ChartTip({ active, payload, label, fmt }: { active?: boolean; payload?: TipPayload[]; label?: string; fmt: (n: number) => string }) {
  if (!active || !payload?.length) return null;
  const partial = payload[0]?.payload?.partial;
  return (
    <div className="tooltip">
      <div className="h">{label}{partial ? ' · provisional' : ''}</div>
      {payload.map((p) => (
        <div className="r" key={String(p.dataKey)}>
          <span><i style={{ background: p.color }} />{p.name}</span>
          <b>{fmt(Number(p.value))}</b>
        </div>
      ))}
    </div>
  );
}

export const initials = (name: string) => name.replace(/^(Dr\.|Col\.)\s*/, '').split(/\s+/).map((w) => w[0]).slice(0, 2).join('');

export function downloadCSV(filename: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => (typeof v === 'number' ? String(v) : /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const blob = new Blob(['﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
