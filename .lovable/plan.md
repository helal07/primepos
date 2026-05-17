## Add Invoice Template Options (Settings → Invoice)

Extend the existing **Invoice** tab in `src/pages/Settings.tsx` with a new "Invoice Template" section, and make `SaleInvoice.tsx` honor those choices. All options persist under the existing `invoice` settings key (no DB migration).

### New settings (added to `InvoiceTab` form, key `invoice`)

- **Template** (`template`): `classic` (logo left / business right — current), `centered` (logo + business stacked center), `modern` (business left / logo right), `compact` (single-row header, small logo)
- **Header position** (`header_position`): `top` (default), `top-band` (full-width purple band with white text), `boxed` (bordered card)
- **Header Uploading Option by Business Owner** : Diffirent Business location can have diffirent Header a recomendad size will be shown to upload jpeg file.
- **Logo size** (`logo_size`): `sm` (50px) · `md` (70px, current) · `lg` (100px)
- **Logo shape** (`logo_shape`): `square` · `rounded` · `circle`
- **Typography font** (`font_family`): `inter` (default) · `roboto` · `lato` · `poppins` · `serif` (Georgia) · `mono`
- **Heading size** (`heading_size`): `sm` · `md` (current 22px) · `lg` (28px)
- **Accent color** (`accent_color`): color picker, default `#8b7cf6` (drives band + table header)
- **Show fields toggles** (extend existing): `show_business_address`, `show_business_phone`, `show_business_email`, `show_business_website`, `show_business_tax`
- **Live preview**: small inline card under the form showing a mini header rendered with current selections (no new component file — inline JSX)

### Files to change

1. `**src/pages/Settings.tsx**` — `InvoiceTab`
  - Extend `form` state defaults with the keys above.
  - Add a new "Invoice Template" section (above existing toggles) with: template radio cards (4 thumbnails as small SVG/ASCII previews), Select inputs for header position, logo size/shape, font, heading size, and an `<input type="color">` for accent.
  - Add the new show/hide switches in the existing toggles grid.
  - Add a live mini-preview block.
  - Save continues to write `{ key: "invoice", value: form }`.
2. `**src/components/sales/SaleInvoice.tsx**`
  - Read `const tpl = settings?.invoice || {}` and pull all new keys with fallbacks matching today's behavior.
  - Replace the hardcoded `ACCENT`/`BAND_BG` with values derived from `tpl.accent_color` (BAND_BG = accent + low alpha).
  - Wrap the print area in a `<div style={{ fontFamily: <mapped> }}>`.
  - Render header via a small `renderHeader()` switch on `tpl.template`:
    - `classic` → current grid (logo left, info right-aligned)
    - `centered` → flex column, items centered
    - `modern` → info left, logo right
    - `compact` → single row, small logo + inline name + contact line
  - Apply `header_position`:
    - `top` → as-is
    - `top-band` → wrap header in a full-width band using accent color, white text
    - `boxed` → wrap in a bordered, padded box
  - Apply `logo_size` (px) and `logo_shape` (`borderRadius`).
  - Apply `heading_size` to the business name `<h1>` font-size.
  - Respect `show_business_*` toggles when rendering each line.
  - Continue honoring existing `show_logo`, `show_tax`, `show_discount`, `show_shipping`, `footer_text`, `terms`.

### Out of scope

- No DB/schema changes (uses existing `business_settings.invoice` JSON).
- No changes to totals math, payments table, items table, or other invoice sections.
- No changes to purchase/exchange invoices — only `SaleInvoice.tsx`.
- No new files; all UI lives in the two files above.

### Technical notes

- Font map: `{ inter: "Inter, sans-serif", roboto: "Roboto, sans-serif", lato: "Lato, sans-serif", poppins: "Poppins, sans-serif", serif: "Georgia, serif", mono: "ui-monospace, monospace" }`. Fonts already loaded via index.css for Inter; others fall back gracefully.
- Accent helper: convert hex → `rgba(r,g,b,0.15)` for the band background.
- Defaults preserve current invoice look exactly when no template settings are saved.