// Build a print window HTML wrapper that respects invoice template settings:
// paper size (A4/A5/Letter), font family, and scales fonts / banner image
// down for smaller pages so the same layout fits both A4 and A5 cleanly.

const FONT_MAP: Record<string, string> = {
  inter: "Inter, Arial, sans-serif",
  roboto: "Roboto, Arial, sans-serif",
  lato: "Lato, Arial, sans-serif",
  poppins: "Poppins, Arial, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "ui-monospace, Menlo, monospace",
};

export function printInvoiceArea(opts: {
  printAreaId?: string;
  title: string;
  settings?: Record<string, any>;
}) {
  const printArea = document.getElementById(opts.printAreaId || "invoice-print-area");
  if (!printArea) return;

  const tpl = opts.settings?.invoice || {};
  const paper = (tpl.paper_size || "a4").toLowerCase();
  const font = FONT_MAP[tpl.font_family as string] || FONT_MAP.inter;

  // Page geometry per paper size.
  // scale = body font-size multiplier so the same component fits smaller pages.
  const sizeMap: Record<string, { page: string; margin: string; base: number; scale: number }> = {
    a4:     { page: "A4 portrait",     margin: "12mm", base: 12, scale: 1.0  },
    a5:     { page: "A5 portrait",     margin: "8mm",  base: 10, scale: 0.82 },
    letter: { page: "Letter portrait", margin: "12mm", base: 12, scale: 1.0  },
  };
  const g = sizeMap[paper] || sizeMap.a4;

  const w = window.open("", "_blank");
  if (!w) return;

  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(opts.title)}</title>
<style>
  @page { size: ${g.page}; margin: ${g.margin}; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: ${font};
    font-size: ${g.base}px;
    color: #1f2937;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  /* Scale the whole invoice down for smaller paper without rewriting markup */
  #print-root { font-size: ${g.base}px; }
  #print-root * { box-sizing: border-box; }
  #print-root table { width: 100%; border-collapse: collapse; }
  #print-root th, #print-root td { padding: ${Math.round(6 * g.scale)}px ${Math.round(8 * g.scale)}px; }
  /* Banner / header image must fit page width and not overflow */
  #print-root img { max-width: 100% !important; height: auto !important; }
  /* Avoid splitting rows / header blocks across pages */
  #print-root tr, #print-root thead { page-break-inside: avoid; }
  #print-root h1 { margin: 0; }
  /* A5: dial down headings inline-style by overriding font-size */
  ${g.scale !== 1 ? `#print-root h1 { font-size: calc(1em * ${g.scale * 1.6}) !important; }
  #print-root p { font-size: calc(1em * ${g.scale}) !important; }` : ""}
</style></head><body>
<div id="print-root">${printArea.innerHTML}</div>
<script>window.addEventListener('load',()=>{setTimeout(()=>window.print(),50);});</script>
</body></html>`);
  w.document.close();
}

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}