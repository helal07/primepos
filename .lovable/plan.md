## Goal

Add a **Notification Templates** sub-menu under the existing **Notifications** group in the Superadmin sidebar, modeled after Ultimate POS. Editor supports tag-based templates for 3 events × 2 channels (SMS body + WhatsApp text). Manual-use only — no auto-send wiring in this scope.

## Sidebar change

Convert the current single-link "Notifications" group into a collapsible group with two items:

```text
Notifications
  ├─ Send Notification        (existing → /superadmin/notifications)
  └─ Notification Templates   (new      → /superadmin/notification-templates)
```

Follow the same collapsible pattern already used by SMS Settings / Landing CMS in `AdminSidebar.tsx`.

## New page: `/superadmin/notification-templates`

File: `src/pages/admin/NotificationTemplates.tsx`. Wired in `src/App.tsx` as a lazy route inside the admin layout.

Layout (mirrors Ultimate POS screenshot):

- **Top section — "Notifications"** with a single tab: **Send Ledger** (manual platform-level message template for sending ledger statements to tenants).
- **Bottom section — "Customer Notifications"** with 3 tabs:
  - New Sale
  - Payment Reminder
  - Send Ledger (already above — keep here only if user wants it duplicated; otherwise the 3rd customer tab is `New Sale` + `Payment Reminder` + (a 3rd we'll confirm during build, defaulting to **Payment Received**).
- Each tab shows an **Available Tags** chip row (click to insert into focused field) plus:
  - **SMS Body** — `<Textarea>` with char counter
  - **WhatsApp Text** — `<Textarea>` (supports emoji/multiline)
- Single **Save All Templates** button + **Reset to defaults**.

## Available tags (per event)

- Common: `{business_name}`, `{contact_name}`, `{contact_mobile}`
- New Sale / Payment Reminder: `{invoice_number}`, `{invoice_url}`, `{total_amount}`, `{paid_amount}`, `{due_amount}`, `{due_date}`
- Send Ledger: `{balance_due}`, `{ledger_url}`

Rendered via simple `str.replace(/\{(\w+)\}/g, ...)` for the live preview (same approach as `TrialEmailTemplates.tsx`).

## Storage

Reuse existing `business_settings`-style CMS key/value approach used by `useLandingCms` / `useLandingCmsMutation` — no new table. Single key: `notification_templates`, value shape:

```json
{
  "send_ledger":       { "sms": "...", "whatsapp": "..." },
  "new_sale":          { "sms": "...", "whatsapp": "..." },
  "payment_reminder":  { "sms": "...", "whatsapp": "..." },
  "payment_received":  { "sms": "...", "whatsapp": "..." }
}
```

This means **no DB migration is needed** — fastest path, matches how `TrialEmailTemplates.tsx` already persists.

## Out of scope (this task)

- Auto-send on sale/payment events (manual templates only, per your choice).
- Email channel (you chose SMS + WhatsApp).
- Per-tenant override of these templates (superadmin-managed, platform-wide).

## Files touched

- `src/components/admin/AdminSidebar.tsx` — convert Notifications group to collapsible with 2 items.
- `src/pages/admin/NotificationTemplates.tsx` — new page.
- `src/App.tsx` — lazy import + route.
