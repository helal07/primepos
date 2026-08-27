# Installment Module Overhaul

Six fixes across the installment module: agreement print, live camera capture, schedule visibility/printing, richer schedule list with drill-down, real SMS sending, and a working collection screen.

## 1. Installment Sale Agreement (print layout)

- Show the business logo and business name from tenant settings (same source the sales invoice uses) instead of the hardcoded "Prime POS" text; footer authorized-signature line uses the business name too.
- Fill the empty Date field from the sale date, falling back to the created date, and format it as a short readable date (not a raw ISO timestamp).
- Add the missing dynamic fields: customer photo, NID, address, guarantor photo/name/phone/address, product IMEI/serial, and a payment-status summary block (total, down payment, collected so far, remaining, next due date).
- Print-friendly: A4 page styling, repeat table header across pages, hide app chrome, and make broken image placeholders disappear when a photo is missing (the current layout shows broken-image icons).

## 2. Live camera capture for installment customer photos

- Reuse the existing camera+upload component from the exchange module (currently hardcoded to the exchange storage folder) by adding a bucket/folder option, then use it in Add Installment Customer for customer photo, customer NID, guarantor photo, and guarantor NID.
- Camera uses the rear camera on mobile by default with a switch-camera option, plus the existing file-upload fallback; images stay compressed as they are today.

## 3. Schedule rows not showing / must print

- The agreement and collection screens request schedules sorted by a column the schedule rows do not actually use (rows are saved with a serial number). First step is to confirm this against the database, then align sorting and field names end to end (list, agreement, collection) so rows appear.
- Also verify schedule rows are actually being written when a sale is created; if any row fails, the sale currently still saves silently. Creation moves to an all-or-nothing flow with a visible error.
- Add a Print Schedule action (schedule-only print view) plus keep the full agreement print.

## 4. Schedule view: identity columns + drill-down

- Replace the giant raw ISO due-date text with a short date and an "overdue by N days" hint.
- Columns become: photo thumbnail, customer name, phone, guarantor name, guarantor phone, invoice, product, due date, amount, paid, status, reminder.
- Fix the missing name/phone/product values (relation data not reaching the row) and use the correct invoice field.
- Clicking a row opens that invoice's detail view with full payment status and the schedule breakdown, with Collect and Print actions from there.
- Mobile: card layout instead of a wide table.

## 5. SMS reminder

- Today the SMS button only shows a toast — nothing is sent. Add a real backend endpoint that sends the reminder through the tenant's configured SMS provider, using the existing SMS service, and record the attempt.
- Message template includes customer name, invoice, due date, amount and remaining balance.
- If no provider/credentials are configured, the UI says so clearly instead of pretending success.

## 6. Collection screen

- Keep invoice selection, but add: customer/guarantor summary header, remaining balance, and the schedule table with a Collect action on every unpaid row (this is currently invisible because the schedule rows fail to load — same root cause as item 3).
- Add a "Due Installment List" mode across all invoices (like the reference screenshot): filters for due today / overdue / this week, multi-select rows, bulk SMS reminder, and per-row collect.
- Collection dialog supports full or partial amounts, payment method, notes, and prints a collection receipt.
- Collection posting moves to a single server-side operation so paid amount, schedule status and the sale's remaining amount/status always stay consistent (today the client writes them separately and can leave the sale total stale).

## Technical notes

- Frontend: `src/pages/InstallmentAgreement.tsx`, `InstallmentSchedule.tsx`, `InstallmentCollections.tsx`, `InstallmentCustomerAdd.tsx`, `InstallmentSaleAdd.tsx`, new invoice detail page + route, `src/hooks/useInstallments.ts`, generalized `MediaCapture`.
- Backend: schedule/collection relation + sort alignment in `RestRegistry`, an installment collection endpoint that recalculates sale totals in a transaction, and an SMS reminder endpoint on top of `SmsService`.
- Verification step before coding: query the schedule table's real columns and existing rows to confirm the sort/field mismatch is the actual cause of the empty tables.
