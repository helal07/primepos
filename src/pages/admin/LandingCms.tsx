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

      <Tabs defaultValue="hero">
        <TabsList className="flex-wrap bg-muted border-border">
          <TabsTrigger value="hero" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground">Hero</TabsTrigger>
          <TabsTrigger value="seo" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground">SEO</TabsTrigger>
          <TabsTrigger value="features" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground">Features</TabsTrigger>
          <TabsTrigger value="testimonials" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground">Testimonials</TabsTrigger>
          <TabsTrigger value="faq" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground">FAQ</TabsTrigger>
          <TabsTrigger value="promo" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground">Promotion</TabsTrigger>
          <TabsTrigger value="cta" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground">CTA Banner</TabsTrigger>
          <TabsTrigger value="contact" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground">Contact</TabsTrigger>
          <TabsTrigger value="footer" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground">Footer</TabsTrigger>
        </TabsList>

        <TabsContent value="hero" className="mt-4">
          <CmsSection sectionKey="cms_hero" title="Hero Section" fields={[
            { name: "title", label: "Title" }, { name: "subtitle", label: "Subtitle", type: "textarea" },
            { name: "cta_text", label: "CTA Button Text" }, { name: "cta_link", label: "CTA Link" },
          ]} />
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
