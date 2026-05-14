import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { useLandingCms, useLandingCmsMutation } from "@/hooks/useSaasAdmin";
import { Save, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { BrandingEditor } from "@/components/admin/cms/BrandingEditor";
import { LandingFeaturesEditor } from "@/components/admin/cms/LandingFeaturesEditor";
import { LandingReviewsEditor } from "@/components/admin/cms/LandingReviewsEditor";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Globe } from "lucide-react";

function CmsSection({ sectionKey, title, fields }: {
  sectionKey: string; title: string;
  fields: { name: string; label: string; type?: "text" | "textarea" }[];
}) {
  const { data } = useLandingCms(sectionKey);
  const mutation = useLandingCmsMutation();
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data && typeof data === "object") setValues(data as Record<string, string>);
  }, [data]);

  return (
    <div className="rounded-xl border border-border bg-card/60 p-5 space-y-4">
      <h4 className="text-base font-semibold text-foreground">{title}</h4>
      {fields.map((f) => (
        <div key={f.name}>
          <Label className="text-foreground/90">{f.label}</Label>
          {f.type === "textarea" ? (
            <Textarea className="bg-muted border-border text-foreground" value={values[f.name] ?? ""} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })} />
          ) : (
            <Input className="bg-muted border-border text-foreground" value={values[f.name] ?? ""} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })} />
          )}
        </div>
      ))}
      <Button className="bg-primary hover:bg-primary/90 text-foreground" onClick={() => mutation.mutate({ key: sectionKey, value: values })} disabled={mutation.isPending} size="sm">
        <Save className="h-4 w-4 mr-1" /> Save
      </Button>
    </div>
  );
}

function FaqManager() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data = [] } = useQuery({
    queryKey: ["faq_entries_admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("faq_entries").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const upsert = useMutation({
    mutationFn: async (row: any) => {
      if (row.id) {
        const { id, created_at, updated_at, ...rest } = row;
        const { error } = await supabase.from("faq_entries").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("faq_entries").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["faq_entries_admin"] }); toast({ title: "Saved" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("faq_entries").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["faq_entries_admin"] }); toast({ title: "Deleted" }); },
  });

  const [draft, setDraft] = useState({ question: "", answer: "" });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <h4 className="text-sm font-semibold">Add FAQ</h4>
          <Input placeholder="Question" value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} />
          <Textarea placeholder="Answer" rows={3} value={draft.answer} onChange={(e) => setDraft({ ...draft, answer: e.target.value })} />
          <Button size="sm" disabled={!draft.question.trim() || !draft.answer.trim() || upsert.isPending}
            onClick={() => { upsert.mutate({ question: draft.question.trim(), answer: draft.answer.trim(), sort_order: data.length, is_active: true }); setDraft({ question: "", answer: "" }); }}>
            <Plus className="h-4 w-4 mr-1" /> Add Entry
          </Button>
        </CardContent>
      </Card>

      {data.map((row: any, idx: number) => (
        <Card key={row.id}>
          <CardContent className="p-4 space-y-2">
            <Input value={row.question} onChange={(e) => upsert.mutate({ ...row, question: e.target.value })} />
            <Textarea rows={3} value={row.answer} onChange={(e) => upsert.mutate({ ...row, answer: e.target.value })} />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Switch checked={row.is_active} onCheckedChange={(v) => upsert.mutate({ ...row, is_active: v })} />
                <span className="text-xs text-muted-foreground">{row.is_active ? "Visible" : "Hidden"}</span>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" disabled={idx === 0} onClick={() => { const prev = data[idx - 1]; upsert.mutate({ ...row, sort_order: prev.sort_order }); upsert.mutate({ ...prev, sort_order: row.sort_order }); }}><ArrowUp className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" disabled={idx === data.length - 1} onClick={() => { const next = data[idx + 1]; upsert.mutate({ ...row, sort_order: next.sort_order }); upsert.mutate({ ...next, sort_order: row.sort_order }); }}><ArrowDown className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => del.mutate(row.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      {!data.length && <p className="text-sm text-muted-foreground">No FAQ entries yet.</p>}
    </div>
  );
}

export default function LandingCms() {
  return (
    <div className="space-y-6">
      <PageHeader title="Landing Page CMS" subtitle="Edit your public landing page content" />
      <Alert className="border-primary/30 bg-primary/5">
        <Globe className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm">
          <strong>Global content.</strong> These settings affect every visitor of the marketing site. Tenants do not have access to this CMS.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="branding">
        <TabsList className="flex-wrap bg-muted border-border">
          <TabsTrigger value="branding" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground">Branding</TabsTrigger>
          <TabsTrigger value="hero" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground">Hero</TabsTrigger>
          <TabsTrigger value="stats" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground">Stats</TabsTrigger>
          <TabsTrigger value="features-list" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground">Features List</TabsTrigger>
          <TabsTrigger value="why" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground">Why Us</TabsTrigger>
          <TabsTrigger value="reviews" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground">Reviews</TabsTrigger>
          <TabsTrigger value="seo" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground">SEO</TabsTrigger>
          <TabsTrigger value="tracking" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground">Tracking</TabsTrigger>
          <TabsTrigger value="features" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground">Features Heading</TabsTrigger>
          <TabsTrigger value="testimonials" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground">Testimonials Heading</TabsTrigger>
          <TabsTrigger value="faq" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground">FAQ</TabsTrigger>
          <TabsTrigger value="promo" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground">Promotion</TabsTrigger>
          <TabsTrigger value="cta" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground">CTA Banner</TabsTrigger>
          <TabsTrigger value="contact" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground">Contact</TabsTrigger>
          <TabsTrigger value="footer" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground">Footer</TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="mt-4">
          <BrandingEditor />
        </TabsContent>
        <TabsContent value="hero" className="mt-4">
          <CmsSection sectionKey="cms_hero" title="Hero Section" fields={[
            { name: "badge", label: "Top Badge (e.g. 🚀 All-in-One)" },
            { name: "title", label: "Title" }, { name: "title_highlight", label: "Highlight Word" },
            { name: "subtitle", label: "Subtitle", type: "textarea" },
            { name: "cta_text", label: "Primary CTA Button Text" }, { name: "cta_link", label: "Primary CTA Link" },
            { name: "secondary_text", label: "Secondary Button Text" }, { name: "secondary_link", label: "Secondary Button Link" },
          ]} />
        </TabsContent>
        <TabsContent value="stats" className="mt-4">
          <CmsSection sectionKey="cms_stats" title="Stats Strip (4 tiles)" fields={[
            { name: "stat1_value", label: "Stat 1 Value" }, { name: "stat1_label", label: "Stat 1 Label" },
            { name: "stat2_value", label: "Stat 2 Value" }, { name: "stat2_label", label: "Stat 2 Label" },
            { name: "stat3_value", label: "Stat 3 Value" }, { name: "stat3_label", label: "Stat 3 Label" },
            { name: "stat4_value", label: "Stat 4 Value" }, { name: "stat4_label", label: "Stat 4 Label" },
          ]} />
        </TabsContent>
        <TabsContent value="features-list" className="mt-4">
          <LandingFeaturesEditor />
        </TabsContent>
        <TabsContent value="why" className="mt-4">
          <CmsSection sectionKey="cms_why" title="Why Choose Us (3 cards)" fields={[
            { name: "heading", label: "Section Heading" },
            { name: "card1_title", label: "Card 1 Title" }, { name: "card1_desc", label: "Card 1 Description", type: "textarea" }, { name: "card1_icon", label: "Card 1 Icon (lucide name)" },
            { name: "card2_title", label: "Card 2 Title" }, { name: "card2_desc", label: "Card 2 Description", type: "textarea" }, { name: "card2_icon", label: "Card 2 Icon (lucide name)" },
            { name: "card3_title", label: "Card 3 Title" }, { name: "card3_desc", label: "Card 3 Description", type: "textarea" }, { name: "card3_icon", label: "Card 3 Icon (lucide name)" },
          ]} />
        </TabsContent>
        <TabsContent value="reviews" className="mt-4">
          <LandingReviewsEditor />
        </TabsContent>
        <TabsContent value="seo" className="mt-4">
          <CmsSection sectionKey="cms_seo" title="SEO Meta Tags" fields={[
            { name: "title", label: "Page Title (under 60 chars)" },
            { name: "description", label: "Meta Description (under 160 chars)", type: "textarea" },
            { name: "keywords", label: "Keywords (comma separated)" },
            { name: "og_title", label: "Open Graph Title" },
            { name: "og_description", label: "Open Graph Description", type: "textarea" },
            { name: "og_image", label: "Open Graph Image URL" },
            { name: "canonical_url", label: "Canonical URL" },
            { name: "twitter_handle", label: "Twitter Handle (@yourbrand)" },
          ]} />
        </TabsContent>
        <TabsContent value="tracking" className="mt-4 space-y-4">
          <Alert className="border-primary/30 bg-primary/5">
            <AlertDescription className="text-sm">
              Paste your tracking IDs below. Scripts are injected on every public page (landing + CMS pages). Leave blank to disable.
            </AlertDescription>
          </Alert>
          <CmsSection sectionKey="cms_tracking" title="Marketing & Analytics Tracking" fields={[
            { name: "gtm_id", label: "Google Tag Manager ID (e.g. GTM-XXXXXX)" },
            { name: "ga4_id", label: "Google Analytics 4 Measurement ID (e.g. G-XXXXXXX)" },
            { name: "fb_pixel_id", label: "Meta / Facebook Pixel ID (numeric)" },
            { name: "fb_conversion_token", label: "Meta Conversions API Access Token (server-side, optional)" },
            { name: "fb_test_event_code", label: "Meta Test Event Code (optional, for debugging)" },
          ]} />
        </TabsContent>
        <TabsContent value="features" className="mt-4">
          <CmsSection sectionKey="cms_features" title="Features Section" fields={[
            { name: "heading", label: "Section Heading" }, { name: "subheading", label: "Subheading" },
          ]} />
        </TabsContent>
        <TabsContent value="testimonials" className="mt-4">
          <CmsSection sectionKey="cms_testimonials" title="Testimonials Section" fields={[
            { name: "heading", label: "Section Heading" }, { name: "subheading", label: "Subheading" },
          ]} />
        </TabsContent>
        <TabsContent value="faq" className="mt-4">
          <FaqManager />
        </TabsContent>
        <TabsContent value="promo" className="mt-4">
          <CmsSection sectionKey="cms_promo" title="Promotion Banner" fields={[
            { name: "heading", label: "Headline" },
            { name: "subheading", label: "Sub-headline", type: "textarea" },
            { name: "badge", label: "Badge Text (e.g. 'Limited Offer')" },
            { name: "cta_text", label: "CTA Button Text" },
            { name: "cta_link", label: "CTA Link" },
          ]} />
        </TabsContent>
        <TabsContent value="cta" className="mt-4">
          <CmsSection sectionKey="cms_cta" title="CTA Banner" fields={[
            { name: "heading", label: "Heading" }, { name: "description", label: "Description", type: "textarea" },
            { name: "button_text", label: "Button Text" }, { name: "button_link", label: "Button Link" },
          ]} />
        </TabsContent>
        <TabsContent value="contact" className="mt-4">
          <CmsSection sectionKey="cms_contact" title="Contact Info" fields={[
            { name: "email", label: "Email" }, { name: "phone", label: "Phone" }, { name: "address", label: "Address" },
          ]} />
        </TabsContent>
        <TabsContent value="footer" className="mt-4">
          <CmsSection sectionKey="cms_footer" title="Footer" fields={[
            { name: "copyright", label: "Copyright Text" }, { name: "tagline", label: "Tagline" },
          ]} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
