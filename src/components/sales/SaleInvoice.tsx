import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { computeSaleTotals } from "@/lib/saleTotals";

interface SaleInvoiceProps {
  sale: any;
  items: any[];
  settings: Record<string, any>;
  onPrint: () => void;
  payments?: any[];
}

const numberToWords = (num: number): string => {
  if (num === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const convert = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "");
    if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + convert(n % 100000) : "");
    return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + convert(n % 10000000) : "");
  };

  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);
  let result = convert(intPart) + " Taka";
  if (decPart > 0) result += " and " + convert(decPart) + " Paisa";
  return result + " Only";
};

// Merge sale items that share the same product/variation/unit_price/discount.
// Quantities are summed, totals are summed, and serial numbers (IMEIs) are
// collected into an array so they can be listed inside the same row.
function mergeItems(items: any[]) {
  const map = new Map<string, any>();
  for (const it of items) {
    const key = [
      it.product_id,
      it.variation_id ?? "",
      Number(it.unit_price),
      Number(it.discount ?? 0),
    ].join("|");
    const existing = map.get(key);
    const serial = it.serial_number ? String(it.serial_number).trim() : "";
    if (existing) {
      existing.quantity = Number(existing.quantity) + Number(it.quantity);
      existing.total = Number(existing.total ?? 0) + Number(it.total ?? 0);
      if (serial) existing.serials.push(serial);
    } else {
      map.set(key, {
        ...it,
        quantity: Number(it.quantity),
        total: Number(it.total ?? 0),
        serials: serial ? [serial] : [],
      });
    }
  }
  return Array.from(map.values());
}

export function SaleInvoice({ sale, items, settings, onPrint, payments = [] }: SaleInvoiceProps) {
  const business = settings?.business || {};
  const branding = settings?.cms_branding || {};
  const tpl = settings?.invoice || {};
  const businessName =
    business.company_name || business.business_name ||
    settings?.business_name || branding.brand_name || "Business Name";
  const businessAddress = business.address || settings?.business_address || "";
  const businessPhone = business.phone || settings?.business_phone || "";
  const businessEmail = business.email || settings?.business_email || "";
  const businessWebsite = business.website || "";
  const businessTax = business.tax_number || "";
  const businessLogo = normalizeStorageUrl(
    business.logo_url || settings?.business_logo || settings?.logo_url ||
    branding.logo_url || "");
  const terms = tpl.terms || settings?.invoice_terms || "Goods once sold will not be taken back without valid reason. Warranty as per product terms.";

  const saleDate = new Date(sale.sale_date);
  const { total, paid, balance } = computeSaleTotals(sale, payments);

  const merged = mergeItems(items);
  const totalQty = merged.reduce((s, r) => s + Number(r.quantity || 0), 0);

  // Template options with safe defaults
  const template = tpl.template || "classic";
  const headerPosition = tpl.header_position || "top";
  const logoSizePx: Record<string, number> = { sm: 50, md: 70, lg: 100 };
  const logoRadiusMap: Record<string, string> = { square: "4px", rounded: "12px", circle: "50%" };
  const headingPxMap: Record<string, number> = { sm: 18, md: 22, lg: 28 };
  const fontMap: Record<string, string> = {
    inter: "Inter, sans-serif", roboto: "Roboto, sans-serif",
    lato: "Lato, sans-serif", poppins: "Poppins, sans-serif",
    serif: "Georgia, serif", mono: "ui-monospace, monospace",
  };
  const logoSize = logoSizePx[tpl.logo_size as string] || 70;
  const logoRadius = logoRadiusMap[tpl.logo_shape as string] || "4px";
  const headingSize = headingPxMap[tpl.heading_size as string] || 22;
  const fontFamily = fontMap[tpl.font_family as string] || fontMap.inter;
  const ACCENT = tpl.accent_color || "#8b7cf6";
  const hexToRgba = (hex: string, a: number) => {
    const m = String(hex).replace("#", "");
    if (m.length < 6) return `rgba(139,124,246,${a})`;
    const r = parseInt(m.substring(0, 2), 16); const g = parseInt(m.substring(2, 4), 16); const b = parseInt(m.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  };
  const BAND_BG = hexToRgba(ACCENT, 0.15);
  const showLogo = tpl.show_logo !== false;
  const showAddress = tpl.show_business_address !== false;
  const showPhone = tpl.show_business_phone !== false;
  const showEmail = tpl.show_business_email !== false;
  const showWebsite = tpl.show_business_website !== false;
  const showTaxId = tpl.show_business_tax !== false;
  const headerImageUrl = tpl.header_image_url || "";

  const LogoBox = () => showLogo ? (
    businessLogo ? (
      <img src={businessLogo} alt={businessName} style={{ maxWidth: `${logoSize}px`, maxHeight: `${logoSize}px`, objectFit: "contain", borderRadius: logoRadius }} />
    ) : (
      <div style={{ width: `${logoSize}px`, height: `${logoSize}px`, border: `2px solid ${ACCENT}`, borderRadius: logoRadius, display: "flex", alignItems: "center", justifyContent: "center", color: ACCENT, fontWeight: "bold", fontSize: "11px" }}>
        LOGO
      </div>
    )
  ) : null;

  const headerTextColor = headerPosition === "top-band" ? "#fff" : "#1f2937";
  const subTextColor = headerPosition === "top-band" ? "rgba(255,255,255,0.9)" : "#4b5563";

  const BusinessInfo = ({ align }: { align: "left" | "right" | "center" }) => (
    <div style={{ textAlign: align }}>
      <h1 style={{ fontSize: `${headingSize}px`, fontWeight: "bold", margin: 0, color: headerTextColor }}>{businessName}</h1>
      {showAddress && businessAddress && <p style={{ fontSize: "12px", color: subTextColor, margin: "2px 0" }}>{businessAddress}</p>}
      {(showPhone && businessPhone) || (showEmail && businessEmail) ? (
        <p style={{ fontSize: "12px", color: subTextColor, margin: "2px 0" }}>
          {showPhone && businessPhone && <>Phone: {businessPhone}</>}
          {showPhone && businessPhone && showEmail && businessEmail && " · "}
          {showEmail && businessEmail && <>Email: {businessEmail}</>}
        </p>
      ) : null}
      {showWebsite && businessWebsite && (
        <p style={{ fontSize: "12px", color: subTextColor, margin: "2px 0" }}>{businessWebsite}</p>
      )}
      {showTaxId && businessTax && (
        <p style={{ fontSize: "12px", color: subTextColor, margin: "2px 0" }}>TIN/VAT: {businessTax}</p>
      )}
    </div>
  );

  const renderHeaderInner = () => {
    if (headerImageUrl) {
      return <img src={headerImageUrl} alt={businessName} style={{ width: "100%", maxHeight: "180px", objectFit: "contain", display: "block" }} />;
    }
    if (template === "centered") {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
          <LogoBox />
          <BusinessInfo align="center" />
        </div>
      );
    }
    if (template === "modern") {
      return (
        <div style={{ display: "grid", gridTemplateColumns: `1fr ${logoSize + 10}px`, gap: "16px", alignItems: "center" }}>
          <BusinessInfo align="left" />
          <div style={{ display: "flex", justifyContent: "flex-end" }}><LogoBox /></div>
        </div>
      );
    }
    if (template === "compact") {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <LogoBox />
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: `${headingSize}px`, fontWeight: "bold", margin: 0, color: headerTextColor }}>{businessName}</h1>
            <p style={{ fontSize: "11px", color: subTextColor, margin: "2px 0" }}>
              {[showAddress && businessAddress, showPhone && businessPhone, showEmail && businessEmail, showWebsite && businessWebsite, showTaxId && businessTax && `TIN/VAT: ${businessTax}`].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
      );
    }
    // classic (default)
    return (
      <div style={{ display: "grid", gridTemplateColumns: `${logoSize + 10}px 1fr`, gap: "16px", alignItems: "center" }}>
        <LogoBox />
        <BusinessInfo align="right" />
      </div>
    );
  };

  const headerWrapStyle: React.CSSProperties =
    headerPosition === "top-band"
      ? { background: ACCENT, color: "#fff", padding: "14px 16px", marginBottom: "8px" }
      : headerPosition === "boxed"
      ? { border: `1px solid ${ACCENT}`, borderRadius: "8px", padding: "14px", marginBottom: "8px" }
      : { marginBottom: "8px" };

  return (
    <div className="p-6" style={{ fontFamily }}>
      <div className="flex justify-end mb-4 no-print">
        <Button onClick={onPrint}><Printer className="h-4 w-4 mr-2" /> Print</Button>
      </div>

      <div id="invoice-print-area">
        {/* Header */}
        <div style={headerWrapStyle}>
          {renderHeaderInner()}
        </div>

        {/* Invoice band */}
        <div style={{ background: BAND_BG, color: ACCENT, textAlign: "center", padding: "6px 0", fontStyle: "italic", fontWeight: 600, letterSpacing: "1px", margin: "10px 0" }}>
          Invoice
        </div>

        {/* Bill To & Invoice Details */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "12px" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: "12px", color: "#374151", borderBottom: `1px solid ${ACCENT}`, paddingBottom: "2px", marginBottom: "4px" }}>Bill To</div>
            <p style={{ fontWeight: "bold", margin: "2px 0", fontSize: "13px" }}>{sale.customers?.name || "Walk-in Customer"}</p>
            {sale.customers?.address && <p style={{ fontSize: "12px", margin: "2px 0" }}>{sale.customers.address}</p>}
            {sale.customers?.phone && <p style={{ fontSize: "12px", margin: "2px 0" }}>Contact No.: {sale.customers.phone}</p>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 600, fontSize: "12px", color: "#374151", borderBottom: `1px solid ${ACCENT}`, paddingBottom: "2px", marginBottom: "4px" }}>Invoice Details</div>
            <p style={{ margin: "2px 0", fontSize: "12px" }}>Invoice No.: {sale.invoice_number}</p>
            <p style={{ margin: "2px 0", fontSize: "12px" }}>Date: {saleDate.toLocaleDateString()}</p>
            <p style={{ margin: "2px 0", fontSize: "12px" }}>Time: {saleDate.toLocaleTimeString()}</p>
          </div>
        </div>

        {/* Items Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px", fontSize: "12px" }}>
          <thead>
            <tr style={{ background: ACCENT, color: "#fff" }}>
              <th style={{ padding: "8px", textAlign: "center", width: "32px" }}>#</th>
              <th style={{ padding: "8px", textAlign: "left" }}>Item name</th>
              <th style={{ padding: "8px", textAlign: "left" }}>Item Code</th>
              <th style={{ padding: "8px", textAlign: "center" }}>Quantity</th>
              <th style={{ padding: "8px", textAlign: "center" }}>Unit</th>
              <th style={{ padding: "8px", textAlign: "right" }}>Price/ Unit</th>
              <th style={{ padding: "8px", textAlign: "right" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {merged.map((item: any, idx: number) => {
              const lineTotal = Number(item.unit_price) * Number(item.quantity) * (1 - Number(item.discount ?? 0) / 100);
              return (
                <tr key={idx} style={{ borderBottom: "1px solid #e5e7eb", verticalAlign: "top" }}>
                  <td style={{ padding: "8px", textAlign: "center" }}>{idx + 1}</td>
                  <td style={{ padding: "8px" }}>
                    <div style={{ fontWeight: "bold" }}>
                      {item.products?.name || "—"}
                      {item.product_variations?.name ? ` (${item.product_variations.name})` : ""}
                    </div>
                    {item.serials.length > 0 && (
                      <div style={{ fontSize: "11px", color: "#4b5563", marginTop: "2px" }}>
                        Serial no.:{" "}
                        {item.serials.join(", ")}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "8px" }}>{item.products?.sku || item.products?.barcode || "-"}</td>
                  <td style={{ padding: "8px", textAlign: "center" }}>{item.quantity}</td>
                  <td style={{ padding: "8px", textAlign: "center" }}>Pcs</td>
                  <td style={{ padding: "8px", textAlign: "right" }}>৳ {Number(item.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style={{ padding: "8px", textAlign: "right", fontWeight: "bold" }}>৳ {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              );
            })}
            <tr style={{ background: "#f9fafb", fontWeight: "bold" }}>
              <td style={{ padding: "8px" }}></td>
              <td style={{ padding: "8px" }}>Total</td>
              <td style={{ padding: "8px" }}></td>
              <td style={{ padding: "8px", textAlign: "center" }}>{totalQty}</td>
              <td style={{ padding: "8px" }}></td>
              <td style={{ padding: "8px" }}></td>
              <td style={{ padding: "8px", textAlign: "right" }}>৳ {Number(sale.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>

        {/* Payments breakdown */}
        {payments.length > 0 && (
          <div style={{ marginBottom: "12px" }}>
            <div style={{ background: ACCENT, color: "#fff", padding: "6px 10px", fontSize: "12px", fontWeight: 600 }}>Payments</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: BAND_BG }}>
                  <th style={{ padding: "6px 8px", textAlign: "center", width: "32px" }}>#</th>
                  <th style={{ padding: "6px 8px", textAlign: "left" }}>Date</th>
                  <th style={{ padding: "6px 8px", textAlign: "left" }}>Method</th>
                  <th style={{ padding: "6px 8px", textAlign: "left" }}>Note</th>
                  <th style={{ padding: "6px 8px", textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p: any, idx: number) => (
                  <tr key={p.id ?? idx} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "6px 8px", textAlign: "center" }}>{idx + 1}</td>
                    <td style={{ padding: "6px 8px" }}>{p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}</td>
                    <td style={{ padding: "6px 8px", textTransform: "capitalize" }}>{p.payment_method || "—"}</td>
                    <td style={{ padding: "6px 8px", color: "#4b5563" }}>{p.payment_note || "—"}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>৳ {Number(p.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
                <tr style={{ background: "#f9fafb", fontWeight: "bold" }}>
                  <td style={{ padding: "6px 8px" }} colSpan={4}>Received</td>
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>৳ {paid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Words band + Amounts band side-by-side headers */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "8px" }}>
          <div>
            <div style={{ background: ACCENT, color: "#fff", padding: "6px 10px", fontSize: "12px", fontWeight: 600 }}>Invoice Amount In Words:</div>
            <div style={{ background: BAND_BG, padding: "8px 10px", fontSize: "12px", minHeight: "40px" }}>
              {numberToWords(total)}
            </div>
          </div>
          <div>
            <div style={{ background: ACCENT, color: "#fff", padding: "6px 10px", fontSize: "12px", fontWeight: 600 }}>Amounts</div>
            <div style={{ padding: "0", fontSize: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 10px", borderBottom: "1px solid #e5e7eb" }}>
                <span>Sub Total</span><span>৳ {Number(sale.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              {Number(sale.discount_amount) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 10px", borderBottom: "1px solid #e5e7eb", color: "#dc2626" }}>
                  <span>Discount</span><span>- ৳ {Number(sale.discount_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
              {Number(sale.tax_amount) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 10px", borderBottom: "1px solid #e5e7eb" }}>
                  <span>Tax</span><span>৳ {Number(sale.tax_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
              {Number(sale.shipping_cost) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 10px", borderBottom: "1px solid #e5e7eb" }}>
                  <span>Shipping</span><span>৳ {Number(sale.shipping_cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", borderBottom: "1px solid #e5e7eb", fontWeight: "bold" }}>
                <span>Total</span><span>৳ {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 10px", borderBottom: "1px solid #e5e7eb" }}>
                <span>Received</span><span>৳ {paid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              {balance > 0 ? (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 10px", fontWeight: "bold", color: "#dc2626" }}>
                  <span>Balance Due</span><span>৳ {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              ) : balance < 0 ? (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 10px", fontWeight: "bold", color: "#059669" }}>
                  <span>Advance</span><span>৳ {Math.abs(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 10px", fontWeight: "bold", color: "#059669" }}>
                  <span>Paid in full</span><span>৳ 0.00</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Terms */}
        <div style={{ marginTop: "12px" }}>
          <div style={{ background: ACCENT, color: "#fff", padding: "6px 10px", fontSize: "12px", fontWeight: 600 }}>Terms and conditions</div>
          <div style={{ padding: "8px 10px", fontSize: "11px", color: "#374151", whiteSpace: "pre-wrap" }}>
            {terms}
          </div>
        </div>

        {/* Signature */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "40px" }}>
          <div style={{ textAlign: "center", minWidth: "220px" }}>
            <div style={{ fontSize: "12px", marginBottom: "48px" }}>For, {businessName}</div>
            <div style={{ borderTop: "1px solid #333", paddingTop: "4px", fontSize: "12px" }}>Authorized Signatory</div>
          </div>
        </div>
      </div>
    </div>
  );
}
