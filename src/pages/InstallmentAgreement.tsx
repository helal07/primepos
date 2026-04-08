import { useParams, useNavigate } from "react-router-dom";
import { useInstallmentSales, useInstallmentSchedules, useInstallmentCustomers } from "@/hooks/useInstallments";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";

export default function InstallmentAgreement() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: sales } = useInstallmentSales();
  const { data: schedules } = useInstallmentSchedules(id || null);
  const { data: instCustomers } = useInstallmentCustomers();

  const sale = sales?.find((s: any) => s.id === id);
  const ic = instCustomers?.find((c: any) => c.id === sale?.installment_customer_id);

  if (!sale) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div>
      <div className="flex gap-3 mb-4 print:hidden">
        <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
        <Button onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" /> Print</Button>
      </div>

      <div className="max-w-4xl mx-auto bg-white text-black p-8 border print:border-0 print:shadow-none space-y-6" id="agreement">
        {/* Header */}
        <div className="text-center border-b pb-4">
          <h1 className="text-2xl font-bold">Prime POS</h1>
          <p className="text-sm text-gray-600">Installment Sale Agreement</p>
          <p className="text-sm font-medium mt-1">Invoice: {sale.invoice_no}</p>
          <p className="text-sm text-gray-500">Date: {sale.sale_date}</p>
        </div>

        {/* Customer & Product */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <h3 className="font-bold text-sm border-b pb-1">Customer Details</h3>
            {ic?.photo_url && <img src={ic.photo_url} alt="Customer" className="w-20 h-20 rounded object-cover" />}
            <p><strong>Name:</strong> {sale.customers?.name}</p>
            <p><strong>Phone:</strong> {sale.customers?.phone}</p>
            {ic?.permanent_address && <p><strong>Address:</strong> {ic.permanent_address}</p>}
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-sm border-b pb-1">Product Details</h3>
            {sale.products?.image_url && <img src={sale.products.image_url} alt="Product" className="w-20 h-20 rounded object-cover" />}
            <p><strong>Product:</strong> {sale.products?.name}</p>
            {sale.imei_serial && <p><strong>IMEI/Serial:</strong> {sale.imei_serial}</p>}
            <p><strong>Price:</strong> {Number(sale.price).toFixed(2)}</p>
          </div>
        </div>

        {/* Guarantor */}
        {ic?.guarantor_name && (
          <div className="space-y-2">
            <h3 className="font-bold text-sm border-b pb-1">Guarantor Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                {ic.guarantor_photo_url && <img src={ic.guarantor_photo_url} alt="Guarantor" className="w-16 h-16 rounded object-cover mb-2" />}
                <p><strong>Name:</strong> {ic.guarantor_name}</p>
                <p><strong>Mobile:</strong> {ic.guarantor_mobile}</p>
              </div>
              <div>
                {ic.guarantor_permanent_address && <p><strong>Address:</strong> {ic.guarantor_permanent_address}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Financial Summary */}
        <div className="space-y-1">
          <h3 className="font-bold text-sm border-b pb-1">Financial Summary</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p>Price: {Number(sale.price).toFixed(2)}</p>
            <p>Discount: {Number(sale.discount).toFixed(2)}</p>
            <p>Interest: {Number(sale.interest_percent)}%</p>
            <p>Shipping: {Number(sale.shipping_cost).toFixed(2)}</p>
            <p className="font-bold">Total: {Number(sale.total_amount).toFixed(2)}</p>
            <p>Down Payment: {Number(sale.down_payment).toFixed(2)}</p>
            <p className="font-bold">Remaining: {Number(sale.remaining_amount).toFixed(2)}</p>
            <p>Installments: {sale.num_installments} × {sale.installment_duration_days} days</p>
          </div>
        </div>

        {/* Schedule */}
        <div>
          <h3 className="font-bold text-sm border-b pb-1 mb-2">Payment Schedule</h3>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-1">SN</th>
                <th className="text-left p-1">Due Date</th>
                <th className="text-right p-1">Amount</th>
                <th className="text-right p-1">Paid</th>
                <th className="text-left p-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {schedules?.map((s: any) => (
                <tr key={s.id} className="border-b">
                  <td className="p-1">{s.serial_no}</td>
                  <td className="p-1">{s.due_date}</td>
                  <td className="p-1 text-right">{Number(s.amount).toFixed(2)}</td>
                  <td className="p-1 text-right">{Number(s.paid_amount || 0).toFixed(2)}</td>
                  <td className="p-1">{s.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-3 gap-8 pt-12 text-center text-sm">
          <div className="border-t pt-2">
            <p className="font-medium">Customer Signature</p>
            <p className="text-gray-500">{sale.customers?.name}</p>
          </div>
          <div className="border-t pt-2">
            <p className="font-medium">Guarantor Signature</p>
            <p className="text-gray-500">{ic?.guarantor_name || "—"}</p>
          </div>
          <div className="border-t pt-2">
            <p className="font-medium">Authorized Signature</p>
            <p className="text-gray-500">Prime POS</p>
          </div>
        </div>
      </div>
    </div>
  );
}
