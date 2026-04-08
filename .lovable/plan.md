# Enhanced Add Purchase Page — IMEI/Serial Support & UI Refresh

## What We're Building

When adding a purchase, if the selected product has `product_type` of "imei" or "serial", each unit should add IMEI/Serial no into a colmn named Serial/IMEI and auto increase the product number  don't create separate row in the items table with an IMEI/Serial input field (like the reference image). The page layout also gets a visual refresh — switching from sidebar layout to a wider, full-width form inspired by the reference.

## Key Behavior Changes

### IMEI/Serial Product Handling

- When an IMEI/Serial product is added, **each quantity = 1 row** with its own IMEI/Serial input field
- Adding the same IMEI product again this show duplicate IMEI/Serial
- The quantity field is **locked to 1** and non-editable for IMEI/Serial items
- A dedicated IMEI/Serial column appears in the items table with an input field per row
- For General/Combo/Service products, behavior stays the same but not ask for Serial/ IMEI

### "Add New Product Button"

- If product is new there can be added the product calling ->Add Product

### Supplier Opening Balance Display

- After selecting a supplier, show their opening balance (credit/debit) below the supplier select

## Layout Redesign (Reference Image Style)

Switch from current 2/3 + 1/3 sidebar layout to a **full-width single-column** form:

- **Top row**: Reference No (auto), Supplier select (with + button), Date — all in a 3-column grid
- **Supplier Invoice No** field below
- **Items section**: Product select + "Add Product" button, then the items table spanning full width
- **Table columns**: SN, Item-Brand-Code, IMEI/Serial (conditional), Quantity, Unit Price, Total, Actions
- **Bottom section**: Total Item count, Discount (flat/percentage), Other charges, Grand Total, Account select, Paid amount, Due (auto-calc)

## Files Changed

### `src/pages/PurchaseAdd.tsx` — Full rewrite

- New full-width layout matching reference
- IMEI/Serial detection: read `product_type` from product data when adding items
- For imei/serial products: qty locked to 1, serial_number input shown, duplicate adds new row
- Add New Product button
- Bottom totals section with discount (supports "10" or "10%"), other charges, paid amount, due calculation

### `src/hooks/usePurchases.ts` — Minor update

- Add `product_type` to `PurchaseItem` interface for UI tracking (not persisted, just used to control form behavior)

### No database migration needed

- `serial_number` column already exists on `purchase_items` table
- `product_type` already exists on `products` table