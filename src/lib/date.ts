// All dates are ISO 'YYYY-MM-DD' strings handled in UTC to avoid timezone drift.

export type ISODate = string;
const DAY = 86400000;

export const toDate = (s: ISODate) => new Date(s + 'T00:00:00Z');
export const toISO = (d: Date): ISODate => d.toISOString().slice(0, 10);
export const addDays = (s: ISODate, n: number): ISODate => toISO(new Date(toDate(s).getTime() + n * DAY));
export const diffDays = (a: ISODate, b: ISODate) => Math.round((toDate(a).getTime() - toDate(b).getTime()) / DAY);
export const monthKey = (s: ISODate) => s.slice(0, 7);

export function todayISO(): ISODate {
  const now = new Date();
  return toISO(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

/** Most recent fully completed week (weeks run Monday to Sunday). */
export function lastCompletedWeekEnd(today: ISODate): ISODate {
  const dow = toDate(today).getUTCDay();
  return addDays(today, -(dow === 0 ? 7 : dow));
}

/** Indian financial year starts 1 April. Returns the FY start year for a month key. */
export function fyStartYear(mk: string): number {
  const [y, m] = mk.split('-').map(Number);
  return m >= 4 ? y : y - 1;
}

export function addMonths(mk: string, n: number): string {
  const [y, m] = mk.split('-').map(Number);
  const idx = y * 12 + (m - 1) + n;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`;
}

export function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let m = from; m <= to; m = addMonths(m, 1)) out.push(m);
  return out;
}

export function quarterKey(mk: string): string {
  const fy = fyStartYear(mk);
  const m = Number(mk.slice(5, 7));
  const q = Math.floor(((m + 8) % 12) / 3) + 1;
  return `FY${String(fy + 1).slice(2)} Q${q}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const monthLabel = (mk: string, withYear = true) =>
  MONTHS[Number(mk.slice(5, 7)) - 1] + (withYear ? ` ${mk.slice(2, 4)}` : '');

export function fmtDate(s: ISODate | null | undefined): string {
  if (!s) return '—';
  const d = toDate(s);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function monthEnd(mk: string): ISODate {
  return addDays(`${addMonths(mk, 1)}-01`, -1);
}

/** Same day n months away, clamped to the length of the target month. */
export function shiftMonthsDate(d: ISODate, n: number): ISODate {
  const mk = addMonths(monthKey(d), n);
  const end = monthEnd(mk);
  const day = Math.min(Number(d.slice(8, 10)), Number(end.slice(8, 10)));
  return `${mk}-${String(day).padStart(2, '0')}`;
}
