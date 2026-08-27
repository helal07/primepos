import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useInstallmentSale, useInstallmentSchedules, useInstallmentCustomers } from "@/hooks/useInstallments";
import { useSettings } from "@/hooks/useSettings";
import { signedUrl, normalizeStorageUrl } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";

/** Signed URL for a private bucket path (pass-through for absolute URLs). */
async function getSignedUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  try {
    return await signedUrl("installment-docs", path, 60);
  } catch {
    return null;
  }
}

const money = (v: any) => Number(v || 0).toFixed(2);
const fmtDate = (v: any) => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

export default function InstallmentAgreement() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const scheduleOnly = params.get("only") === "schedule";

  const { data: sale } = useInstallmentSale(id || null);
  const { data: schedules } = useInstallmentSchedules(id || null);
  const { data: instCustomers } = useInstallmentCustomers();
  const { data: settings } = useSettings();

  const business = settings?.business || {};
  const branding = settings?.cms_branding || {};
  const businessName =
    business.company_name || business.business_name || settings?.business_name || branding.brand_name || "Prime POS";
  const businessAddress = business.address || settings?.business_address || "";
  const businessPhone = business.phone || settings?.business_phone || "";
  const businessLogo = normalizeStorageUrl(
    business.logo_url || settings?.business_logo || settings?.logo_url || branding.logo_url || "",
  );

  const ic =
    (sale as any)?.installment_customers ||
    instCustomers?.find((c: any) => c.id === sale?.installment_customer_id);
  const customer = (sale as any)?.customers || (sale as any)?.customer;
  const product = (sale as any)?.products || (sale as any)?.product;

  const [urls, setUrls] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (!ic) return;
    (async () => {
      const [photo, gPhoto, nid, gNid] = await Promise.all([
        getSignedUrl(ic.photo_url),
        getSignedUrl(ic.guarantor_photo_url),
        getSignedUrl(ic.nid_url),
        getSignedUrl(ic.guarantor_nid_url),
      ]);
      setUrls({ photo, gPhoto, nid, gNid });
    })();
  }, [ic]);

  if (!sale) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  const rows = schedules ?? [];
  const totalDue = rows.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
  const totalPaid = rows.reduce((s: number, r: any) => s + Number(r.paid_amount || 0), 0);
  const outstanding = Math.max(0, totalDue - totalPaid);
  const paidCount = rows.filter((r: any) => r.status === "paid").length;

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4 print:hidden">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" /> Print {scheduleOnly ? "Schedule" : "Agreement"}
        </Button>
      </div>

      <div
        className="mx-auto bg-white text-black p-8 border print:border-0 print:shadow-none space-y-5"
        style={{ maxWidth: "210mm" }}
        id="agreement"
      >
        {/* Header — dynamic business branding */}
        <div className="flex items-start justify-between border-b pb-4 gap-4">
          <div className="flex items-center gap-3">
            {businessLogo && (
              <img src={businessLogo} alt={businessName} className="h-16 w-16 object-contain" />
            )}
            <div>
              <h1 className="text-xl font-bold">{businessName}</h1>
              {businessAddress && <p className="text-xs text-gray-600">{businessAddress}</p>}
              {businessPhone && <p className="text-xs text-gray-600">Phone: {businessPhone}</p>}
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold uppercase tracking-wide">
              {scheduleOnly ? "Installment Payment Schedule" : "Installment Sale Agreement"}
            </p>
            <p>Invoice: <strong>{sale.invoice_no || sale.invoice_number || "—"}</strong></p>
            <p>Date: {fmtDate(sale.sale_date || sale.start_date || sale.created_at)}</p>
            <p>Status: <span className="uppercase">{sale.status || "active"}</span></p>
          </div>
        </div>

        {!scheduleOnly && (
          <>
            {/* Customer & Product */}
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div className="space-y-1">
                <h3 className="font-bold border-b pb-1 mb-2">Customer Details</h3>
                {urls.photo && <img src={urls.photo} alt="Customer" className="w-20 h-20 rounded object-cover mb-2" />}
                <p><strong>Name:</strong> {customer?.name || ic?.name || "—"}</p>
                <p><strong>Phone:</strong> {customer?.phone || ic?.phone || "—"}</p>
                {ic?.permanent_address && <p><strong>Permanent:</strong> {ic.permanent_address}</p>}
                {ic?.work_address && <p><strong>Work:</strong> {ic.work_address}</p>}
                {urls.nid && <img src={urls.nid} alt="Customer NID" className="w-32 h-20 object-cover rounded border mt-1" />}
              </div>
              <div className="space-y-1">
                <h3 className="font-bold border-b pb-1 mb-2">Product Details</h3>
                {product?.image_url && (
                  <img src={normalizeStorageUrl(product.image_url)} alt="Product" className="w-20 h-20 rounded object-cover mb-2" />
                )}
                <p><strong>Product:</strong> {product?.name || "—"}</p>
                {sale.imei_serial && <p><strong>IMEI/Serial:</strong> {sale.imei_serial}</p>}
                <p><strong>Price:</strong> {money(sale.price)}</p>
              </div>
            </div>

            {/* Guarantor */}
            {ic?.guarantor_name && (
              <div className="text-sm">
                <h3 className="font-bold border-b pb-1 mb-2">Guarantor Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    {urls.gPhoto && <img src={urls.gPhoto} alt="Guarantor" className="w-16 h-16 rounded object-cover mb-1" />}
                    <p><strong>Name:</strong> {ic.guarantor_name}</p>
                    <p><strong>Mobile:</strong> {ic.guarantor_mobile || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    {ic.guarantor_present_address && <p><strong>Present:</strong> {ic.guarantor_present_address}</p>}
                    {ic.guarantor_permanent_address && <p><strong>Permanent:</strong> {ic.guarantor_permanent_address}</p>}
                    {urls.gNid && <img src={urls.gNid} alt="Guarantor NID" className="w-32 h-20 object-cover rounded border mt-1" />}
                  </div>
                </div>
              </div>
            )}

            {/* Financial Summary */}
            <div className="text-sm">
              <h3 className="font-bold border-b pb-1 mb-2">Financial Summary</h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                <p>Price: {money(sale.price)}</p>
                <p>Discount: {money(sale.discount)}</p>
                <p>Interest: {Number(sale.interest_percent || 0)}%</p>
                <p>Shipping: {money(sale.shipping_cost)}</p>
                <p className="font-bold">Total: {money(sale.total_amount)}</p>
                <p>Down Payment: {money(sale.down_payment)}</p>
                <p className="font-bold">Financed: {money(sale.remaining_amount)}</p>
                <p>Installments: {sale.num_installments} × {sale.installment_duration_days} days</p>
              </div>
            </div>
          </>
        )}

        {/* Payment status */}
        <div className="grid grid-cols-4 gap-3 text-sm">
          {[
            ["Scheduled", money(totalDue)],
            ["Collected", money(totalPaid)],
            ["Outstanding", money(outstanding)],
            ["Paid Installments", `${paidCount} / ${rows.length}`],
          ].map(([k, v]) => (
            <div key={k} className="border rounded p-2">
              <p className="text-xs text-gray-500">{k}</p>
              <p className="font-bold">{v}</p>
            </div>
          ))}
        </div>

        {/* Schedule */}
        <div>
          <h3 className="font-bold text-sm border-b pb-1 mb-2">Payment Schedule</h3>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-1">SN</th>
                <th className="text-left p-1">Due Date</th>
                <th className="text-right p-1">Amount</th>
                <th className="text-right p-1">Paid</th>
                <th className="text-right p-1">Balance</th>
                <th className="text-left p-1">Status</th>
                <th className="text-left p-1">Signature</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s: any) => (
                <tr key={s.id} className="border-b">
                  <td className="p-1">{s.serial_no ?? s.installment_no}</td>
                  <td className="p-1">{fmtDate(s.due_date)}</td>
                  <td className="p-1 text-right">{money(s.amount)}</td>
                  <td className="p-1 text-right">{money(s.paid_amount)}</td>
                  <td className="p-1 text-right">{money(Number(s.amount || 0) - Number(s.paid_amount || 0))}</td>
                  <td className="p-1 capitalize">{s.status}</td>
                  <td className="p-1" />
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={7} className="p-3 text-center text-gray-500">No schedule generated</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {!scheduleOnly && (
          <div className="grid grid-cols-3 gap-8 pt-12 text-center text-sm">
            <div className="border-t pt-2">
              <p className="font-medium">Customer Signature</p>
              <p className="text-gray-500">{customer?.name || ic?.name || "—"}</p>
            </div>
            <div className="border-t pt-2">
              <p className="font-medium">Guarantor Signature</p>
              <p className="text-gray-500">{ic?.guarantor_name || "—"}</p>
            </div>
            <div className="border-t pt-2">
              <p className="font-medium">Authorized Signature</p>
              <p className="text-gray-500">{businessName}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
