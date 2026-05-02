import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface SaleInvoiceProps {
  sale: any;
  items: any[];
  settings: Record<string, any>;
  onPrint: () => void;
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

export function SaleInvoice({ sale, items, settings, onPrint }: SaleInvoiceProps) {
  const businessName = settings?.business_name || "Business Name";
  const businessAddress = settings?.business_address || "";
  const businessPhone = settings?.business_phone || "";
  const businessEmail = settings?.business_email || "";
  const businessLogo = settings?.business_logo || settings?.logo_url || "";
  const terms = settings?.invoice_terms || "Goods once sold will not be taken back without valid reason. Warranty as per product terms.";

  const saleDate = new Date(sale.sale_date);
  const total = Number(sale.total_amount) || 0;
  // Sales schema doesn't have a paid_amount column — derive it.
  const paid =
    sale.paid_amount != null
      ? Number(sale.paid_amount)
      : sale.payment_status === "paid"
      ? total
      : sale.payment_status === "partial"
      ? Math.max(0, total - (Number(sale.due_amount) || 0))
      : 0;
  const balance = Math.max(0, total - paid);

  const merged = mergeItems(items);
  const totalQty = merged.reduce((s, r) => s + Number(r.quantity || 0), 0);

  const ACCENT = "#8b7cf6"; // soft purple, matches reference
  const BAND_BG = "#efeaff";

  return (
    <div className="p-6">
      <div className="flex justify-end mb-4 no-print">
        <Button onClick={onPrint}><Printer className="h-4 w-4 mr-2" /> Print</Button>
      </div>

      <div id="invoice-print-area">
        {/* Header: logo left, business right */}
        <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "16px", alignItems: "center", marginBottom: "8px" }}>
          <div>
            {businessLogo ? (
              <img src={businessLogo} alt={businessName} style={{ maxWidth: "70px", maxHeight: "70px", objectFit: "contain" }} />
            ) : (
              <div style={{ width: "70px", height: "70px", border: `2px solid ${ACCENT}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: ACCENT, fontWeight: "bold", fontSize: "11px" }}>
                LOGO
              </div>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <h1 style={{ fontSize: "22px", fontWeight: "bold", margin: 0, color: "#1f2937" }}>{businessName}</h1>
            {businessAddress && <p style={{ fontSize: "12px", color: "#4b5563", margin: "2px 0" }}>{businessAddress}</p>}
            <p style={{ fontSize: "12px", color: "#4b5563", margin: "2px 0" }}>
              {businessPhone && <>Phone no.: {businessPhone}</>}
              {businessPhone && businessEmail && " "}
              {businessEmail && <>Email: {businessEmail}</>}
            </p>
          </div>
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
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 10px", fontWeight: "bold" }}>
                <span>Balance</span><span>৳ {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
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
