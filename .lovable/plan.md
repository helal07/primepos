## Goal

Make `/purchases/add` usable on a 360px phone, fix the barcode-scanner permission dead end, and make the IMEI/Serial field actually addable from a mobile keyboard (the "Next" key currently jumps to the Price column without saving the IMEI).

## Root causes

1. **Layout** — `src/pages/PurchaseAdd.tsx` renders a wide `<Table>` with fixed column widths inside a single `overflow-x-auto` wrapper. On a 360px viewport this becomes a horizontal scroll nightmare; payment rows, totals grid, and top form also assume desktop widths.
2. **Barcode permission** — `src/components/pos/BarcodeScanner.tsx` calls `Html5Qrcode.start({ facingMode })` directly. When the browser blocks/denies camera, we only show a text line. There is no "Grant permission" CTA, no proactive `navigator.permissions.query({ name: "camera" })` check, no link to OS/browser settings, and no retry button. On iOS Safari/Chrome the first call must come from a user gesture inside the dialog — which it does, but the failure path leaves the user stuck.
3. **IMEI field skipping** — On mobile, the on-screen keyboard's "Next" key fires a focus change (not a `keydown: Enter`). Our handler only listens for `Enter`, so tab order moves focus straight to the next `<Input>` in the row (Qty → Unit Cost). The typed IMEI is discarded. There is no visible "Add" button next to the input either.

## Fix plan

### 1. `src/pages/PurchaseAdd.tsx` — mobile layout

- Wrap top form: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3` and `gap-3 sm:gap-4` rhythm; collapse "Supplier Invoice / Notes / Import PO" to single column on mobile.
- Convert the items table to a **dual rendering**:
  - `hidden md:block` wrapper around the existing `<Table>` (desktop unchanged).
  - `md:hidden space-y-3` block that renders each item as a stacked **card** with: product name + brand/sku + remove (top row), IMEI/Serial chip list + input + scan button (full width), then a 2-col grid for Qty / Unit Cost / Discount / Tax / Total.
- Payment rows: switch from `flex gap-2` to `grid grid-cols-2 gap-2 md:flex md:gap-2` so Amount + Method sit on row 1, Note + remove on row 2 on mobile.
- Totals strip: `grid-cols-2 sm:grid-cols-3 md:grid-cols-6` with smaller font on mobile (`text-base sm:text-lg`).
- Add `pb-24 md:pb-0` page padding and a sticky save bar (`md:hidden fixed bottom-16 inset-x-0 border-t bg-background p-3 z-30`) showing Grand Total + Save button so the primary CTA is always reachable above the bottom nav.
- Header back button: `h-10 w-10 shrink-0`.

### 2. IMEI input — mobile keyboard fix (in same file)

In the serial input block (~line 530):
- Add `inputMode="text"`, `enterKeyHint="done"`, `autoComplete="off"`, `autoCorrect="off"`, `autoCapitalize="characters"`.
- Add an explicit **"+" Add button** next to the input (alongside the scan button) that calls `addSerialToItem(idx, val)`.
- Add `onBlur` handler: if the input still has a non-empty value when focus leaves (e.g. user pressed mobile "Next"), call `addSerialToItem(idx, val)` before focus moves on. Use a small `setTimeout(0)` guard so React state updates flush.
- Make adjacent Qty/Unit Cost/etc inputs `tabIndex={-1}` on mobile-card view so the keyboard "Next" key cycles back to the IMEI input rather than skipping past it. (Desktop table keeps natural tab order.)
- Bump input height to `h-10` on mobile for 44px touch target.

### 3. `src/components/pos/BarcodeScanner.tsx` — permission UX

- Before `scanner.start(...)`, do a best-effort `navigator.permissions.query({ name: "camera" as PermissionName })`. If state is `"denied"`, skip the start call and render a permission-help panel directly.
- In the `catch` of `scanner.start`, branch on `err.name`:
  - `NotAllowedError` / `PermissionDeniedError` → set `permissionState = "denied"`.
  - `NotFoundError` / `OverconstrainedError` → "No camera found".
  - `NotReadableError` → "Camera is busy in another app".
  - default → existing message.
- New JSX block when `permissionState === "denied"`:
  - Big icon + heading "Camera permission needed".
  - One-paragraph explanation.
  - **"Allow camera"** primary button → calls `startScanner(facingMode)` again (must be inside the same gesture for the browser to re-prompt; on platforms where the prompt is permanently dismissed, the call will throw and we surface the secondary message).
  - Secondary text with a small accordion / details: how to enable in iOS Safari (Settings → Safari → Camera → Allow) and Android Chrome (lock icon → Permissions → Camera).
  - Also expose a "Use device gallery" fallback: hidden `<input type="file" accept="image/*" capture="environment">` with a button "Take photo of barcode" that runs `Html5Qrcode.scanFile(file, true)` and returns the decoded text via `onScan`. This unblocks users who can't or won't grant camera access.
- Add a small "Try again" button that re-runs `startScanner` after error.
- Make the dialog responsive: scanner container height `min-h-[60vh] sm:min-h-[340px]` and footer buttons full width on mobile.

### 4. Verification

- Use the browser tool at viewport 360x800 to:
  1. Visit `/purchases/add`, confirm no horizontal page scroll, top form stacks, save bar visible.
  2. Add an IMEI product, verify chips list, type IMEI + tap "+", verify chip appears; type IMEI + press keyboard Next, verify chip still appears (blur handler).
  3. Open scanner — if permission denied path triggers, verify the "Allow camera" + "Take photo" fallback render.
- Run typecheck via the harness.

### Files touched

- `src/pages/PurchaseAdd.tsx` (mobile layout + IMEI input handlers + sticky save bar)
- `src/components/pos/BarcodeScanner.tsx` (permission state + denied UI + file fallback + responsive sizing)

No DB / backend / business-logic changes.
