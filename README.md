# Finantz

Client-facing financial intelligence demo for Finantz: a practice workspace for the accounting team and a dashboard for each client business.

**Everything in this build is demo data.** All businesses, people and figures are fictional and generated in the browser.

## What works

- Demo sign-in as the Finantz administrator, an accountant, or a client business owner, each with its own navigation.
- Practice overview: publication status for the week, team workload, overdue updates, open exceptions, clients with red flags, deadlines.
- Client list with search, filters and sorting; client workspace with an internal preview of unpublished figures.
- Weekly update workflow: start, clear exceptions, submit for review (runs reconciliation checks), approve or return with a note, publish. Publishing notifies the client and writes to the audit log.
- Client dashboard: revenue, profit, cash, receivables and payables, with period presets, custom month ranges, monthly or quarterly view, and comparison with the previous period or the same period last year.
- Profit and loss statement, margins, cost breakdown, budget versus actual, cash movement, working-capital measures, receivables and payables ageing with drill-down.
- Downloads: CSV reports (open in Excel) and a printable management report for PDF.
- Red and yellow are used only for adverse movements and alerts.

## Not built yet

This is a demonstration front end. Before any real client data is used it needs:

- Real authentication, account recovery and session management.
- A server and database. Workflow state, notifications and the audit log currently live in the browser's local storage.
- Server-side authorisation and tenant isolation. Access checks here run in the browser only.
- Data import from spreadsheets or accounting software, and manual journal entry.

## Structure

```
src/data/       fictional clients and the synthetic ledger generator (daily rows, invoices, bills)
src/finance/    calculation logic: P&L, ageing, cash, working capital, reconciliation checks, alert rules
src/store/      demo state: personas, weekly workflow, audit log, notifications
src/pages/      practice screens (firm/) and the client dashboard (dash/)
```

Figures are derived from dated invoices, bills and daily cost accruals, so monthly totals, ageing and cash all reconcile. `npm test` checks this for every client.

## Run locally

```
npm install
npm run dev
```

## Deploy

`.github/workflows/pages.yml` builds, tests and publishes to GitHub Pages on every push to `main`. Enable it under Settings → Pages → Source: GitHub Actions.
