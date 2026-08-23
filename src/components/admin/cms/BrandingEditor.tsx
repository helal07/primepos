import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, Upload } from "lucide-react";
import { uploadFile, normalizeStorageUrl } from "@/lib/storage";
import { useLandingCms, useLandingCmsMutation } from "@/hooks/useSaasAdmin";
import { toast } from "sonner";
import { toFriendlyError } from "@/lib/friendlyError";

type Branding = {
  brand_name?: string;
  brand_short?: string;
  logo_url?: string;
  favicon_url?: string;
  apple_touch_url?: string;
  theme_color?: string;
  og_default_image?: string;
};

function UploadField({
  label, value, onChange, accept, prefix,
}: { label: string; value?: string; onChange: (url: string) => void; accept: string; prefix: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const filename = `${prefix}/${prefix}-${Date.now()}.${ext}`;
      const { url } = await uploadFile("branding", file, { filename });
      onChange(url);
      toast.success(`${label} uploaded`);
    } catch (e: any) {
      toast.error(toFriendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="https://..." />
        <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => ref.current?.click()}>
          <Upload className="h-4 w-4 mr-1" /> {busy ? "..." : "Upload"}
        </Button>
      </div>
      {value && (
        <div className="flex items-center gap-3 pt-1">
          <img src={normalizeStorageUrl(value)} alt={label} className="h-12 w-12 object-contain border border-border rounded bg-muted/30" />
          <span className="text-xs text-muted-foreground truncate max-w-md">{value}</span>
        </div>
      )}
    </div>
  );
}

export function BrandingEditor() {
  const { data } = useLandingCms("cms_branding");
  const mutation = useLandingCmsMutation();
  const [values, setValues] = useState<Branding>({});

  useEffect(() => {
    if (data && typeof data === "object") setValues(data as Branding);
  }, [data]);

  const set = (patch: Partial<Branding>) => setValues((v) => ({ ...v, ...patch }));

  return (
    <Card>
      <CardContent className="p-5 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Brand Name</Label>
            <Input value={values.brand_name ?? ""} onChange={(e) => set({ brand_name: e.target.value })} placeholder="Prime POS" />
          </div>
          <div className="space-y-2">
            <Label>Brand Short Name</Label>
            <Input value={values.brand_short ?? ""} onChange={(e) => set({ brand_short: e.target.value })} placeholder="P" maxLength={4} />
          </div>
        </div>

        <UploadField label="Logo" value={values.logo_url} accept="image/*" prefix="logo" onChange={(url) => set({ logo_url: url })} />
        <UploadField label="Favicon (32x32 PNG/ICO)" value={values.favicon_url} accept="image/png,image/x-icon,image/svg+xml" prefix="favicon" onChange={(url) => set({ favicon_url: url })} />
        <UploadField label="Apple Touch Icon (180x180 PNG)" value={values.apple_touch_url} accept="image/png" prefix="apple-icon" onChange={(url) => set({ apple_touch_url: url })} />
        <UploadField label="Default OG Image (1200x630)" value={values.og_default_image} accept="image/*" prefix="og" onChange={(url) => set({ og_default_image: url })} />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Theme Color</Label>
            <div className="flex items-center gap-2">
              <Input type="color" className="w-16 h-10 p-1" value={values.theme_color ?? "#0369a1"} onChange={(e) => set({ theme_color: e.target.value })} />
              <Input value={values.theme_color ?? ""} onChange={(e) => set({ theme_color: e.target.value })} placeholder="#0369a1" />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={() => mutation.mutate({ key: "cms_branding", value: values })} disabled={mutation.isPending}>
            <Save className="h-4 w-4 mr-1" /> Save Branding
          </Button>
        </div>

        <p className="text-xs text-muted-foreground border-t border-border pt-3">
          Changes apply immediately to the public landing page (favicon, logo, theme color, OG preview).
        </p>
      </CardContent>
    </Card>
  );
}