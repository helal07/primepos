## Problem found

The delete is failing because Sumon Telecom has product records that are still referenced by sales history. The active database constraint is:

- `sale_items.product_id → products.id`
- Current behavior: `NO ACTION`
- Result: when deleting a tenant, `products` are cascaded, but `sale_items` still points to those products during the same delete, so the database blocks the deletion.

I also found two related product references with the same risk:

- `purchase_items.product_id → products.id`
- `store_order_items.product_id → products.id`

## Plan

1. Update the product-history foreign keys so tenant deletion can cascade cleanly:
  - `sale_items.product_id → products.id ON DELETE CASCADE`
  - `purchase_items.product_id → products.id ON DELETE CASCADE`
  - `store_order_items.product_id → products.id ON DELETE CASCADE`
2. Keep the existing tenant-level cascades intact:
  - tenant deletion already cascades tenant data through `tenant_id` on `sales`, `sale_items`, `products`, purchases, stock, etc.
3. Add a safer superadmin delete function for tenants:
  - delete the tenant by id only when the caller is superadmin
  - rely on database cascades to remove tenant-owned data
  - prevent normal tenant users from deleting tenant records
4. Update the frontend tenant delete action:
  - call the safe delete function instead of directly deleting from `tenants`
  - keep the current confirmation modal and success/error toast behavior
5. Verify after implementation:
  - check Sumon Telecom can be deleted without the `sale_items_product_id_fkey` error
  - confirm suspended/deleted tenants remain blocked from app access
  - Delete every data from tenent password email and others