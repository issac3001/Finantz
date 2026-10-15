import { useNavigate } from 'react-router-dom';
import { comparablePL, daysInMonths, openAt, rangePL, visibleDays, visibleWeeks, weeksInMonths } from '../../finance/calc';
import { fmtDate } from '../../lib/date';
import { useStore } from '../../store/store';
import { Card, downloadCSV } from '../../components/ui';
import { useDash } from './context';
import { PL_LINES } from './ProfitLoss';

export default function Reports() {
  const d = useDash();
  const { logDownload } = useStore();
  const navigate = useNavigate();
  const slug = d.client.id;
  const stamp = d.cutoff;
  const header = [[`${d.client.name}`], [`Figures to ${fmtDate(d.cutoff)} · Demo data, fictional business`], []];

  const reports = [
    {
      name: 'Profit and loss statement',
      desc: `${d.rangeLabel} against ${d.compLabel}, every line from revenue to net profit.`,
      run: () => {
        const cur = rangePL(d.ledger, d.cutoff, d.range);
        const prev = comparablePL(d.ledger, d.cutoff, d.range, d.comp);
        downloadCSV(`${slug}-profit-and-loss-${stamp}.csv`, [...header, ['Line', d.rangeLabel, d.compLabel, 'Change'], ...PL_LINES.map(([label, k]) => [label, cur[k], prev[k], cur[k] - prev[k]])]);
      },
    },
    {
      name: d.gran === 'month' ? 'Monthly trend' : 'Quarterly trend',
      desc: 'Revenue, gross profit, expenses, net profit and closing cash for each period.',
      run: () => downloadCSV(`${slug}-trend-${stamp}.csv`, [...header, ['Period', 'Revenue', 'Cost of sales', 'Gross profit', 'Operating expenses', 'Net profit', 'Closing cash', 'Status'],
        ...d.rows.map((r) => [r.label, r.revenue, r.cogs, r.grossProfit, r.operatingExpenses, r.netProfit, r.cashEnd, r.partial ? 'Provisional' : 'Final'])]),
    },
    {
      name: 'Receivables ageing',
      desc: 'Every open customer invoice with its due date and days past due.',
      run: () => downloadCSV(`${slug}-receivables-${stamp}.csv`, [...header, ['Invoice', 'Customer', 'Issued', 'Due', 'Days past due', 'Bucket', 'Amount'],
        ...openAt(d.ledger.invoices, d.cutoff).map((i) => [i.id, i.party, i.issue, i.due, i.daysPastDue, i.bucket, i.amount])]),
    },
    {
      name: 'Payables ageing',
      desc: 'Every open supplier bill with its due date and days past due.',
      run: () => downloadCSV(`${slug}-payables-${stamp}.csv`, [...header, ['Bill', 'Supplier', 'Issued', 'Due', 'Days past due', 'Bucket', 'Amount'],
        ...openAt(d.ledger.bills, d.cutoff).map((i) => [i.id, i.party, i.issue, i.due, i.daysPastDue, i.bucket, i.amount])]),
    },
    {
      name: 'Daily cash movement',
      desc: 'Receipts, payments, drawings and closing balance for every day in the period.',
      run: () => downloadCSV(`${slug}-cash-${stamp}.csv`, [...header, ['Date', 'Received from customers', 'Paid to suppliers', 'Operating cash costs', 'Drawings', 'Closing cash'],
        ...daysInMonths(visibleDays(d.ledger, d.cutoff), d.range.from, d.range.to).map((w) => [w.date, w.receipts, w.supplierPayments, w.cashOpex, w.drawings, w.cashEnd])]),
    },
    {
      name: 'Weekly summary',
      desc: 'Revenue, cost of sales, receipts and closing cash for every published week in the period.',
      run: () => downloadCSV(`${slug}-weekly-${stamp}.csv`, [...header, ['Week ending', 'Revenue', 'Cost of sales', 'Received from customers', 'Closing cash'],
        ...weeksInMonths(visibleWeeks(d.ledger, d.cutoff), d.range.from, d.range.to).map((w) => [w.weekEnd, w.revenue, w.cogs, w.receipts, w.cashEnd])]),
    },
  ];

  return (
    <div className="grid g2">
      <Card title="Management report (PDF)" hint="Opens a print-ready report. Choose “Save as PDF” in the print dialog.">
        <p className="muted">Summary figures, profit and loss, cash and ageing for {d.rangeLabel}, with the reporting period and publication status on every page.</p>
        <button className="btn primary" onClick={() => { logDownload(d.client.id, `Management report PDF · ${d.rangeLabel}`); navigate(`${d.base}/print?from=${d.range.from}&to=${d.range.to}&compare=${d.compare}`); }}>Open printable report</button>
      </Card>
      {reports.map((r) => (
        <Card key={r.name} title={r.name} hint="CSV, opens in Excel">
          <p className="muted">{r.desc}</p>
          <button className="btn" onClick={() => { r.run(); logDownload(d.client.id, `${r.name} CSV · ${d.rangeLabel}`); }}>Download</button>
        </Card>
      ))}
    </div>
  );
}
