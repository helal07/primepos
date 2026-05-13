import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useExpense, useExpenseCategories, useExpenseMutations } from "@/hooks/useExpenses";
import { useAccounts } from "@/hooks/useAccounting";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useEmployees } from "@/hooks/useHRM";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Save } from "lucide-react";

export default function ExpenseAdd() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const editing = !!id;
  const { data: existing } = useExpense(id);
  const { data: categories } = useExpenseCategories();
  const { data: accounts } = useAccounts();
  const { data: warehouses } = useWarehouses();
  const { data: employees } = useEmployees();
  const { create, update } = useExpenseMutations();

  const [form, setForm] = useState({
    expense_date: new Date().toISOString().slice(0, 16),
    category_id: "",
    sub_category_id: "",
    location_id: "",
    account_id: "",
    payment_status: "paid",
    payment_method: "cash",
    tax_amount: 0,
    total_amount: 0,
    payment_due: 0,
    contact_name: "",
    expense_for_user_id: "",
    expense_note: "",
    recurring: false,
    recurring_interval: "monthly",
    recurring_repetitions: 0,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        expense_date: existing.expense_date?.slice(0, 16) ?? new Date().toISOString().slice(0, 16),
        category_id: existing.category_id ?? "",
        sub_category_id: existing.sub_category_id ?? "",
        location_id: existing.location_id ?? "",
        account_id: existing.account_id ?? "",
        payment_status: existing.payment_status ?? "paid",
        payment_method: existing.payment_method ?? "cash",
        tax_amount: Number(existing.tax_amount ?? 0),
        total_amount: Number(existing.total_amount ?? 0),
        payment_due: Number(existing.payment_due ?? 0),
        contact_name: existing.contact_name ?? "",
        expense_for_user_id: existing.expense_for_user_id ?? "",
        expense_note: existing.expense_note ?? "",
        recurring: !!existing.recurring,
        recurring_interval: existing.recurring_interval ?? "monthly",
        recurring_repetitions: existing.recurring_repetitions ?? 0,
      });
    }
  }, [existing]);

  const parents = categories?.filter((c) => !c.parent_id) ?? [];
  const subs = categories?.filter((c) => c.parent_id === form.category_id) ?? [];

  const submit = () => {
    const payload = {
      ...form,
      category_id: form.category_id || null,
      sub_category_id: form.sub_category_id || null,
      location_id: form.location_id || null,
      account_id: form.account_id || null,
      expense_for_user_id: form.expense_for_user_id || null,
      payment_due: form.payment_status === "paid" ? 0 : Number(form.payment_due) || Number(form.total_amount),
    };
    if (editing) update.mutate({ id: id!, ...payload }, { onSuccess: () => navigate("/expenses") });
    else create.mutate(payload, { onSuccess: () => navigate("/expenses") });
  };

  return (
    <div className="space-y-6">
      <PageHeader title={editing ? "Edit Expense" : "Add Expense"} description="Record a new business expense" />
      <Card>
        <CardContent className="pt-6 grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Date *</Label>
            <Input type="datetime-local" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Select value={form.location_id || "none"} onValueChange={(v) => setForm({ ...form, location_id: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {warehouses?.map((w: any) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Expense Category</Label>
            <Select value={form.category_id || "none"} onValueChange={(v) => setForm({ ...form, category_id: v === "none" ? "" : v, sub_category_id: "" })}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {parents.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Sub Category</Label>
            <Select value={form.sub_category_id || "none"} onValueChange={(v) => setForm({ ...form, sub_category_id: v === "none" ? "" : v })} disabled={!form.category_id || subs.length === 0}>
              <SelectTrigger><SelectValue placeholder="Select sub category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {subs.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Expense For (Employee)</Label>
            <Select value={form.expense_for_user_id || "none"} onValueChange={(v) => setForm({ ...form, expense_for_user_id: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {employees?.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.full_name || e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Contact / Beneficiary</Label>
            <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} placeholder="e.g. Vendor name" />
          </div>
          <div className="space-y-2">
            <Label>Tax Amount</Label>
            <Input type="number" step="0.01" value={form.tax_amount} onChange={(e) => setForm({ ...form, tax_amount: Number(e.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label>Total Amount *</Label>
            <Input type="number" step="0.01" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: Number(e.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label>Payment Status</Label>
            <Select value={form.payment_status} onValueChange={(v) => setForm({ ...form, payment_status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="due">Due</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank">Bank Transfer</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="mobile">Mobile Banking</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Account</Label>
            <Select value={form.account_id || "none"} onValueChange={(v) => setForm({ ...form, account_id: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Post to accounting account" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {accounts?.filter((a: any) => a.type === "expense").map((a: any) => (
                  <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {form.payment_status !== "paid" && (
            <div className="space-y-2">
              <Label>Payment Due</Label>
              <Input type="number" step="0.01" value={form.payment_due} onChange={(e) => setForm({ ...form, payment_due: Number(e.target.value) })} />
            </div>
          )}
          <div className="md:col-span-2 space-y-2">
            <Label>Note</Label>
            <Textarea value={form.expense_note} onChange={(e) => setForm({ ...form, expense_note: e.target.value })} rows={3} />
          </div>
          <div className="md:col-span-2 flex items-center gap-3">
            <Switch checked={form.recurring} onCheckedChange={(v) => setForm({ ...form, recurring: v })} />
            <Label>Recurring expense</Label>
          </div>
          {form.recurring && (
            <>
              <div className="space-y-2">
                <Label>Interval</Label>
                <Select value={form.recurring_interval} onValueChange={(v) => setForm({ ...form, recurring_interval: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Repetitions (0 = unlimited)</Label>
                <Input type="number" value={form.recurring_repetitions} onChange={(e) => setForm({ ...form, recurring_repetitions: Number(e.target.value) })} />
              </div>
            </>
          )}
        </CardContent>
      </Card>
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate("/expenses")}>Cancel</Button>
        <Button onClick={submit} disabled={!form.total_amount || create.isPending || update.isPending} className="gap-2">
          <Save className="h-4 w-4" /> {editing ? "Update" : "Save"} Expense
        </Button>
      </div>
    </div>
  );
}