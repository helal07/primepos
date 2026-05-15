# Fix: POS payment dialog hidden by keyboard on mobile

## Problem

On the mobile POS sale flow, when the cashier taps the **Amount** field in the **Finalize Payment** dialog, the on-screen keyboard slides up and covers the payment rows, method selector, status line, and the **Finalize Payment** button. Only the summary cards stay visible (see screenshot). The cashier cannot complete the sale.

Root cause: `src/components/payments/PaymentDialog.tsx` uses a fixed-width centered `DialogContent` (`max-w-lg`) with no mobile-aware height, no scroll on the outer container, and a non-sticky footer. On mobile Chrome the visual viewport shrinks when the keyboard opens, but the dialog stays centered against the *layout* viewport, so its bottom half ends up under the keyboard.

## Fix (UI only, `src/components/payments/PaymentDialog.tsx`)

1. **Responsive sizing** — keep desktop look, fix mobile:
  - `DialogContent` className → `w-[calc(100vw-1rem)] max-w-lg max-h-[100dvh] sm:max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden`
  - This uses `dvh` (dynamic viewport height) so the dialog naturally shrinks when the mobile keyboard opens.
2. **Scrollable body, sticky header & footer**
  - Wrap header in a `shrink-0` container with padding.
  - Middle section (summary + payment rows + add-row button + status) becomes `flex-1 overflow-y-auto px-6 py-4 space-y-4`.
  - Footer becomes `shrink-0 border-t bg-background px-6 py-3` so **Cancel** / **Finalize Payment** are always reachable above the keyboard.
3. **Auto-scroll the focused input into view** — when an Amount/Note input gains focus on mobile, call `e.currentTarget.scrollIntoView({ block: "center", behavior: "smooth" })` so the active row is centered in the visible area above the keyboard.
4. **Remove the inner `max-h-[40vh]` on the payment rows list** — the outer scroll container now handles overflow, and the inner cap was making things worse on small screens.

## Out of scope

- No backend, hook, or sale-logic changes.
- No changes to `SaleAdd.tsx`, `PurchaseAdd.tsx`, or `POS.tsx` — they only consume the dialog.
- Barcode scanner work from previous turns is unrelated and left as-is.

## Verification

- Open POS on mobile viewport (360×678), add a product, tap **Pay** → **Finalize Payment**, tap the Amount field. Confirm the **Finalize Payment** button stays visible above the keyboard and the focused row scrolls into view.
- Desktop view (`sm:` and up) should look identical to today.

**After Products added to cart there is no cacncle or remove option from cart.  Fix the issue also**