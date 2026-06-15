import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCustomers } from "@/hooks/useContacts";
import { useInstallmentCustomerMutations } from "@/hooks/useInstallments";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { uploadFile as apiUploadFile } from "@/lib/storage";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Upload, Save, UserPlus } from "lucide-react";
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
  const [nidFile, setNidFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [gNidFile, setGNidFile] = useState<File | null>(null);
  const [gPhotoFile, setGPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const uploadFile = async (input: File, folder: string) => {
    const { compressIfImage } = await import("@/lib/compressImage");
    const file = await compressIfImage(input, { maxWidth: 1800, maxHeight: 1800, quality: 0.82 });
    const ext = file.name.split(".").pop();
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { path } = await apiUploadFile("installment-docs", file, { filename });
    // Store the path; bucket is private — UI fetches signed URLs to display
    return path;
  };

  const handleSubmit = async (addMore = false) => {
    if (!form.customer_id) { toast({ title: "Select a customer", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const nid_url = nidFile ? await uploadFile(nidFile, "nid") : null;
      const photo_url = photoFile ? await uploadFile(photoFile, "photo") : null;
      const guarantor_nid_url = gNidFile ? await uploadFile(gNidFile, "guarantor-nid") : null;
      const guarantor_photo_url = gPhotoFile ? await uploadFile(gPhotoFile, "guarantor-photo") : null;

      await create.mutateAsync({
        ...form,
        nid_url,
        photo_url,
        guarantor_nid_url,
        guarantor_photo_url,
        created_by: user?.id,
      });

      if (addMore) {
        setForm(defaultForm);
        setNidFile(null); setPhotoFile(null); setGNidFile(null); setGPhotoFile(null);
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
              <div>
                <Label>NID Photo</Label>
                <Input type="file" accept="image/*" onChange={(e) => setNidFile(e.target.files?.[0] || null)} />
                {nidFile && <p className="text-xs text-muted-foreground mt-1">{nidFile.name}</p>}
              </div>
              <div>
                <Label>Customer Photo</Label>
                <Input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
                {photoFile && <p className="text-xs text-muted-foreground mt-1">{photoFile.name}</p>}
              </div>
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
              <div>
                <Label>Guarantor NID</Label>
                <Input type="file" accept="image/*" onChange={(e) => setGNidFile(e.target.files?.[0] || null)} />
              </div>
              <div>
                <Label>Guarantor Photo</Label>
                <Input type="file" accept="image/*" onChange={(e) => setGPhotoFile(e.target.files?.[0] || null)} />
              </div>
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
