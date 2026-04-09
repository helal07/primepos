import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useLandingCms, useLandingCmsMutation } from "@/hooks/useSaasAdmin";
import { Save } from "lucide-react";

function CmsSection({ sectionKey, title, fields }: {
  sectionKey: string;
  title: string;
  fields: { name: string; label: string; type?: "text" | "textarea" }[];
}) {
  const { data, isLoading } = useLandingCms(sectionKey);
  const mutation = useLandingCmsMutation();
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data && typeof data === "object") {
      setValues(data as Record<string, string>);
    }
  }, [data]);

  const save = () => mutation.mutate({ key: sectionKey, value: values });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {fields.map((f) => (
          <div key={f.name}>
            <Label>{f.label}</Label>
            {f.type === "textarea" ? (
              <Textarea value={values[f.name] ?? ""} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })} />
            ) : (
              <Input value={values[f.name] ?? ""} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })} />
            )}
          </div>
        ))}
        <Button onClick={save} disabled={mutation.isPending} size="sm">
          <Save className="h-4 w-4 mr-1" /> Save
        </Button>
      </CardContent>
    </Card>
  );
}

export default function LandingCms() {
  return (
    <div className="space-y-6">
      <PageHeader title="Landing Page CMS" subtitle="Edit your public landing page content" />

      <Tabs defaultValue="hero">
        <TabsList className="flex-wrap">
          <TabsTrigger value="hero">Hero</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="testimonials">Testimonials</TabsTrigger>
          <TabsTrigger value="cta">CTA Banner</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="footer">Footer</TabsTrigger>
        </TabsList>

        <TabsContent value="hero" className="mt-4">
          <CmsSection
            sectionKey="cms_hero"
            title="Hero Section"
            fields={[
              { name: "title", label: "Title" },
              { name: "subtitle", label: "Subtitle", type: "textarea" },
              { name: "cta_text", label: "CTA Button Text" },
              { name: "cta_link", label: "CTA Link" },
            ]}
          />
        </TabsContent>

        <TabsContent value="features" className="mt-4">
          <CmsSection
            sectionKey="cms_features"
            title="Features Section"
            fields={[
              { name: "heading", label: "Section Heading" },
              { name: "subheading", label: "Subheading" },
            ]}
          />
        </TabsContent>

        <TabsContent value="testimonials" className="mt-4">
          <CmsSection
            sectionKey="cms_testimonials"
            title="Testimonials Section"
            fields={[
              { name: "heading", label: "Section Heading" },
              { name: "subheading", label: "Subheading" },
            ]}
          />
        </TabsContent>

        <TabsContent value="cta" className="mt-4">
          <CmsSection
            sectionKey="cms_cta"
            title="CTA Banner"
            fields={[
              { name: "heading", label: "Heading" },
              { name: "description", label: "Description", type: "textarea" },
              { name: "button_text", label: "Button Text" },
              { name: "button_link", label: "Button Link" },
            ]}
          />
        </TabsContent>

        <TabsContent value="contact" className="mt-4">
          <CmsSection
            sectionKey="cms_contact"
            title="Contact Info"
            fields={[
              { name: "email", label: "Email" },
              { name: "phone", label: "Phone" },
              { name: "address", label: "Address" },
            ]}
          />
        </TabsContent>

        <TabsContent value="footer" className="mt-4">
          <CmsSection
            sectionKey="cms_footer"
            title="Footer"
            fields={[
              { name: "copyright", label: "Copyright Text" },
              { name: "tagline", label: "Tagline" },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
