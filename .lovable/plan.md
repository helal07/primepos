# Installment Sales Module

## Overview

A complete installment sales system: register installment customers (with NID/photo/guarantor), create installment sales with auto-generated payment schedules, collect payments, and generate printable agreement/invoice PDFs with product image, customer photo, and signature fields.

## Database Schema (4 new tables)

### `installment_customers`

Extended customer info specific to installment sales:

- `id`, `customer_id` (FK to customers), `permanent_address`, `work_address`, `nid_url` (file), `photo_url` (file)
- `guarantor_name`, `guarantor_mobile`, `guarantor_present_address`, `guarantor_permanent_address`, `guarantor_work_address`, `guarantor_nid_url`, `guarantor_photo_url`
- `created_by`, `created_at`

### `installment_sales`

- `id`, `invoice_no` (auto-increment text like "INS-000001"), `sale_date`, `customer_id` (FK customers), `installment_customer_id` (FK installment_customers)
- `product_id` (FK products), `variation_id` (FK product_variations, nullable), `imei_serial` (text, nullable)
- `price`, `discount`, `interest_percent`, `shipping_cost`, `total_amount`, `down_payment`, `down_payment_account` (cash/bank), `remaining_amount`
- `num_installments`, `installment_duration_days` (default 30), `status` (active/completed/defaulted), `notes`
- `created_by`, `created_at`

### `installment_schedules`

- `id`, `installment_sale_id` (FK), `serial_no` (int), `amount`, `due_date`, `paid_amount` (default 0), `paid_date` (nullable), `status` (pending/paid/overdue/partial)
- `created_at`

### `installment_collections`

- `id`, `installment_sale_id` (FK), `schedule_id` (FK), `amount`, `payment_method`, `collected_by`, `collected_at`, `notes`

RLS: All tables authenticated-only, `created_by = auth.uid()` for insert, all rows visible to authenticated users.

## Sidebar Navigation

Add new "Installment Sales" group between Sales and Purchase:

- Add Installment Customer → `/installment/customers/add`
- List Installment Customers → `/installment/customers`
- Add Installment Sale → `/installment/sales/add`
- List Installment Sales → `/installment/sales`
- Installment Collection → `/installment/collections`
- `Installment Shedule->` 

## Pages (6 new pages)

### 1. Add Installment Customer (`InstallmentCustomerAdd.tsx`)

Full-page form (3-column grid like reference image):

- Customer Name*, Phone*, Email, Present Address*, Permanent Address*, Work Address*
- NID* (file upload), Photo* (file upload)
- Guarantor section: Name*, Mobile*, Present/Permanent/Work Address*, NID (file), Photo (file)
- Buttons: Submit, Save & Add More, Back
- Storage bucket: `installment-docs` for NID/photo uploads

### 2. List Installment Customers (`InstallmentCustomers.tsx`)

Table with search, showing customer name, phone, guarantor name, status, actions (edit/view).

### 3. Add Installment Sale (`InstallmentSaleAdd.tsx`)

Two-panel layout (like reference image):

- **Left**: Date, Invoice No (auto), Customer select (from installment_customers), Product select, IMEI/Serial, Price, Discount, Number of Installments*, Interest %*, Shipping, Total (auto-calc with interest), Down Payment, Down Payment Account (Cash/Bank), Remaining (auto), Installment Duration (days, default 30), Note
- **Right**: Auto-generated installment schedule table showing SN, Amount, Payment Date, Delete button. Clicking "Next" after setting duration auto-fills the schedule. Total shown at bottom.
- Auto-calculation: `total = (price - discount) * (1 + interest/100) + shipping`, `remaining = total - down_payment`, each installment = `remaining / num_installments`, dates spaced by `installment_duration_days`.

### 4. List Installment Sales (`InstallmentSales.tsx`)

Table: Invoice No, Customer, Product, Total, Down Payment, Remaining, Status, Actions (view/collect/print).

### 5. Installment Collection (`InstallmentCollections.tsx`)

- Select sale by invoice no or customer
- Show schedule with paid/pending status
- Collect payment against a specific schedule row: amount, method, notes
- Auto-update schedule status (paid/partial)

### 6. Printable Agreement/Invoice (`InstallmentAgreement.tsx`)

Generates a printable document (CSS print-optimized) containing:

- Company header (Prime POS branding)
- Customer photo + details (name, phone, address, NID)
- Product image + details (name, IMEI/Serial, price)
- Guarantor photo + details
- Payment schedule table (all installments with dates)
- Financial summary (total, down payment, interest, remaining)
- Signature lines: Customer Signature, Guarantor Signature, Authorized Signature
- Print button triggers `window.print()`

- &nbsp;
- `Installment Shedule-> this will inform next collection date with details with filter today date, next week date, next month date, tomorrow date also have button to send SMS reminder from sms reminder`

## Hook

New `src/hooks/useInstallments.ts` with queries and mutations for all 4 tables.

## Files

- **New migration**: Create 4 tables + storage bucket + RLS policies
- **New**: `src/hooks/useInstallments.ts`
- **New**: 6 page components in `src/pages/`
- **Edit**: `src/App.tsx` — add 6 routes
- **Edit**: `src/components/layout/AppSidebar.tsx` — add Installment Sales menu group