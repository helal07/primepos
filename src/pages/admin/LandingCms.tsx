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
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
      <h4 className="text-base font-semibold text-white">{title}</h4>
      {fields.map((f) => (
        <div key={f.name}>
          <Label className="text-slate-300">{f.label}</Label>
          {f.type === "textarea" ? (
            <Textarea className="bg-slate-800 border-slate-700 text-white" value={values[f.name] ?? ""} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })} />
          ) : (
            <Input className="bg-slate-800 border-slate-700 text-white" value={values[f.name] ?? ""} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })} />
          )}
        </div>
      ))}
      <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => mutation.mutate({ key: sectionKey, value: values })} disabled={mutation.isPending} size="sm">
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
        <TabsList className="flex-wrap bg-slate-800 border-slate-700">
          <TabsTrigger value="hero" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400">Hero</TabsTrigger>
          <TabsTrigger value="features" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400">Features</TabsTrigger>
          <TabsTrigger value="testimonials" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400">Testimonials</TabsTrigger>
          <TabsTrigger value="cta" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400">CTA Banner</TabsTrigger>
          <TabsTrigger value="contact" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400">Contact</TabsTrigger>
          <TabsTrigger value="footer" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400">Footer</TabsTrigger>
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
