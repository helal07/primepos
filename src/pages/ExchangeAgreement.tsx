import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { format } from "date-fns";
import { useSettings } from "@/hooks/useSettings";

function numberToWordsBn(n: number): string {
  // Simple english words (kept generic for any locale)
  if (!n || isNaN(n)) return "";
  const a = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const b = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  const inWords = (num: number): string => {
    if (num < 20) return a[num];
    if (num < 100) return b[Math.floor(num/10)] + (num%10 ? " " + a[num%10] : "");
    if (num < 1000) return a[Math.floor(num/100)] + " Hundred" + (num%100 ? " " + inWords(num%100) : "");
    if (num < 100000) return inWords(Math.floor(num/1000)) + " Thousand" + (num%1000 ? " " + inWords(num%1000) : "");
    if (num < 10000000) return inWords(Math.floor(num/100000)) + " Lakh" + (num%100000 ? " " + inWords(num%100000) : "");
    return inWords(Math.floor(num/10000000)) + " Crore" + (num%10000000 ? " " + inWords(num%10000000) : "");
  };
  return inWords(Math.floor(n)) + " Taka Only";
}

export default function ExchangeAgreement() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: settings } = useSettings();

  const { data: r } = useQuery({
    queryKey: ["exchange_purchase", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("exchange_purchases").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    document.title = r ? `Agreement ${r.reference_no}` : "Agreement";
  }, [r]);

  if (!r) return <div className="py-10 text-center text-muted-foreground">Loading…</div>;

  const biz: any = settings || {};
  const bizName = biz.business_name || biz.name || "Our Business";
  const bizAddr = biz.address || "";
  const bizPhone = biz.phone || "";

  return (
    <div className="max-w-3xl mx-auto py-4 px-4 print:p-0">
      <div className="flex justify-between mb-4 print:hidden">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        <Button size="sm" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Print</Button>
      </div>

      <div className="border rounded p-8 bg-white text-black space-y-4 print:border-0 print:shadow-none">
        <div className="text-center border-b pb-3">
          <h1 className="text-xl font-bold">{bizName}</h1>
          {bizAddr && <p className="text-sm">{bizAddr}</p>}
          {bizPhone && <p className="text-sm">Phone: {bizPhone}</p>}
          <h2 className="text-lg font-semibold mt-3 underline">USED DEVICE BUYING AGREEMENT</h2>
          <p className="text-xs mt-1">Reference: {r.reference_no} • Date: {format(new Date(r.purchase_date), "dd MMM yyyy")}</p>
        </div>

        <p className="text-sm leading-6">
          This agreement is made on <b>{format(new Date(r.purchase_date), "dd MMMM yyyy")}</b> between
          <b> {bizName}</b> (the "Buyer") and <b>{r.seller_name}</b> (the "Seller"),
          residing at <b>{r.seller_address || "—"}</b>, NID No. <b>{r.seller_nid_no || "—"}</b>,
          phone <b>{r.seller_phone || "—"}</b>.
        </p>

        <p className="text-sm leading-6">
          The Seller hereby sells to the Buyer the following used device, which the Seller declares to be
          legally owned, free of any liens, and not stolen or otherwise illegally obtained:
        </p>

        <table className="w-full text-sm border">
          <tbody>
            <tr className="border-b"><td className="p-2 font-semibold w-1/3 border-r">Product</td><td className="p-2">{r.product_name}</td></tr>
            <tr className="border-b"><td className="p-2 font-semibold border-r">Brand / Model</td><td className="p-2">{[r.brand, r.model].filter(Boolean).join(" ") || "—"}</td></tr>
            <tr className="border-b"><td className="p-2 font-semibold border-r">IMEI / Serial</td><td className="p-2 font-mono">{r.imei || "—"}</td></tr>
            <tr className="border-b"><td className="p-2 font-semibold border-r">Condition</td><td className="p-2">{r.condition_notes || "—"}</td></tr>
            <tr className="border-b"><td className="p-2 font-semibold border-r">Agreed Price</td><td className="p-2">৳ {Number(r.purchase_price).toLocaleString()} ({numberToWordsBn(Number(r.purchase_price))})</td></tr>
            <tr><td className="p-2 font-semibold border-r">Payment</td><td className="p-2">{r.payment_method} — Paid ৳ {Number(r.paid_amount).toLocaleString()}</td></tr>
          </tbody>
        </table>

        <ol className="text-sm leading-6 list-decimal pl-5 space-y-1">
          <li>The Seller confirms ownership of the device and provides valid government ID.</li>
          <li>The Seller takes full legal responsibility if the device is later found to be stolen or disputed.</li>
          <li>Once payment is received and this agreement is signed, the device becomes the property of the Buyer.</li>
          <li>The Seller has had the opportunity to remove all personal data prior to handover.</li>
        </ol>

        {(r.seller_nid_url || r.seller_photo_url) && (
          <div className="flex gap-3 pt-2">
            {r.seller_nid_url && <div><p className="text-xs">NID</p><img src={r.seller_nid_url} className="h-24 border" /></div>}
            {r.seller_photo_url && <div><p className="text-xs">Seller Photo</p><img src={r.seller_photo_url} className="h-24 border" /></div>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-8 pt-12">
          <div className="text-center">
            <div className="border-t pt-1">Seller Signature</div>
            <div className="text-xs">{r.seller_name}</div>
          </div>
          <div className="text-center">
            <div className="border-t pt-1">Buyer / Authorized</div>
            <div className="text-xs">{bizName}</div>
          </div>
        </div>
      </div>
    </div>
  );
}