import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCustomers, useCustomerMutations } from "@/hooks/useContacts";
import { useCustomerGroups } from "@/hooks/usePriceGroups";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Check } from "lucide-react";

const NONE = "__none__";
const defaultForm = {
  name: "", phone: "", email: "", address: "", company: "", tax_number: "",
  credit_limit: "", customer_group_id: NONE, notes: "", is_active: true,
};

export default function CustomerAdd() {
  const navigate = useNavigate();
  const { id } = useParams();
  const editId = id ?? null;
  const { data: customers } = useCustomers();
  const { data: customerGroups } = useCustomerGroups();
  const { create, update } = useCustomerMutations();
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    if (!editId || !customers) return;
    const c: any = customers.find((x: any) => String(x.id) === String(editId));
    if (!c) return;
    setForm({
      name: c.name ?? "", phone: c.phone ?? "", email: c.email ?? "",
      address: c.address ?? "", company: c.company ?? "", tax_number: c.tax_number ?? "",
      credit_limit: c.credit_limit == null ? "" : String(c.credit_limit),
      customer_group_id: c.customer_group_id || NONE,
      notes: c.notes ?? "", is_active: !!c.is_active,
    });
  }, [editId, customers]);

  const phoneDigits = form.phone.replace(/\D+/g, "");
  const phoneValid = phoneDigits.length >= 6 && phoneDigits.length <= 20;
  const phoneError = form.phone.trim() === ""
    ? "Mobile number is required"
    : (!phoneValid ? "Enter a valid mobile number (6-20 digits)" : "");

  const handleSubmit = () => {
    if (!form.name || !phoneValid) return;
    const payload = {
      name: form.name,
      phone: form.phone.trim(),
      email: form.email || null,
      address: form.address || null,
      company: form.company || null,
      tax_number: form.tax_number || null,
      credit_limit: form.credit_limit === "" ? null : Number(form.credit_limit),
      customer_group_id: form.customer_group_id === NONE ? null : form.customer_group_id,
      notes: form.notes || null,
      is_active: form.is_active,
    };
    const done = { onSuccess: () => navigate("/customers") };
    if (editId) update.mutate({ id: editId, ...payload } as any, done);
    else create.mutate(payload as any, done);
  };


  return (
    <div className="space-y-6">
      <PageHeader
        title={editId ? "Edit Customer" : "Add Customer"}
        description="Customer information"
        actions={
          <Button variant="outline" onClick={() => navigate("/customers")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-5">
            <div className="space-y-2">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email" />
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Company name" />
            </div>
            <div className="space-y-2">
              <Label>Tax Number</Label>
              <Input value={form.tax_number} onChange={e => setForm({ ...form, tax_number: e.target.value })} placeholder="TIN / VAT" />
            </div>
            <div className="space-y-2">
              <Label>Credit Limit</Label>
              <Input
                type="number" min="0" step="0.01"
                value={form.credit_limit}
                onChange={e => setForm({ ...form, credit_limit: e.target.value })}
                placeholder="Credit Limit"
              />
              <p className="text-xs text-muted-foreground">Keep blank for no limit</p>
            </div>
            <div className="space-y-2">
              <Label>Customer Group</Label>
              <Select value={form.customer_group_id} onValueChange={v => setForm({ ...form, customer_group_id: v })}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None (default price)</SelectItem>
                  {customerGroups?.filter((g: any) => g.is_active).map((g: any) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Determines the selling price tier at POS / Sale.</p>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Address" rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Internal notes" rows={3} />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              <Label>Active</Label>
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t">
            <Button className="mt-4" onClick={handleSubmit} disabled={!form.name || create.isPending || update.isPending}>
              <Check className="mr-2 h-4 w-4" /> {editId ? "Update" : "Submit"}
            </Button>
            <Button className="mt-4" variant="outline" onClick={() => navigate("/customers")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
