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

export function SaleInvoice({ sale, items, settings, onPrint }: SaleInvoiceProps) {
  const businessName = settings?.business_name || "Business Name";
  const businessAddress = settings?.business_address || "";
  const businessPhone = settings?.business_phone || "";
  const businessEmail = settings?.business_email || "";
  const terms = settings?.invoice_terms || "Goods once sold will not be taken back without valid reason. Warranty as per product terms.";

  const saleDate = new Date(sale.sale_date);

  return (
    <div className="p-6">
      <div className="flex justify-end mb-4 no-print">
        <Button onClick={onPrint}><Printer className="h-4 w-4 mr-2" /> Print</Button>
      </div>

      <div id="invoice-print-area">
        {/* Header */}
        <div className="text-center mb-4" style={{ borderBottom: "3px solid #333", paddingBottom: "12px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>{businessName}</h1>
          {businessAddress && <p style={{ fontSize: "13px", color: "#666", margin: "2px 0" }}>{businessAddress}</p>}
          <p style={{ fontSize: "12px", color: "#666", margin: "2px 0" }}>
            {businessPhone && `Phone: ${businessPhone}`}{businessPhone && businessEmail && " | "}{businessEmail && `Email: ${businessEmail}`}
          </p>
        </div>

        {/* Invoice Title */}
        <div className="text-center mb-4">
          <h2 style={{ fontSize: "20px", fontWeight: "bold", letterSpacing: "2px", margin: 0 }}>INVOICE</h2>
        </div>

        {/* Invoice Info & Customer */}
        <div className="grid-2 mb-4" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div>
            <h2 style={{ fontSize: "12px", fontWeight: "bold", color: "#666", marginBottom: "4px" }}>BILL TO</h2>
            <p style={{ fontWeight: "bold", margin: "2px 0" }}>{sale.customers?.name || "Walk-in Customer"}</p>
            {sale.customers?.phone && <p style={{ fontSize: "12px", margin: "2px 0" }}>Phone: {sale.customers.phone}</p>}
            {sale.customers?.address && <p style={{ fontSize: "12px", margin: "2px 0" }}>{sale.customers.address}</p>}
            {sale.customers?.email && <p style={{ fontSize: "12px", margin: "2px 0" }}>{sale.customers.email}</p>}
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: "2px 0", fontSize: "13px" }}><strong>Invoice No:</strong> {sale.invoice_number}</p>
            <p style={{ margin: "2px 0", fontSize: "13px" }}><strong>Date:</strong> {saleDate.toLocaleDateString()}</p>
            <p style={{ margin: "2px 0", fontSize: "13px" }}><strong>Time:</strong> {saleDate.toLocaleTimeString()}</p>
            <p style={{ margin: "2px 0", fontSize: "13px" }}><strong>Payment:</strong> {sale.payment_method || "Cash"}</p>
            <p style={{ margin: "2px 0", fontSize: "13px" }}><strong>Status:</strong> {sale.payment_status}</p>
          </div>
        </div>

        {/* Items Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              <th style={{ padding: "8px", textAlign: "left", borderBottom: "2px solid #d1d5db", fontSize: "12px" }}>#</th>
              <th style={{ padding: "8px", textAlign: "left", borderBottom: "2px solid #d1d5db", fontSize: "12px" }}>Item Description</th>
              <th style={{ padding: "8px", textAlign: "center", borderBottom: "2px solid #d1d5db", fontSize: "12px" }}>Qty</th>
              <th style={{ padding: "8px", textAlign: "right", borderBottom: "2px solid #d1d5db", fontSize: "12px" }}>Price/Unit</th>
              <th style={{ padding: "8px", textAlign: "right", borderBottom: "2px solid #d1d5db", fontSize: "12px" }}>Disc%</th>
              <th style={{ padding: "8px", textAlign: "right", borderBottom: "2px solid #d1d5db", fontSize: "12px" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any, idx: number) => {
              const afterDiscount = Number(item.unit_price) * Number(item.quantity) * (1 - Number(item.discount) / 100);
              return (
                <tr key={item.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "8px", fontSize: "12px" }}>{idx + 1}</td>
                  <td style={{ padding: "8px", fontSize: "12px" }}>
                    <strong>{item.products?.name || "—"}</strong>
                    {item.serial_number && (
                      <div style={{ fontSize: "11px", color: "#666" }}>S/N: {item.serial_number}</div>
                    )}
                    {item.product_variations?.name && (
                      <div style={{ fontSize: "11px", color: "#666" }}>Variant: {item.product_variations.name}</div>
                    )}
                  </td>
                  <td style={{ padding: "8px", textAlign: "center", fontSize: "12px" }}>{item.quantity}</td>
                  <td style={{ padding: "8px", textAlign: "right", fontSize: "12px" }}>৳{Number(item.unit_price).toLocaleString()}</td>
                  <td style={{ padding: "8px", textAlign: "right", fontSize: "12px" }}>{item.discount}%</td>
                  <td style={{ padding: "8px", textAlign: "right", fontSize: "12px", fontWeight: "bold" }}>৳{afterDiscount.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ width: "280px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "13px" }}>
              <span>Sub Total</span><span>৳{Number(sale.subtotal).toLocaleString()}</span>
            </div>
            {Number(sale.discount_amount) > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "13px", color: "#dc2626" }}>
                <span>Discount</span><span>-৳{Number(sale.discount_amount).toLocaleString()}</span>
              </div>
            )}
            {Number(sale.tax_amount) > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "13px" }}>
                <span>Tax</span><span>+৳{Number(sale.tax_amount).toLocaleString()}</span>
              </div>
            )}
            {Number(sale.shipping_cost) > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "13px" }}>
                <span>Shipping</span><span>+৳{Number(sale.shipping_cost).toLocaleString()}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: "16px", fontWeight: "bold", borderTop: "2px solid #333", marginTop: "4px" }}>
              <span>Grand Total</span><span>৳{Number(sale.total_amount).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Amount in Words */}
        <div style={{ background: "#f9fafb", padding: "8px 12px", margin: "16px 0", borderRadius: "4px", fontSize: "12px" }}>
          <strong>In Words:</strong> {numberToWords(Number(sale.total_amount))}
        </div>

        {/* Terms */}
        <div style={{ marginTop: "24px", fontSize: "11px", color: "#666" }}>
          <strong>Terms & Conditions:</strong>
          <p style={{ margin: "4px 0" }}>{terms}</p>
        </div>

        {/* Signature */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", marginTop: "48px" }}>
          <div style={{ borderTop: "1px solid #333", paddingTop: "8px", textAlign: "center", fontSize: "12px" }}>
            Customer Signature
          </div>
          <div style={{ borderTop: "1px solid #333", paddingTop: "8px", textAlign: "center", fontSize: "12px" }}>
            Authorized Signatory
          </div>
        </div>
      </div>
    </div>
  );
}
