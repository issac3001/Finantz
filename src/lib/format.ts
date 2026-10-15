// Currency formatting. The demo uses Indian rupees with lakh/crore grouping.

const full = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export const inr = (n: number) => full.format(Math.round(n));

export function inrCompact(n: number): string {
  const a = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (a >= 1e7) return `${sign}₹${(a / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `${sign}₹${(a / 1e5).toFixed(1)} L`;
  if (a >= 1e3) return `${sign}₹${(a / 1e3).toFixed(1)} K`;
  return `${sign}₹${a.toFixed(0)}`;
}

export const pct = (n: number | null, digits = 1) =>
  n === null || !isFinite(n) ? '—' : `${n >= 0 ? '' : '−'}${Math.abs(n * 100).toFixed(digits)}%`;

export const signedPct = (n: number | null, digits = 1) =>
  n === null || !isFinite(n) ? '—' : `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n * 100).toFixed(digits)}%`;

export const days = (n: number | null) => (n === null || !isFinite(n) ? '—' : `${Math.round(n)} days`);
