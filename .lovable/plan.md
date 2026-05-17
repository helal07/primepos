# POS — Searchable Customer + Due Balance + Customer Group

Three focused improvements to the customer row on the POS screen (`src/pages/POS.tsx`). All work stays in the frontend.

## 1. Searchable customer selector (Ultimate POS style)

Replace the current plain `<Select>` for customers with a searchable Combobox built from existing `Popover` + `cmdk` `Command` primitives (already in the project at `src/components/ui/popover.tsx` and `src/components/ui/command.tsx`).

Behavior:
- Trigger button shows the selected customer name or "Walk-in Customer".
- Opens a popover with a search input that filters by **name, phone, and email** (case-insensitive).
- First row is always "Walk-in Customer" to allow clearing.
- Each row shows customer name on the left and, on the right, phone number plus a small balance chip when the customer has a non-zero balance (red for due, green for advance).
- Clicking a row sets `customerId` and closes the popover.
- Keyboard navigation works (arrow keys + Enter) because `cmdk` handles it.

## 2. Auto-show due balance when a customer is selected

Right under the customer row (only when a real customer, not walk-in, is selected), show an inline summary strip:

```text
[ Customer Name ]  Group: Wholesale   Due: ৳ 1,250.00   Credit limit: ৳ 5,000.00
```

- Pulled directly from the already-fetched `customers` list (`balance`, `credit_limit`, `customer_group_id`); no new queries.
- Balance > 0 → render red "Due: ৳ X" with `AlertCircle` icon.
- Balance < 0 → render green "Advance: ৳ X".
- Balance = 0 → show muted "No outstanding balance".
- If `credit_limit` is set, show it next to the due amount.
- Group name comes from the already-loaded `customerGroups`.

This matches Ultimate POS, which surfaces the prior dues immediately on customer selection so the cashier can collect.

## 3. Make customer group visible

Today `customerDefaultGroupId` silently switches `activePriceGroupId` whenever a customer with a group is picked, but the user never sees which group is applied.

- Always render the existing price group `<Select>` (currently hidden when there are no active price groups). When none exist, show a disabled badge "Default Pricing" instead, so the control is discoverable.
- When the selected customer has a `customer_group_id`, label the active option with a small "(from customer group)" hint and an "Auto" badge next to the price group selector to indicate it was auto-applied. The cashier can still override manually.
- The customer's group name also appears in the summary strip from step 2.

## Technical notes

- File touched: `src/pages/POS.tsx` only.
- Add imports: `Command`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem` from `@/components/ui/command`; `AlertCircle`, `Check`, `ChevronsUpDown` from `lucide-react` (Popover is already used in the file).
- Reuse existing `customers` and `customerGroups` data — no new hooks, no schema changes.
- Keep current `setCustomerId("")` for walk-in semantics so the rest of the file (credit checks, save handlers) continues to work unchanged.
- Preserve mobile-first sizing (`h-10 md:h-9`, full-width on small screens) consistent with the rest of the POS toolbar.
