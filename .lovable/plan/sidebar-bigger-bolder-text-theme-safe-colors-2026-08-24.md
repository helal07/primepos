# Sidebar: bigger/bolder text + theme-safe colors

## Goal
The sidebar is wide but the labels look small and thin, and in the light (Pearl Light) theme the active "Dashboard" label reads as white-on-light. Make label size/weight match the sidebar width, and make text color always follow the theme (light text on dark themes, dark text on light themes).

## What changes

1. Typography (bigger + bolder)
   - Menu labels: `text-[15px]` -> `text-base` (16px), weight `font-medium` -> `font-semibold`; active item `font-bold`.
   - Icons: 20px -> 22px so they stay balanced with the larger text.
   - Row height: `h-11` -> `h-12`; keep `rounded-xl` pill.
   - Group headers ("Product", "Sales", ...): `text-[11px]` -> `text-xs`, `font-bold`, and stronger color (`text-sidebar-foreground/70` instead of `/60`) so they are easy to scan.
   - Header (logo + company name): logo tile 10 -> 11 (44px), company name `text-lg font-bold` kept but truncation width fixed so it doesn't cut early.

2. Theme-safe active/hover states (fixes white-on-white)
   - Active item: soft per-button shade instead of a full saturated fill — background `bg-sidebar-accent`, left accent bar in `bg-sidebar-primary`, text `text-sidebar-accent-foreground`. Since `sidebar-accent-foreground` is dark in the light theme and near-white in dark themes, the label is always readable regardless of theme.
   - Inactive item: `text-sidebar-foreground`; hover `bg-sidebar-accent/60` + `text-sidebar-accent-foreground`.
   - Locked items keep the lock icon and reduced opacity.
   - Verify each of the 5 themes (Midnight, Ocean, Forest, Royal, Pearl Light) renders readable labels; adjust only the `sidebar-*` tokens in `src/lib/themes.ts` if any pair falls short on contrast.

3. Mobile
   - Same classes apply to the mobile drawer (it renders the same component); tap targets stay >= 44px thanks to `h-12`.

## Where you can change these yourself (file paths)

- Label size, weight, icon size, row height, active/hover colors:
  `src/components/layout/AppSidebar.tsx` — the `className` on `SidebarMenuButton` and on the `NavLink` inside it (there are two identical blocks: one for single-item groups, one for collapsible groups).
- Group header ("Main", "Product", ...) style: same file, the `SidebarGroupLabel` className.
- Logo + company name block: same file, `SidebarHeader` near the top of the returned JSX.
- Sidebar width (currently `17rem`, mobile `19rem`) and the base menu-button variants:
  `src/components/ui/sidebar.tsx` — constants `SIDEBAR_WIDTH`, `SIDEBAR_WIDTH_MOBILE`, `SIDEBAR_WIDTH_ICON`, and `sidebarMenuButtonVariants` (the `size` variants `default` / `sm` / `lg`).
- Sidebar colors per theme: `src/lib/themes.ts` — the `sidebar-*` entries inside each theme's `vars`.
- Default sidebar colors (before a theme is picked): `src/index.css` — `--sidebar-*` variables in `:root` and `.dark`.

## Technical notes
- No color literals are added; everything stays on the `sidebar-*` design tokens so theme switching keeps working.
- Only presentation classes change — menu structure, permission gating, and module locking logic stay as-is.
- Verification: switch to Pearl Light and Midnight in the preview and screenshot the sidebar to confirm label contrast in both.
