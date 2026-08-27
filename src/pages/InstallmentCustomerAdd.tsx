import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCustomers } from "@/hooks/useContacts";
import { useInstallmentCustomerMutations } from "@/hooks/useInstallments";
import { useAuth } from "@/contexts/AuthContext";
import { uploadFile as apiUploadFile } from "@/lib/storage";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, UserPlus } from "lucide-react";
import { MediaCapture } from "@/components/exchange/MediaCapture";
import { useToast } from "@/hooks/use-toast";

const defaultForm = {
  customer_id: "",
  permanent_address: "",
  work_address: "",
  guarantor_name: "",
  guarantor_mobile: "",
  guarantor_present_address: "",
  guarantor_permanent_address: "",
  guarantor_work_address: "",
};

export default function InstallmentCustomerAdd() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: customers } = useCustomers();
  const { create } = useInstallmentCustomerMutations();
  const [form, setForm] = useState(defaultForm);
  // Storage paths (private bucket) produced by MediaCapture — upload/live camera.
  const [nidPath, setNidPath] = useState<string | null>(null);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [gNidPath, setGNidPath] = useState<string | null>(null);
  const [gPhotoPath, setGPhotoPath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (addMore = false) => {
    if (!form.customer_id) { toast({ title: "Select a customer", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const selected = customers?.find((c: any) => c.id === form.customer_id) as any;

      await create.mutateAsync({
        ...form,
        // legacy NOT NULL columns — mirror the linked customer
        name: selected?.name ?? null,
        phone: selected?.phone ?? null,
        nid_url: nidPath,
        photo_url: photoPath,
        guarantor_nid_url: gNidPath,
        guarantor_photo_url: gPhotoPath,
        created_by: user?.id,
      });


      if (addMore) {
        setForm(defaultForm);
        setNidPath(null); setPhotoPath(null); setGNidPath(null); setGPhotoPath(null);
      } else {
        navigate("/installment/customers");
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Add Installment Customer" description="Register customer with NID, photo and guarantor details" actions={
        <Button variant="outline" onClick={() => navigate("/installment/customers")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
      } />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Customer Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Customer *</Label>
              <Select value={form.customer_id} onValueChange={(v) => set("customer_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers?.filter(c => c.id).map((c) => (
                    <SelectItem key={c.id} value={c.id!}>{c.name} — {c.phone}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Permanent Address</Label>
              <Textarea value={form.permanent_address} onChange={(e) => set("permanent_address", e.target.value)} />
            </div>
            <div>
              <Label>Work Address</Label>
              <Textarea value={form.work_address} onChange={(e) => set("work_address", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <MediaCapture
                label="NID Photo" value={nidPath} onChange={setNidPath}
                tenantId={user?.tenant_id} folder="installments/nid"
                bucket="installment-docs" returnPath enableCamera
              />
              <MediaCapture
                label="Customer Photo" value={photoPath} onChange={setPhotoPath}
                tenantId={user?.tenant_id} folder="installments/photo"
                bucket="installment-docs" returnPath enableCamera
              />
            </div>
          </CardContent>
        </Card>

        {/* Guarantor Info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Guarantor Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Guarantor Name *</Label>
                <Input value={form.guarantor_name} onChange={(e) => set("guarantor_name", e.target.value)} />
              </div>
              <div>
                <Label>Guarantor Mobile *</Label>
                <Input value={form.guarantor_mobile} onChange={(e) => set("guarantor_mobile", e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Present Address</Label>
              <Textarea value={form.guarantor_present_address} onChange={(e) => set("guarantor_present_address", e.target.value)} />
            </div>
            <div>
              <Label>Permanent Address</Label>
              <Textarea value={form.guarantor_permanent_address} onChange={(e) => set("guarantor_permanent_address", e.target.value)} />
            </div>
            <div>
              <Label>Work Address</Label>
              <Textarea value={form.guarantor_work_address} onChange={(e) => set("guarantor_work_address", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <MediaCapture
                label="Guarantor NID" value={gNidPath} onChange={setGNidPath}
                tenantId={user?.tenant_id} folder="installments/guarantor-nid"
                bucket="installment-docs" returnPath enableCamera
              />
              <MediaCapture
                label="Guarantor Photo" value={gPhotoPath} onChange={setGPhotoPath}
                tenantId={user?.tenant_id} folder="installments/guarantor-photo"
                bucket="installment-docs" returnPath enableCamera
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Button onClick={() => handleSubmit(false)} disabled={saving}>
          <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Submit"}
        </Button>
        <Button variant="outline" onClick={() => handleSubmit(true)} disabled={saving}>
          <UserPlus className="h-4 w-4 mr-2" /> Save & Add More
        </Button>
      </div>
    </div>
  );
}
