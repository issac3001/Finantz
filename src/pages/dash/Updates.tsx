import { sumPL, visibleWeeks } from '../../finance/calc';
import { addDays, fmtDate, fmtDateTime } from '../../lib/date';
import { actorLabel, useStore } from '../../store/store';
import { Card } from '../../components/ui';
import { useDash } from './context';
import { WeekCompare } from './Overview';

export default function Updates() {
  const d = useDash();
  const { history } = useStore();
  const weeks = visibleWeeks(d.ledger, d.cutoff);
  const items = history(d.client.id, 12).filter((h) => h.weekEnd <= d.cutoff);

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="banner">
        Each week the Finantz team records the week's transactions, reconciles bank accounts, reviews the figures and then publishes them here.
        The week's dates are when the transactions happened; the publication time is when the reviewed figures reached this dashboard.
      </div>
      {items.length === 0 && <div className="empty">No updates have been published in the last 12 weeks.</div>}
      {items.map(({ weekEnd, u }) => {
        const i = weeks.findIndex((w) => w.weekEnd === weekEnd);
        if (i < 1) return null;
        const pl = sumPL([weeks[i]]);
        return (
          <Card key={weekEnd} title={`Week of ${fmtDate(addDays(weekEnd, -6))} to ${fmtDate(weekEnd)}`}
            hint={u.publishedAt ? `Published ${fmtDateTime(u.publishedAt)} by ${actorLabel(u.publishedBy ?? '')} · version ${u.version}` : ''}>
            <p className="muted" style={{ marginTop: 0 }}>
              Revenue of {Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(pl.revenue)} with
              {' '}{pl.netProfit >= 0 ? 'a net profit' : 'a net loss'} of {Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.abs(pl.netProfit))} for the week.
            </p>
            <WeekCompare a={weeks[i - 1]} b={weeks[i]} />
          </Card>
        );
      })}
    </div>
  );
}
