import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { rest } from "@/lib/restResource";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Settings2, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { useSettings, useSaveSetting } from "@/hooks/useSettings";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

const DEFAULT_TITLE = "USED DEVICE BUYING AGREEMENT";
const DEFAULT_INTRO =
  `This agreement is made on {{date}} between {{business_name}} (the "Buyer") and {{seller_name}} (the "Seller"), residing at {{seller_address}}, NID No. {{seller_nid}}, phone {{seller_phone}}.

The Seller hereby sells to the Buyer the following used device, which the Seller declares to be legally owned, free of any liens, and not stolen or otherwise illegally obtained:`;
const DEFAULT_TERMS = `The Seller confirms ownership of the device and provides valid government ID.
The Seller takes full legal responsibility if the device is later found to be stolen or disputed.
Once payment is received and this agreement is signed, the device becomes the property of the Buyer.
The Seller has had the opportunity to remove all personal data prior to handover.`;
const DEFAULT_FOOTER = "";

function applyTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

export default function ExchangeAgreement() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: settings } = useSettings();
  const saveSetting = useSaveSetting();
  const [editOpen, setEditOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftIntro, setDraftIntro] = useState("");
  const [draftTerms, setDraftTerms] = useState("");
  const [draftFooter, setDraftFooter] = useState("");

  const { data: r } = useQuery({
    queryKey: ["exchange_purchase", id],
    enabled: !!id,
    queryFn: async () => {
      return await rest.get<any>("exchange_purchases", id!);
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

  const tplTitle: string = biz.exchange_agreement_title || DEFAULT_TITLE;
  const tplIntro: string = biz.exchange_agreement_intro || DEFAULT_INTRO;
  const tplTerms: string = biz.exchange_agreement_terms || DEFAULT_TERMS;
  const tplFooter: string = biz.exchange_agreement_footer ?? DEFAULT_FOOTER;

  const vars: Record<string, string> = {
    date: format(new Date(r.purchase_date), "dd MMMM yyyy"),
    reference_no: r.reference_no,
    business_name: bizName,
    business_address: bizAddr,
    business_phone: bizPhone,
    seller_name: r.seller_name || "",
    seller_address: r.seller_address || "—",
    seller_nid: r.seller_nid_no || "—",
    seller_phone: r.seller_phone || "—",
    product_name: r.product_name || "",
    brand: r.brand || "",
    model: r.model || "",
    imei: r.imei || "—",
    condition: r.condition_notes || "—",
    price: Number(r.purchase_price).toLocaleString(),
    price_words: numberToWordsBn(Number(r.purchase_price)),
    paid: Number(r.paid_amount).toLocaleString(),
    payment_method: r.payment_method || "",
  };

  const renderedIntro = applyTemplate(tplIntro, vars);
  const renderedFooter = applyTemplate(tplFooter, vars);
  const termLines = tplTerms
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => applyTemplate(l, vars));

  const openEditor = () => {
    setDraftTitle(tplTitle);
    setDraftIntro(tplIntro);
    setDraftTerms(tplTerms);
    setDraftFooter(tplFooter);
    setEditOpen(true);
  };

  const saveTemplate = async () => {
    await Promise.all([
      saveSetting.mutateAsync({ key: "exchange_agreement_title", value: draftTitle }),
      saveSetting.mutateAsync({ key: "exchange_agreement_intro", value: draftIntro }),
      saveSetting.mutateAsync({ key: "exchange_agreement_terms", value: draftTerms }),
      saveSetting.mutateAsync({ key: "exchange_agreement_footer", value: draftFooter }),
    ]);
    setEditOpen(false);
  };

  const resetToDefault = () => {
    setDraftTitle(DEFAULT_TITLE);
    setDraftIntro(DEFAULT_INTRO);
    setDraftTerms(DEFAULT_TERMS);
    setDraftFooter(DEFAULT_FOOTER);
  };

  return (
    <div className="max-w-3xl mx-auto py-4 px-4 print:p-0">
      <div className="flex justify-between mb-4 print:hidden">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={openEditor}><Settings2 className="h-4 w-4 mr-1" /> Customize</Button>
          <Button size="sm" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Print</Button>
        </div>
      </div>

      <div className="border rounded p-8 bg-white text-black space-y-4 print:border-0 print:shadow-none">
        <div className="text-center border-b pb-3">
          <h1 className="text-xl font-bold">{bizName}</h1>
          {bizAddr && <p className="text-sm">{bizAddr}</p>}
          {bizPhone && <p className="text-sm">Phone: {bizPhone}</p>}
          <h2 className="text-lg font-semibold mt-3 underline">{tplTitle}</h2>
          <p className="text-xs mt-1">Reference: {r.reference_no} • Date: {format(new Date(r.purchase_date), "dd MMM yyyy")}</p>
        </div>

        {renderedIntro.split(/\n\s*\n/).map((para, i) => (
          <p key={i} className="text-sm leading-6 whitespace-pre-line">{para}</p>
        ))}

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

        {termLines.length > 0 && (
          <ol className="text-sm leading-6 list-decimal pl-5 space-y-1">
            {termLines.map((t, i) => (<li key={i}>{t}</li>))}
          </ol>
        )}

        {renderedFooter.trim() && (
          <div className="text-sm leading-6 whitespace-pre-line pt-2 border-t">{renderedFooter}</div>
        )}

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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customize Agreement Template</DialogTitle>
            <DialogDescription>
              Edit the wording shown on every printed exchange agreement. Use placeholders like
              {" "}<code className="text-xs">{"{{seller_name}}"}</code>,{" "}
              <code className="text-xs">{"{{product_name}}"}</code>,{" "}
              <code className="text-xs">{"{{price}}"}</code>,{" "}
              <code className="text-xs">{"{{date}}"}</code>, etc.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label className="text-xs">Title</Label>
              <Input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Intro Paragraph(s) — separate paragraphs with a blank line</Label>
              <Textarea rows={6} value={draftIntro} onChange={(e) => setDraftIntro(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Terms & Conditions — one item per line (numbered automatically)</Label>
              <Textarea rows={6} value={draftTerms} onChange={(e) => setDraftTerms(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Footer Note (optional)</Label>
              <Textarea rows={3} value={draftFooter} onChange={(e) => setDraftFooter(e.target.value)} />
            </div>

            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">Available placeholders</summary>
              <div className="grid grid-cols-2 gap-1 pt-2 font-mono">
                {Object.keys(vars).map((k) => (
                  <span key={k}>{`{{${k}}}`}</span>
                ))}
              </div>
            </details>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={resetToDefault}><RotateCcw className="h-4 w-4 mr-1" /> Reset to default</Button>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={saveTemplate} disabled={saveSetting.isPending}>Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}