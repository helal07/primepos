## Redesign Settings page — Ultimate POS style

Refactor `src/pages/Settings.tsx` so the layout mirrors the Ultimate POS Business Settings screen the user uploaded: a **vertical section list on the left** with a clean white/blue active state, and the matching form fields on the right. Keep all current functionality — only the layout/IA changes.

### New layout

```text
┌──────────────────────┬────────────────────────────────────────┐
│ Business    (active) │  <fields for the selected section>     │
│ Tax                  │                                        │
│ Product              │                                        │
│ Contact              │                                        │
│ Sale                 │                                        │
│ POS                  │                                        │
│ Purchases            │                                        │
│ Payment              │                                        │
│ Dashboard            │                                        │
│ System               │                                        │
│ Prefixes             │                                        │
│ Email Settings       │                                        │
│ SMS Settings         │                                        │
│ Invoice              │                                        │
│ Notifications        │                                        │
│ Appearance           │                                        │
│ Mobile App (PWA)     │                                        │
│ Custom Labels        │                                        │
└──────────────────────┴────────────────────────────────────────┘
```

- Left rail: ~240px, rounded buttons, active item filled with primary gradient + white text (matching the reference screenshot's blue active pill), inactive items neutral.
- Right panel: card with the active section's form. Reuse existing tab components (BusinessTab, InvoiceTab, TaxTab, NotificationsTab, PwaTab, Appearance/ThemePicker) as-is.
- Mobile (<md): collapse left rail into a horizontal scrollable tab strip (current shadcn Tabs look) so it stays usable on phones.
- Implementation: use shadcn `Tabs` with `orientation="vertical"` + custom `TabsList` styles, so all current section content keeps working without rewrites.

### New sections (placeholders for parity with Ultimate POS)

Add empty section shells (using `PlaceholderPage`/simple "Coming soon" card) so the IA matches the reference. No business logic:

- Product, Contact, Sale, POS, Purchases, Payment, Dashboard, System, Prefixes, Email Settings, SMS Settings, Custom Labels

These render a small card titled with the section name and a muted "Settings for this section will appear here." line. Future requests can fill them in.

### Files to change

1. **`src/pages/Settings.tsx`**
   - Replace the horizontal `TabsList` with a 2-column grid: left vertical nav, right content card.
   - Reorder/rename tabs to match Ultimate POS ordering (Business first, Invoice grouped with sale-related settings).
   - Add the placeholder sections listed above (inline tiny components, no new files).
   - Keep all existing tab components and their save logic intact.
   - Wrap the page in `PageHeader` (already used) — no change to header.

### Out of scope

- No changes to data, RLS, or save mutations.
- No changes to invoice template logic or `SaleInvoice.tsx`.
- No new files; everything stays in `Settings.tsx`.
- No icons added to the left rail unless trivial (can add lucide icons matching each section if cheap — Building2, Receipt, Package, Users, ShoppingCart, etc.).

### Technical notes

- Use `Tabs orientation="vertical"` with `className="flex flex-col md:flex-row gap-6"`.
- Left rail: `<TabsList className="md:flex-col md:h-auto md:w-60 md:items-stretch bg-card border rounded-xl p-2 gap-1">` and each `TabsTrigger` styled `justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg`.
- Right panel: `<div className="flex-1 rounded-xl border bg-card p-6">{TabsContent...}</div>`.
- On mobile, override to horizontal scrollable list via responsive classes.
