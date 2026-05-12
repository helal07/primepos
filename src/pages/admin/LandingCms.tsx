import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useLandingCms, useLandingCmsMutation } from "@/hooks/useSaasAdmin";
import { Save } from "lucide-react";

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

export default function LandingCms() {
  return (
    <div className="space-y-6">
      <PageHeader title="Landing Page CMS" subtitle="Edit your public landing page content" />

      <Tabs defaultValue="hero">
        <TabsList className="flex-wrap bg-muted border-border">
          <TabsTrigger value="hero" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground">Hero</TabsTrigger>
          <TabsTrigger value="features" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground">Features</TabsTrigger>
          <TabsTrigger value="testimonials" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground">Testimonials</TabsTrigger>
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
