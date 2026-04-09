# IMEI Uniqueness, IMEI Search in POS, and Changeable Sale Date

## 3 Changes

### 1. IMEI/Serial Uniqueness Enforcement (Database Level)

**Problem**: Same IMEI/serial can be entered multiple times across purchases or sales — no uniqueness check exists.

**Solution**: Add validation at the app level before saving. Before inserting purchase_items or sale_items with a serial_number, query the respective table to check if that serial already exists. Show an error toast and block the save if duplicate found.

**Files**:

- `src/pages/POS.tsx` — validate in `addSerialToCart` and `handleCompleteWithPayments`: check serial not already in `sale_items` or `purchase_items` DB tables
- `src/pages/SaleAdd.tsx` — same validation before save
- `src/pages/PurchaseAdd.tsx` — validate in `addSerialToItem`: check serial not already in `purchase_items` DB table
- `src/hooks/useAvailableSerials.ts` — already filters sold serials, no change needed

**Validation logic** (reusable helper or inline):

```typescript
// Check if serial exists in purchase_items
const { data } = await supabase.from("purchase_items")
  .select("id").eq("serial_number", serial).maybeSingle();
if (data) { toast.error("IMEI already exists in purchases"); return; }

// Check if serial exists in sale_items  
const { data: sold } = await supabase.from("sale_items")
  .select("id").eq("serial_number", serial).maybeSingle();
if (sold) { toast.error("IMEI already sold"); return; }
```

### 2. IMEI Searchable in POS Product Search & Barcode Scanner

**Problem**: POS search only matches product name, SKU, and barcode — not IMEI/serial numbers stored in `purchase_items`.

**Solution**: Extend the POS search and barcode scan logic to also search `purchase_items.serial_number`. If an IMEI match is found, identify the product and auto-add it to cart with that serial pre-selected.

If Same Product multiple IMEI then no new row should be added only increase quentiy 

# 3. On success sale auto generate invoice and force to print.

## **Files**:

- `src/pages/POS.tsx`:
  - `filteredProducts` memo: add a secondary search path — if no product matches by name/SKU/barcode, query available serials
  - `handleBarcodeScan`: after product lookup fails, check if scanned code matches any available serial in `purchase_items` (not yet sold via `sale_items`), find the parent product, and call `addSerialToCart(productId, serial)`
  - Add a new async search effect or debounced lookup for IMEI in the search bar

### 3. Changeable Sale Date in POS Screen

**Problem**: POS date is hardcoded to `new Date()` and not editable. Invoice date should follow the selected date.

**Solution**: Add a date state variable and a date picker input near the existing date display. The selected date flows into the `createSale` call as `sale_date`.

**Files**:

- `src/pages/POS.tsx`:
  - Replace `const now = new Date()` with `const [saleDate, setSaleDate] = useState(new Date())`
  - Add a date input or Popover+Calendar next to the date/time display in the header area
  - Pass `sale_date: saleDate.toISOString().split("T")[0]` in the `createSale.mutateAsync` call

---

## Implementation Order

1. Add changeable date picker to POS (simplest, isolated)
2. Add IMEI search to POS search bar and barcode scanner
3. Add IMEI uniqueness validation across POS, SaleAdd, and PurchaseAdd