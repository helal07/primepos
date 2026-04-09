# Enhanced Reports — Filters, Export & Print

## Overview

Add a shared `ReportToolbar` component used by all 12 report pages, providing consistent date/payment/status filters and Export (CSV, Excel, PDF) + Print buttons. Each report will be updated to use this toolbar and pass its table data for export.

## Shared Component

### `src/components/reports/ReportToolbar.tsx` (new)

A reusable toolbar with:

- **Date range**: From/To date inputs (optional, some reports use single date)
- **Payment method filter**: Select dropdown (Cash, Card, Bank Transfer, Mobile, All)
- **Payment status filter**: Select dropdown (Paid, Due, Partial, All)
- **Export buttons**: CSV, Excel, PDF — each takes `columns[]` and `rows[][]` props
- **Print button**: Opens `window.print()` with a print-friendly stylesheet

Props interface:

```ts
interface ReportToolbarProps {
  from?: string; to?: string;
  onFromChange?: (v: string) => void; onToChange?: (v: string) => void;
  singleDate?: string; onDateChange?: (v: string) => void;
  showPaymentFilter?: boolean;
  paymentMethod?: string; onPaymentMethodChange?: (v: string) => void;
  showStatusFilter?: boolean;
  paymentStatus?: string; onPaymentStatusChange?: (v: string) => void;
  exportData: { columns: string[]; rows: (string | number)[][]; filename: string };
}
```

**Export logic** (inline in toolbar):

- **CSV**: Build CSV string from columns/rows, create Blob, trigger download
- **Excel**: Use `xlsx` — `XLSX.utils.aoa_to_sheet`, `writeFile`
- **PDF**: Use `jspdf` + `jspdf-autotable` — create table PDF with title and date
- **Print**: `window.print()` — wrap report content in a `print:` Tailwind class area

## Report Page Updates (all 12 files)

Each report page will:

1. Replace inline date inputs with `<ReportToolbar>`
2. Add payment method / status filters where relevant (sales-based reports)
3. Apply filters in the query or client-side `.filter()`
4. Pass formatted table data to `exportData` prop
5. Wrap the main content in a `print:block` div with `@media print` styles

### Per-report filter mapping:


| Report            | Date Type | Payment Method | Payment Status          |
| ----------------- | --------- | -------------- | ----------------------- |
| Profit/Loss       | range     | no             | no                      |
| Daily Summary     | single    | yes            | yes                     |
| Due Sale          | none      | no             | no (fixed: due/partial) |
| Product Profit    | range     | no             | no                      |
| Purchase & Sale   | range     | yes            | yes                     |
| Tax               | range     | no             | no                      |
| Contacts          | none      | no             | no                      |
| Stock             | none      | no             | no                      |
| Items             | none      | no             | no                      |
| Trending Products | range     | no             | no                      |
| Installment       | none      | no             | no                      |
| Expense           | range     | no             | no                      |
| Register          | single    | yes            | no                      |


### Filter logic for sales-based reports:

- Payment method filter: `.eq("payment_method", value)` when not "all"
- Payment status filter: `.eq("payment_status", value)` when not "all"

## Print Styles

Add to `src/index.css`:

```css
@media print {
  body * { visibility: hidden; }
  .print-area, .print-area * { visibility: visible; }
  .print-area { position: absolute; left: 0; top: 0; width: 100%; }
  .no-print { display: none !important; }
}
```

## Files

- **New**: `src/components/reports/ReportToolbar.tsx`
- **Edit**: `src/index.css` (print styles)
- **Edit**: All 12 report pages in `src/pages/reports/`

## Implementation Order

1. Create `ReportToolbar` component with export/print logic
2. Add print CSS
3. Update each report page (batch of 4 at a time)

See image refferance and gate more plan