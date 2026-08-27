# Purchase Location + Per-Warehouse Stock Enforcement

Ultimate POS-style location logic: every purchase goes into a chosen warehouse/location, and selling can only draw from the stock that exists in the location selected on the POS screen.

## What is already there

- `purchases` table has a `warehouse_id` column, and the purchase stock observer already moves stock into `purchase.warehouse_id` — but only when it is set.
- The Add/Edit Purchase page has no location selector, so `warehouse_id` stays empty and stock lands nowhere per-location.
- POS already has a Location selector, but the stock numbers it shows come from a map that sums quantities across **all** warehouses, so out-of-stock in the selected location is not detected.

## Changes

### 1. Add Purchase — Location selector
- Add a required "Business Location / Warehouse" select at the top of the purchase form (next to Supplier / Date), populated from the warehouses list and pre-filled with the default warehouse.
- Include `warehouse_id` in the saved purchase payload; on edit, load the existing value.
- Block save with a clear message if no location is chosen, so stock can never land nowhere.
- Show the location on the purchase list/view header area so users can tell where stock went.

### 2. Per-location stock in POS
- Change the POS stock lookup to be location-aware: quantities are read for the currently selected location only, and the displayed "Stock: N" / "Out of stock" badge reflects that location.
- Switching the location refreshes the stock badges and re-validates the cart.

### 3. Selling blocked when the location has no stock
- Adding a product to the cart, and increasing a line quantity, is rejected with a toast when the requested quantity exceeds what the selected location has on hand (non-serial products).
- Checkout re-validates every cart line against the selected location and refuses to submit if anything is short.
- Serial/IMEI products keep their existing behaviour: only serials belonging to the selected location's stock are offered.
- Server-side guard: reject a sale line whose warehouse stock would go negative, so the API cannot be bypassed by a stale client.

## Technical notes

- Frontend: `src/pages/PurchaseAdd.tsx` (location select + payload), `src/hooks/usePurchases.ts` (pass through `warehouse_id`), `src/hooks/useWarehouses.ts` (add a per-warehouse stock map keyed by `warehouse_id` + `product_id`), `src/pages/POS.tsx` (use that map, validate add-to-cart / quantity / checkout).
- Backend: add `warehouse_id` to the `purchases` registry filters in `RestRegistry.php` and `warehouse` to its eager loads; add a negative-stock guard in `WarehouseStockService`/`SaleItemObserver` path so oversell fails with a readable error.
- No schema migration needed for purchases — the column exists. `warehouse_stock` already has a unique key per (warehouse, product, variation).

## Out of scope for this pass

Per-location customer dues and per-location reports/dashboard filtering. Those are a separate step once purchase and sale movements are location-correct.
