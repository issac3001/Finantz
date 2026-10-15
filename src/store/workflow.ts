// Weekly update workflow: status rules and the seeded starting state for the demo.

import { CLIENTS, Client } from '../data/clients';
import { addDays, diffDays, ISODate } from '../lib/date';
import { pick, rng } from '../lib/rng';

export type Status = 'not_started' | 'draft' | 'in_review' | 'approved' | 'published';

export const STATUS_LABEL: Record<Status, string> = {
  not_started: 'Not started',
  draft: 'In preparation',
  in_review: 'Awaiting review',
  approved: 'Approved',
  published: 'Published',
};

export interface WeekUpdate {
  status: Status;
  updatedAt: string;
  updatedBy: string;
  publishedAt?: string;
  publishedBy?: string;
  version: number;
  note?: string;
}

export interface Exception {
  id: string;
  kind: 'Bank reconciliation' | 'Missing document' | 'Client query';
  text: string;
}

/** Updates are due the Thursday after the week closes. */
export const dueDate = (weekEnd: ISODate) => addDays(weekEnd, 4);

/** Inactive clients stopped receiving updates six weeks before the current week. */
export const INACTIVE_LAG_WEEKS = 6;

function at(day: ISODate, hour: number, minute: number) {
  return new Date(`${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`).toISOString();
}

export function defaultUpdate(c: Client, weekEnd: ISODate, currentWeek: ISODate, today: ISODate): WeekUpdate {
  const r = rng(`wf:${c.id}:${weekEnd}`);
  const publishedAt = at(addDays(weekEnd, 2), 9 + Math.floor(r() * 8), Math.floor(r() * 60));
  if (!c.active) {
    const lastActive = addDays(currentWeek, -7 * INACTIVE_LAG_WEEKS);
    return weekEnd <= lastActive
      ? { status: 'published', updatedAt: publishedAt, updatedBy: c.accountantId, publishedAt, publishedBy: 'meera', version: 1 }
      : { status: 'not_started', updatedAt: publishedAt, updatedBy: c.accountantId, version: 0 };
  }
  if (weekEnd < currentWeek) {
    return { status: 'published', updatedAt: publishedAt, updatedBy: c.accountantId, publishedAt, publishedBy: 'meera', version: 1 };
  }
  // The seeded week progresses as the days pass, so the demo looks plausible on any day.
  const elapsed = Math.min(7, Math.max(1, diffDays(today, weekEnd)));
  const pub = Math.min(0.85, 0.08 + 0.11 * elapsed);
  const u = r();
  const status: Status = u < pub ? 'published' : u < pub + 0.1 ? 'approved' : u < pub + 0.25 ? 'in_review' : u < pub + 0.45 ? 'draft' : 'not_started';
  const touched = at(addDays(weekEnd, 1), 10 + Math.floor(r() * 7), Math.floor(r() * 60));
  return {
    status,
    updatedAt: status === 'published' ? publishedAt : touched,
    updatedBy: status === 'published' || status === 'approved' ? 'meera' : c.accountantId,
    ...(status === 'published' ? { publishedAt, publishedBy: 'meera' } : {}),
    version: status === 'published' ? 1 : 0,
  };
}

const BANKS = ['HDFC current account', 'ICICI current account', 'SBI cash-credit account', 'Axis current account'];
const DOCS = ['Bank statement', 'Purchase invoices for the week', 'Payroll register', 'Petty cash vouchers', 'Credit card statement'];
const QUERIES = ['Confirm nature of a large receipt', 'Classify a one-off supplier payment', 'Confirm whether an advance is refundable', 'Provide details of a cash withdrawal'];

/** Exceptions raised while preparing the week. Only open for updates not yet submitted. */
export function seededExceptions(c: Client, weekEnd: ISODate): Exception[] {
  const r = rng(`exc:${c.id}:${weekEnd}`);
  const out: Exception[] = [];
  const n = Math.floor(r() * 4);
  for (let i = 0; i < n; i++) {
    const k = r();
    if (k < 0.45) out.push({ id: `e${i}`, kind: 'Bank reconciliation', text: `${2 + Math.floor(r() * 9)} unmatched lines on ${pick(r, BANKS)}` });
    else if (k < 0.75) out.push({ id: `e${i}`, kind: 'Missing document', text: `${pick(r, DOCS)} not yet received from client` });
    else out.push({ id: `e${i}`, kind: 'Client query', text: pick(r, QUERIES) });
  }
  return out;
}

export const ACTIVE_CLIENTS = () => CLIENTS.filter((c) => c.active);
