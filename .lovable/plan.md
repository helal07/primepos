

# ERP SaaS — Step-by-Step Task List

Below is the full project broken into **14 phases**, each a self-contained step. I will execute them **one at a time** — you approve each before I move to the next.

---

## Current Status

Already built:
- App shell (sidebar, header, layout, routing)
- Design system tokens (colors, fonts)
- Basic pages with static data: Dashboard, Products, Categories, Sales, Customers, Settings
- Placeholder pages for all other modules

---

## Phase 1 — Mobile Bottom Navigation
Add a mobile-only bottom nav bar with key shortcuts (Dashboard, POS, Products, Sales, More menu). Hide sidebar on mobile.

## Phase 2 — Supabase Setup & Auth
Enable Supabase, create auth flow (login/signup), protected routes, and `user_roles` table with RLS.

## Phase 3 — Users & Roles Module
Users list, Add/Edit User dialog, Roles management with per-module permissions, Activity Log page.

## Phase 4 — Products & Inventory (Core)
Database tables for products, categories, brands, units. Full CRUD for Categories (parent/child tree), Brands, Units. Product list with real data, Add/Edit Product form with all fields (SKU, variants, serial tracking toggle, warranty, publish toggle).

## Phase 5 — Products & Inventory (Advanced)
Variations management, Stock adjustments with reason tracking, Stock Transfer between branches, Low stock alerts, Bulk Import/Export, Print Labels.

## Phase 6 — Contacts (Customers & Suppliers)
Database tables, full CRUD for Customers and Suppliers with Add/Edit forms. Customer detail page with purchase history, ledger, payments, installments, warranty claims tabs.

## Phase 7 — Sales Module
Sales List with filters (date, customer, status). Sale detail/invoice view. New Sale form with line items, serial number assignment, discounts, tax.

## Phase 8 — POS Screen
Full-screen POS layout: product grid/search, cart, customer selector, discount/tax, payment method (cash/card/split), hold & resume, receipt generation/print.

## Phase 9 — Purchase Module
Add Purchase form (supplier, date, serial numbers). Purchase List, Purchase Orders, Purchase Returns. Receive Stock with auto inventory update.

## Phase 10 — Accounting
Chart of Accounts (tree view), Transactions list, Journal Entries form, Trial Balance, Cash Flow, Account List.

## Phase 11 — Settings (Full)
Complete all Settings tabs: Business Profile, Invoice Settings, Tax Settings, Notifications, Email/SMS config, Notification Templates (email/sms/whatsapp).

## Phase 12 — HRM Module
Employees list/CRUD, Attendance (GPS & selfie), Leave management, Payroll.

## Phase 13 — Warranty & CMS
Warranty Claims management. CMS Pages builder with sections, components, media.

## Phase 14 — Dashboard with Real Data & Reports
Connect Dashboard to live Supabase data. Revenue charts with date toggles, filterable top products, recent activity feed. BI Reports module.

---

**Next step**: I will start with **Phase 1 — Mobile Bottom Navigation**. Say "go" or tell me which phase you want to start with.

