# POS mobile screen — Ultimate POS layout

Frontend-only changes to `src/pages/POS.tsx` (mobile view; desktop layout stays as it is).

## 1. Top bar: only Location stays visible

- Keep the `Location:` dropdown in the top bar on mobile.
- Move everything else (date/time pill, recent transactions, cancel, quick cash, calculator, new sale, multi-payment, hold, Add Expense) into a hamburger button on the right side of the top bar that opens a sheet with those actions as a labelled list.
- Desktop (`md+`) keeps the current inline toolbar unchanged.

## 2. Clean default screen, catalog behind a cart/grid button

- Default mobile view shows: Location bar, Customer picker + add-customer button, product search / barcode scan row, price group row, and an empty-cart state with a cart icon, "Your cart is empty" and the hint "Scan a barcode, tap a product tile, or type to search."
- The category / brand tab strip and the sub-filter pills are no longer shown on the default screen. They live inside the catalog panel.
- Add a catalog button (cart/grid icon) at the top right of the cart header. Tapping it opens the product catalog (category and brand tabs, filter pills, 2-column product tiles). Selecting a product adds it to the cart; the catalog can be closed to return to the clean cart view.
- The existing Catalog / Cart segmented tabs are replaced by this single toggle so the default state is always the cart.

## 3. Bottom payment bar (Ultimate POS style)

Sticky bottom bar on mobile, two rows, full width, thumb-friendly:

```text
[ Cancel (red outline) ] [ Multiple Pay (dark) ] [ Cash (green) ]
[   Quotation          ] [   Credit Sale       ] [   Card       ]
```

- Top row: primary payment actions, taller buttons with icons.
- Bottom row: secondary actions as flat/ghost buttons with small icons above the label.
- Total payable stays visible above the bar as a compact one-line strip.
- Actions reuse the existing handlers (`handleCancel`, `openPaymentDialog`, `handleQuickCash`, `handleCreditSale`, `handleCardSale`, quotation navigation) — no business-logic change.

## 4. Previous due indicator beside the price group field

- To the right of the Default Selling Price / price group select, show a due chip when the selected customer has outstanding balance: `Due ৳<amount>`, styled as a destructive badge, tappable to open the payment dialog context.
- When there is no customer or no dues, the slot renders the existing neutral info icon so the row height doesn't shift.
- Uses the `previousDue` value already computed in POS from `usePreviousDue` — no new queries.

## Verification

Screenshots at 394px and desktop width, plus a check of the build log.
