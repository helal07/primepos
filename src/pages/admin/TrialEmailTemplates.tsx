import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Save, RotateCcw, Eye } from "lucide-react";
import { useLandingCms, useLandingCmsMutation } from "@/hooks/useSaasAdmin";
import { toast } from "@/hooks/use-toast";

type Tmpl = { subject: string; headline: string; body: string };
type Templates = Record<"7" | "3" | "1" | "0", Tmpl>;

const DEFAULTS: Templates = {
  "7": {
    subject: "{{days_left}} days left on your {{plan_name}} trial",
    headline: "{{days_left}} days left on your {{plan_name}} trial",
    body:
      "Hi {{tenant_name}},\n\nYour {{plan_name}} trial ends in {{days_left}} days on {{expiry_date}}. Upgrade now to keep your account and data without interruption.",
  },
  "3": {
    subject: "Only {{days_left}} days left on your {{plan_name}} trial",
    headline: "{{days_left}} days left on your {{plan_name}} trial",
    body:
      "Hi {{tenant_name}},\n\nJust a heads up — your {{plan_name}} trial ends in {{days_left}} days on {{expiry_date}}. Choose a plan to avoid losing access.",
  },
  "1": {
    subject: "Your {{plan_name}} trial ends tomorrow ({{expiry_date}})",
    headline: "1 day left on your {{plan_name}} trial",
    body:
      "Hi {{tenant_name}},\n\nThis is a final reminder — your {{plan_name}} trial ends tomorrow on {{expiry_date}}. Upgrade now to keep working without interruption.",
  },
  "0": {
    subject: "Your {{plan_name}} trial has ended — upgrade to keep access",
    headline: "Your {{plan_name}} trial has ended",
    body:
      "Hi {{tenant_name}},\n\nYour {{plan_name}} trial ended on {{expiry_date}}. To avoid losing access to your data, please choose a plan now.",
  },
};

const SAMPLE = {
  tenant_name: "Acme Mobile Shop",
  plan_name: "Starter Trial",
  expiry_date: "May 21, 2026 at 11:59 PM",
  upgrade_url: "https://primepos.lovable.app/subscription",
};

const VARS = [
  { token: "{{tenant_name}}", label: "Tenant Name" },
  { token: "{{plan_name}}", label: "Plan Name" },
  { token: "{{days_left}}", label: "Days Left" },
  { token: "{{expiry_date}}", label: "Expiry Date/Time" },
  { token: "{{upgrade_url}}", label: "Upgrade URL" },
];

function render(template: string, daysLeft: number) {
  return template
    .replaceAll("{{tenant_name}}", SAMPLE.tenant_name)
    .replaceAll("{{plan_name}}", SAMPLE.plan_name)
    .replaceAll("{{days_left}}", String(daysLeft))
    .replaceAll("{{expiry_date}}", SAMPLE.expiry_date)
    .replaceAll("{{upgrade_url}}", SAMPLE.upgrade_url);
}

function MarkerEditor({
  marker,
  value,
  onChange,
}: {
  marker: "7" | "3" | "1" | "0";
  value: Tmpl;
  onChange: (v: Tmpl) => void;
}) {
  const daysLeft = Number(marker);
  const isExpired = daysLeft === 0;
  const previewBodyHtml = render(value.body, daysLeft).replace(/\n/g, "<br/>");
  const previewSubject = render(value.subject, daysLeft);
  const previewHeadline = render(value.headline, daysLeft);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5 space-y-4 bg-card/60 border-border">
        <div>
          <Label className="text-foreground/90">Subject</Label>
          <Input
            className="bg-muted border-border text-foreground"
            value={value.subject}
            onChange={(e) => onChange({ ...value, subject: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-foreground/90">Headline</Label>
          <Input
            className="bg-muted border-border text-foreground"
            value={value.headline}
            onChange={(e) => onChange({ ...value, headline: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-foreground/90">Body</Label>
          <Textarea
            className="bg-muted border-border text-foreground min-h-[180px] font-mono text-sm"
            value={value.body}
            onChange={(e) => onChange({ ...value, body: e.target.value })}
          />
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {VARS.map((v) => (
            <button
              key={v.token}
              type="button"
              onClick={() => onChange({ ...value, body: value.body + " " + v.token })}
              className="text-[11px] px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition"
              title={`Insert ${v.token}`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Available variables: {VARS.map((v) => v.token).join(", ")}
        </p>
      </Card>

      <Card className="p-0 overflow-hidden border-border">
        <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
          <Eye className="h-3.5 w-3.5" /> Live preview with sample data
        </div>
        <div className="bg-[#f6f7fb] p-4">
          <div className="text-[11px] text-muted-foreground mb-2">
            <b>Subject:</b> {previewSubject}
          </div>
          <div className="mx-auto max-w-[560px] bg-white rounded-xl overflow-hidden border border-[#e6e8ef]">
            <div className="bg-primary text-primary-foreground px-7 py-5 text-lg font-semibold">
              {previewHeadline}
            </div>
            <div
              className="px-7 py-6 text-sm leading-relaxed text-[#1f2937]"
              dangerouslySetInnerHTML={{ __html: previewBodyHtml }}
            />
            <div className="px-7 pb-6 text-center">
              <a
                href={SAMPLE.upgrade_url}
                className="inline-block bg-primary text-primary-foreground no-underline px-6 py-3 rounded-lg font-semibold text-sm"
              >
                {isExpired ? "Choose a plan" : "Upgrade now"}
              </a>
            </div>
            <div className="bg-[#f9fafb] text-[11px] text-[#9ca3af] text-center px-7 py-3">
              This is an automated trial reminder. Please do not reply.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function TrialEmailTemplates() {
  const { data } = useLandingCms("trial_email_templates");
  const mutation = useLandingCmsMutation();
  const [templates, setTemplates] = useState<Templates>(DEFAULTS);

  useEffect(() => {
    if (data && typeof data === "object") {
      setTemplates({ ...DEFAULTS, ...(data as Partial<Templates>) });
    }
  }, [data]);

  const save = () => {
    mutation.mutate(
      { key: "trial_email_templates", value: templates },
      {
        onSuccess: () => toast({ title: "Templates saved" }),
        onError: (e: any) => toast({ title: "Save failed", description: e?.message, variant: "destructive" }),
      },
    );
  };

  const reset = () => {
    setTemplates(DEFAULTS);
    toast({ title: "Reset to defaults", description: "Click Save to apply." });
  };

  const markers = useMemo(() => ["7", "3", "1", "0"] as const, []);
  const labels: Record<string, string> = {
    "7": "7 days before",
    "3": "3 days before",
    "1": "1 day before",
    "0": "On expiry day",
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Trial Reminder Emails"
        subtitle="Edit subject, headline, and body for each reminder. Use variables to personalize."
      />

      <div className="flex flex-wrap gap-2">
        <Button onClick={save} disabled={mutation.isPending} className="bg-primary hover:bg-primary/90">
          <Save className="h-4 w-4 mr-1.5" /> Save all templates
        </Button>
        <Button variant="outline" onClick={reset}>
          <RotateCcw className="h-4 w-4 mr-1.5" /> Reset to defaults
        </Button>
      </div>

      <Tabs defaultValue="7">
        <TabsList className="bg-muted border border-border flex-wrap h-auto">
          {markers.map((m) => (
            <TabsTrigger key={m} value={m}>
              {labels[m]}
            </TabsTrigger>
          ))}
        </TabsList>
        {markers.map((m) => (
          <TabsContent key={m} value={m} className="mt-4">
            <MarkerEditor
              marker={m}
              value={templates[m]}
              onChange={(v) => setTemplates({ ...templates, [m]: v })}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
