import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Save, RotateCcw, MessageSquare, Smartphone, Bell } from "lucide-react";
import { useLandingCms, useLandingCmsMutation } from "@/hooks/useSaasAdmin";
import { toast } from "@/hooks/use-toast";

type Channel = "sms" | "whatsapp";
type Tmpl = Record<Channel, string>;
type EventKey = "send_ledger" | "new_sale" | "payment_reminder" | "payment_received";
type Templates = Record<EventKey, Tmpl>;

const COMMON_TAGS = ["{business_name}", "{contact_name}", "{contact_mobile}"];
const INVOICE_TAGS = [
  "{invoice_number}", "{invoice_url}", "{total_amount}",
  "{paid_amount}", "{due_amount}", "{due_date}",
];
const LEDGER_TAGS = ["{balance_due}", "{ledger_url}"];

const TAGS_PER_EVENT: Record<EventKey, string[]> = {
  send_ledger: [...COMMON_TAGS, ...LEDGER_TAGS],
  new_sale: [...COMMON_TAGS, ...INVOICE_TAGS],
  payment_reminder: [...COMMON_TAGS, ...INVOICE_TAGS],
  payment_received: [...COMMON_TAGS, ...INVOICE_TAGS],
};

const DEFAULTS: Templates = {
  send_ledger: {
    sms: "Dear {contact_name}, your current balance with {business_name} is {balance_due}. View ledger: {ledger_url}",
    whatsapp: "Hi {contact_name} 👋\n\nYour current outstanding balance with *{business_name}* is *{balance_due}*.\n\nView full ledger: {ledger_url}",
  },
  new_sale: {
    sms: "Dear {contact_name}, thank you for shopping with {business_name}. Invoice {invoice_number}, Total: {total_amount}, Due: {due_amount}. {invoice_url}",
    whatsapp: "Hi {contact_name},\n\nThank you for shopping with *{business_name}*!\n\nInvoice: *{invoice_number}*\nTotal: {total_amount}\nPaid: {paid_amount}\nDue: {due_amount}\n\nInvoice link: {invoice_url}",
  },
  payment_reminder: {
    sms: "Dear {contact_name}, this is a reminder for invoice {invoice_number}. Due amount: {due_amount}, due by {due_date}. {invoice_url}",
    whatsapp: "Hi {contact_name},\n\nFriendly reminder — invoice *{invoice_number}* from *{business_name}* has a due of *{due_amount}* by {due_date}.\n\nPay/view: {invoice_url}",
  },
  payment_received: {
    sms: "Dear {contact_name}, we have received {paid_amount} against invoice {invoice_number}. Remaining due: {due_amount}. Thank you!",
    whatsapp: "Hi {contact_name},\n\nWe have received *{paid_amount}* against invoice *{invoice_number}*.\n\nRemaining due: {due_amount}\n\nThanks from {business_name}!",
  },
};

const SAMPLE: Record<string, string> = {
  business_name: "Prime POS Demo Shop",
  contact_name: "Mr. Rahim",
  contact_mobile: "+8801700000000",
  invoice_number: "INV-000123",
  invoice_url: "https://primepos.lovable.app/i/INV-000123",
  total_amount: "৳ 12,500.00",
  paid_amount: "৳ 5,000.00",
  due_amount: "৳ 7,500.00",
  due_date: "May 30, 2026",
  balance_due: "৳ 18,200.00",
  ledger_url: "https://primepos.lovable.app/l/abc123",
};

function render(template: string) {
  return template.replace(/\{(\w+)\}/g, (_, k) => SAMPLE[k] ?? `{${k}}`);
}

function ChannelEditor({
  tags, value, onChange,
}: { tags: string[]; value: Tmpl; onChange: (v: Tmpl) => void }) {
  const append = (channel: Channel, tag: string) =>
    onChange({ ...value, [channel]: (value[channel] ? value[channel] + " " : "") + tag });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5 space-y-4">
        <div className="flex flex-wrap gap-1.5 pb-1">
          <span className="text-xs font-medium text-muted-foreground mr-1">Available Tags:</span>
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => append("sms", t)}
              className="text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20"
              title={`Insert into SMS: ${t}`}
            >
              {t}
            </button>
          ))}
        </div>

        <div>
          <Label className="flex items-center gap-1.5">
            <Smartphone className="h-3.5 w-3.5" /> SMS Body
          </Label>
          <Textarea
            rows={5}
            value={value.sms}
            onChange={(e) => onChange({ ...value, sms: e.target.value })}
            placeholder="SMS body..."
          />
          <p className="text-[11px] text-muted-foreground mt-1">{value.sms.length} chars</p>
        </div>

        <div>
          <div className="flex flex-wrap gap-1.5 pb-1">
            <span className="text-xs font-medium text-muted-foreground mr-1">Insert into WhatsApp:</span>
            {tags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => append("whatsapp", t)}
                className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
              >
                {t}
              </button>
            ))}
          </div>
          <Label className="flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" /> WhatsApp Text
          </Label>
          <Textarea
            rows={7}
            value={value.whatsapp}
            onChange={(e) => onChange({ ...value, whatsapp: e.target.value })}
            placeholder="WhatsApp message text..."
          />
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
          <Bell className="h-3.5 w-3.5" /> Live preview with sample data
        </div>
        <div className="p-4 space-y-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Smartphone className="h-3 w-3" /> SMS
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-sm whitespace-pre-wrap">
              {render(value.sms) || <span className="text-muted-foreground italic">Empty</span>}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <MessageSquare className="h-3 w-3" /> WhatsApp
            </div>
            <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3 text-sm whitespace-pre-wrap">
              {render(value.whatsapp) || <span className="text-muted-foreground italic">Empty</span>}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function NotificationTemplates() {
  const { data } = useLandingCms("notification_templates");
  const mutation = useLandingCmsMutation();
  const [templates, setTemplates] = useState<Templates>(DEFAULTS);

  useEffect(() => {
    if (data && typeof data === "object") {
      setTemplates({
        send_ledger: { ...DEFAULTS.send_ledger, ...((data as any).send_ledger || {}) },
        new_sale: { ...DEFAULTS.new_sale, ...((data as any).new_sale || {}) },
        payment_reminder: { ...DEFAULTS.payment_reminder, ...((data as any).payment_reminder || {}) },
        payment_received: { ...DEFAULTS.payment_received, ...((data as any).payment_received || {}) },
      });
    }
  }, [data]);

  const save = () => {
    mutation.mutate(
      { key: "notification_templates", value: templates },
      {
        onSuccess: () => toast({ title: "Templates saved" }),
        onError: (e: any) =>
          toast({ title: "Save failed", description: e?.message, variant: "destructive" }),
      },
    );
  };

  const reset = () => {
    setTemplates(DEFAULTS);
    toast({ title: "Reset to defaults", description: "Click Save to apply." });
  };

  const customerEvents = useMemo(
    () => [
      { key: "new_sale" as const, label: "New Sale" },
      { key: "payment_reminder" as const, label: "Payment Reminder" },
      { key: "payment_received" as const, label: "Payment Received" },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification Templates"
        subtitle="Edit SMS and WhatsApp message templates. Use {tags} to personalize."
      />

      <div className="flex flex-wrap gap-2">
        <Button onClick={save} disabled={mutation.isPending}>
          <Save className="h-4 w-4 mr-1.5" /> Save all templates
        </Button>
        <Button variant="outline" onClick={reset}>
          <RotateCcw className="h-4 w-4 mr-1.5" /> Reset to defaults
        </Button>
      </div>

      <Card className="p-5 space-y-4">
        <div className="text-sm font-semibold">Notifications</div>
        <Tabs defaultValue="send_ledger">
          <TabsList>
            <TabsTrigger value="send_ledger">Send Ledger</TabsTrigger>
          </TabsList>
          <TabsContent value="send_ledger" className="mt-4">
            <ChannelEditor
              tags={TAGS_PER_EVENT.send_ledger}
              value={templates.send_ledger}
              onChange={(v) => setTemplates({ ...templates, send_ledger: v })}
            />
          </TabsContent>
        </Tabs>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="text-sm font-semibold">Customer Notifications</div>
        <Tabs defaultValue="new_sale">
          <TabsList className="flex-wrap h-auto">
            {customerEvents.map((e) => (
              <TabsTrigger key={e.key} value={e.key}>{e.label}</TabsTrigger>
            ))}
          </TabsList>
          {customerEvents.map((e) => (
            <TabsContent key={e.key} value={e.key} className="mt-4">
              <ChannelEditor
                tags={TAGS_PER_EVENT[e.key]}
                value={templates[e.key]}
                onChange={(v) => setTemplates({ ...templates, [e.key]: v })}
              />
            </TabsContent>
          ))}
        </Tabs>
      </Card>
    </div>
  );
}
