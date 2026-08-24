# Warranty split: open warranty types, gated warranty management

## Goal
Warranty *definitions* (name + period like 1 year / 3 months / 3 weeks) belong to product setup and must be available to every retailer. Only *warranty management* (claim receiving, warranty checking, servicing) stays behind the paid Warranty module. Also fix the database error that currently blocks creating a warranty.

## Changes

1. **Warranties becomes part of Products, open to all**
   - Move the **Warranties** item from the "Warranty Manager" group into the **Product** group in the sidebar.
   - Remove the warranty module gate from the `/warranties` route and from that menu item, so all tenants can define warranty types. Access still follows normal role permissions (products/inventory).
   - Product add/edit keeps the "Has Warranty" toggle for everyone.

2. **Product warranty selection uses defined warranty types**
   - In the product form, when warranty is enabled, replace the free-typed months/type inputs with a dropdown of the tenant's saved warranty types (name + duration), plus a quick link to create one.
   - Store the selected warranty on the product, keeping the existing duration/type columns in sync so older data and reports keep working.

3. **Warranty period shows on the invoice**
   - Sale line items carry the product's warranty name and period; the invoice/print view shows the warranty period per item when present.

4. **Warranty Manager module keeps the gate**
   - The gated group covers management only: Warranty Claims, Warranty Checking (search by IMEI/serial or invoice number), and Servicing entries — matching the reference screens.
   - Add the Warranty Checking screen: search by IMEI/serial number or invoice number, then show the matched sale, product, warranty type and remaining coverage.
   - These routes stay behind the warranty module gate and redirect ineligible tenants to the upgrade page.

5. **Fix the warranty save error**
   - Add a Laravel migration making the legacy issued-warranty columns on `warranties` (`warranty_no`, `start_date`, `end_date`) nullable, and ensure the warranty-type columns (`name`, `description`, `duration`, `duration_type`, `is_active`) exist with sensible defaults. This resolves the `Field 'warranty_no' doesn't have a default value` error.
   - Align the Warranty model and the REST resource config (allowed filters, sort, search) with the warranty-type fields the page actually uses.
   - Add backend tests covering warranty type create/update and warranty lookup by IMEI/invoice.

## Technical notes
- The `warranties` table was originally created for issued warranties, while the current page saves warranty *definitions*; the migration keeps both shapes valid without dropping data.
- Duration types supported: days, weeks, months, years — used to compute coverage end dates for invoice display and warranty checking.
