import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RotateCcw } from "lucide-react";
import { useSettings, useSaveSetting } from "@/hooks/useSettings";

export const DEFAULT_TITLE = "USED DEVICE BUYING AGREEMENT";
export const DEFAULT_INTRO =
  `This agreement is made on {{date}} between {{business_name}} (the "Buyer") and {{seller_name}} (the "Seller"), residing at {{seller_address}}, NID No. {{seller_nid}}, phone {{seller_phone}}.

The Seller hereby sells to the Buyer the following used device, which the Seller declares to be legally owned, free of any liens, and not stolen or otherwise illegally obtained:`;
export const DEFAULT_TERMS = `The Seller confirms ownership of the device and provides valid government ID.
The Seller takes full legal responsibility if the device is later found to be stolen or disputed.
Once payment is received and this agreement is signed, the device becomes the property of the Buyer.
The Seller has had the opportunity to remove all personal data prior to handover.`;
export const DEFAULT_FOOTER = "";

const PLACEHOLDERS = [
  "date","reference_no","business_name","business_address","business_phone",
  "seller_name","seller_address","seller_nid","seller_phone",
  "product_name","brand","model","imei","condition",
  "price","price_words","paid","payment_method",
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function AgreementTemplateDialog({ open, onOpenChange }: Props) {
  const { data: settings } = useSettings();
  const saveSetting = useSaveSetting();
  const biz: any = settings || {};

  const [title, setTitle] = useState("");
  const [intro, setIntro] = useState("");
  const [terms, setTerms] = useState("");
  const [footer, setFooter] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(biz.exchange_agreement_title || DEFAULT_TITLE);
    setIntro(biz.exchange_agreement_intro || DEFAULT_INTRO);
    setTerms(biz.exchange_agreement_terms || DEFAULT_TERMS);
    setFooter(biz.exchange_agreement_footer ?? DEFAULT_FOOTER);
  }, [open, biz.exchange_agreement_title, biz.exchange_agreement_intro, biz.exchange_agreement_terms, biz.exchange_agreement_footer]);

  const save = async () => {
    await Promise.all([
      saveSetting.mutateAsync({ key: "exchange_agreement_title", value: title }),
      saveSetting.mutateAsync({ key: "exchange_agreement_intro", value: intro }),
      saveSetting.mutateAsync({ key: "exchange_agreement_terms", value: terms }),
      saveSetting.mutateAsync({ key: "exchange_agreement_footer", value: footer }),
    ]);
    onOpenChange(false);
  };

  const reset = () => {
    setTitle(DEFAULT_TITLE);
    setIntro(DEFAULT_INTRO);
    setTerms(DEFAULT_TERMS);
    setFooter(DEFAULT_FOOTER);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customize Agreement Template</DialogTitle>
          <DialogDescription>
            Edit the wording shown on every printed exchange agreement. Use placeholders like
            {" "}<code className="text-xs">{"{{seller_name}}"}</code>,{" "}
            <code className="text-xs">{"{{product_name}}"}</code>,{" "}
            <code className="text-xs">{"{{price}}"}</code>,{" "}
            <code className="text-xs">{"{{date}}"}</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Intro Paragraph(s) — separate paragraphs with a blank line</Label>
            <Textarea rows={6} value={intro} onChange={(e) => setIntro(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Terms & Conditions — one item per line (numbered automatically)</Label>
            <Textarea rows={6} value={terms} onChange={(e) => setTerms(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Footer Note (optional)</Label>
            <Textarea rows={3} value={footer} onChange={(e) => setFooter(e.target.value)} />
          </div>

          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">Available placeholders</summary>
            <div className="grid grid-cols-2 gap-1 pt-2 font-mono">
              {PLACEHOLDERS.map((k) => (<span key={k}>{`{{${k}}}`}</span>))}
            </div>
          </details>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={reset}><RotateCcw className="h-4 w-4 mr-1" /> Reset to default</Button>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={save} disabled={saveSetting.isPending}>Save Template</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}