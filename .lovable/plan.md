

# Enhanced Add Product Page

## What We're Building
A wider, full-page product add/edit form (inspired by the reference image) replacing the current narrow dialog. It will include product image upload, a **Product Type** selector (General / IMEI / Serial / Combo / Service), profit margin auto-calc, and a "show on website" toggle that auto-disables for Service type products.

## Database Changes

**Migration**: Add two columns to `products` table:
- `product_type TEXT NOT NULL DEFAULT 'general'` — values: general, imei, serial, combo, service
- `show_on_website BOOLEAN NOT NULL DEFAULT true`

The `image_url` column already exists in the schema.

## Implementation

### 1. Replace Dialog with Full-Page Form
- Create **`src/pages/ProductAdd.tsx`** — a dedicated full-width page (like the reference image) instead of the cramped dialog modal.
- Add route `/products/add` and `/products/edit/:id` in `App.tsx`.
- Products list page keeps the table but the "Add Product" button navigates to `/products/add`, and edit navigates to `/products/edit/:id`.

### 2. Form Layout (wide, 4-column grid like reference)
Sections in order:
1. **Product Type** — Select dropdown (General / IMEI / Serial / Combo / Service)
2. **Basic Info** — Name, Alternative Name (optional), Sale Price, Wholesale Price, Purchase Price, Profit Margin (auto-calculated: `((selling - purchase) / purchase) * 100`)
3. **Classification** — Category, Brand, Unit, Supplier select
4. **Identifiers** — SKU/Code (auto-generated), Barcode, Loyalty Points (future)
5. **Stock** — Opening Stock, Alert Quantity
6. **Image Upload** — Drag & drop area using Supabase Storage bucket for product images
7. **Warranty & Guarantee** — Duration + type selectors
8. **Tax** — Tax percent field (single field, can expand later)
9. **Description** — Textarea
10. **Options** — Active toggle, Serial Tracking toggle, **Show on Website** toggle (auto OFF + disabled when type = "Service"), Has Warranty toggle

### 3. Product Image Upload
- Create a Supabase Storage bucket `product-images` (via migration or storage API).
- Upload image on form submit, store URL in `image_url` column.
- Show image preview in the form with drag-and-drop zone.

### 4. Service Type Logic
- When `product_type = "service"`: auto-set `show_on_website = false` and disable the toggle.
- Hide stock-related fields for Service type (no inventory tracking needed).

### 5. Update Products List
- Show product type as a badge in the table.
- Show thumbnail image in the product name column.
- Navigate to edit page instead of opening dialog.

### Files Changed
- **New**: `src/pages/ProductAdd.tsx` — full-page add/edit form
- **Edit**: `src/pages/Products.tsx` — remove dialog, add navigation buttons
- **Edit**: `src/hooks/useInventory.ts` — add `product_type`, `show_on_website`, `image_url` to mutations
- **Edit**: `src/App.tsx` — add `/products/add` and `/products/edit/:id` routes
- **New migration**: add `product_type` and `show_on_website` columns

