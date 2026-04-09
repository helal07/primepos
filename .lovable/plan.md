# POS Redesign + Purchase Screen Enhancement — Phased Plan

## Phase 1: POS Screen Redesign (Inspired by Reference Image)

### What Changes

Redesign the POS page to match the reference layout:

- **Left side**: Cart area with product table (Product, Quantity, Subtotal columns), customer select, search bar with barcode scan
- **Right side**: Product grid with **Category** and **Brand** tab filters at top, product cards showing image/name/SKU/stock
- **Bottom bar**: Payment action buttons (Multiple Pay, Cash, Card, Cancel) + Total Payable display
- **IMEI/Serial products**: When an IMEI/serial-tracked product is clicked, instead of a popup, show an **inline IMEI selector** directly in the cart row — a dropdown of available IMEI numbers from purchase records for that product. User must pick which specific unit to sell.

Make UI mobile frist friendly as like android or iOS app so retailer can easily and speedly sale think more about it.

### Key UI Elements

```text
┌──────────────────────────────┬──────────────────────────┐
│  Customer Select  │ Search + Scan            │  [Category] [Brands]     │
├──────────────────────────────┤                          │
│  Product │ Qty │ Subtotal │ X │  ┌──────┐ ┌──────┐      │
│  ────────────────────────────│  │ Prod │ │ Prod │      │
│  (IMEI row: Select IMEI ▼)  │  │ Card │ │ Card │      │
│                              │  └──────┘ └──────┘      │
│                              │  ┌──────┐ ┌──────┐      │
│                              │  │      │ │      │      │
├──────────────────────────────┴──────────────────────────┤
│ Items: 0  Discount  Shipping  Total: ৳0  [Cash] [Card] │
└─────────────────────────────────────────────────────────┘
```

### IMEI Selection Logic (No Popup)

- When a serial-tracked product is added, the cart row shows a `<Select>` dropdown listing available IMEI/serial numbers (from `purchase_items` where `product_id` matches and `serial_number` is not null)
- Query: fetch purchase_items with serial_numbers for that product, exclude already-sold serials (from sale_items)
- User selects the IMEI inline; quantity is locked to 1 per IMEI
- Multiple IMEIs = For Same Product Dont increse  cart rows, increse number only with amount.
  &nbsp;
- Files

- **Edit**: `src/pages/POS.tsx` — full redesign
- **Edit**: `src/hooks/useInventory.ts` — add `useCategories` already exists, add `useBrands` already exists
- **New hook or inline query**: fetch available serials per product from `purchase_items` minus `sale_items`

---

## Phase 2: Purchase Screen Enhancement

### 2A: Payment Section Moved to Bottom

Move payment method, paid amount, and payment recording to the bottom totals section (below the items table), not in the top form. The top form keeps only: Reference, Supplier, Date, Supplier Invoice, Notes.

### 2B: Purchase Status Dropdown

Add a **Purchase Status** select at the top with options:

- **Received** — items go directly into stock (current behavior)
- **Ordered** — creates a purchase order, does NOT add to stock
- **Pending** — saved but not finalized, does NOT add to stock

### 2C: Purchase Order Integration

Add a **Purchase Order** search/dropdown field below the top form:

- Fetches from `purchase_orders` table (status = 'draft' or 'approved')
- When user selects a PO, auto-populate:
  - Supplier from the PO
  - All PO items (from `purchase_order_items`) into the items table
  - Reference linked to the PO
- User can then review, add serials, adjust quantities, and mark as final purchase (Received)

### Files

- **Edit**: `src/pages/PurchaseAdd.tsx` — restructure layout, add PO dropdown, status select
- **Edit**: `src/hooks/usePurchases.ts` — add `usePurchaseOrderItems(poId)` query hook

---

## Implementation Order

1. Phase 1: POS redesign with category/brand tabs, inline IMEI selection
2. Phase 2: Purchase screen restructure with payment at bottom + PO integration