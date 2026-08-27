import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useInstallmentCustomers, useInstallmentSaleMutations, useNidRiskCheck, type NidRiskResult } from "@/hooks/useInstallments";
import { NidRiskDialog } from "@/components/installments/NidRiskDialog";
import { useProducts } from "@/hooks/useInventory";
import { useAvailableSerials } from "@/hooks/useAvailableSerials";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ArrowLeft, Save, Trash2, CalendarPlus, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScheduleRow {
  serial_no: number;
  amount: number;
  due_date: string;
}

export default function InstallmentSaleAdd() {
  const navigate = useNavigate();
  const { data: instCustomers } = useInstallmentCustomers();
  const { data: products } = useProducts();
  const { create } = useInstallmentSaleMutations();
  const [saving, setSaving] = useState(false);
  const riskCheck = useNidRiskCheck();
  const [risk, setRisk] = useState<NidRiskResult | null>(null);

  const [form, setForm] = useState({
    sale_date: new Date().toISOString().split("T")[0],
    installment_customer_id: "",
    customer_id: "",
    product_id: "",
    imei_serial: "",
    price: 0,
    discount: 0,
    interest_percent: 0,
    shipping_cost: 0,
    down_payment: 0,
    down_payment_account: "cash",
    num_installments: 6,
    installment_duration_days: 30,
    notes: "",
  });

  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [imeiOpen, setImeiOpen] = useState(false);

  const selectedProduct = useMemo(
    () => products?.find((p) => p.id === form.product_id) as any,
    [products, form.product_id]
  );
  const isSerialProduct = !!(
    selectedProduct?.serial_tracking ||
    selectedProduct?.product_type === "imei" ||
    selectedProduct?.product_type === "serial"
  );
  const { data: availableSerials } = useAvailableSerials(
    isSerialProduct ? form.product_id : null
  );

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));
  const setNum = (k: string, v: string) => set(k, parseFloat(v) || 0);

  const total = useMemo(() => {
    return (form.price - form.discount) * (1 + form.interest_percent / 100) + form.shipping_cost;
  }, [form.price, form.discount, form.interest_percent, form.shipping_cost]);

  const remaining = useMemo(() => Math.max(0, total - form.down_payment), [total, form.down_payment]);

  const generateSchedule = () => {
    if (form.num_installments < 1) return;
    const perInst = Math.round((remaining / form.num_installments) * 100) / 100;
    const rows: ScheduleRow[] = [];
    const startDate = new Date(form.sale_date);
    for (let i = 0; i < form.num_installments; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + (i + 1) * form.installment_duration_days);
      rows.push({ serial_no: i + 1, amount: perInst, due_date: d.toISOString().split("T")[0] });
    }
    // Adjust rounding on last
    const diff = remaining - rows.reduce((s, r) => s + r.amount, 0);
    if (rows.length) rows[rows.length - 1].amount = Math.round((rows[rows.length - 1].amount + diff) * 100) / 100;
    setSchedules(rows);
  };

  const removeSchedule = (i: number) => setSchedules((s) => s.filter((_, idx) => idx !== i));

  const handleSelectCustomer = (icId: string) => {
    const ic = instCustomers?.find((c: any) => c.id === icId);
    set("installment_customer_id", icId);
    if (ic?.customer_id) set("customer_id", ic.customer_id);

    // Cross-tenant credit warning based on the customer's NID.
    const nid = String(ic?.nid ?? "").replace(/\D+/g, "");
    if (nid.length >= 8) {
      riskCheck.mutateAsync(nid)
        .then((res) => { if (res.has_risk) setRisk(res); })
        .catch(() => {});
    }
  };

  const handleSelectProduct = (pid: string) => {
    const p = products?.find((pr) => pr.id === pid);
    set("product_id", pid);
    set("imei_serial", "");
    if (p) { set("price", p.selling_price); }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await create.mutateAsync({
        ...form,
        total_amount: total,
        remaining_amount: remaining,
        schedules: schedules.map((s) => ({
          serial_no: s.serial_no,
          amount: s.amount,
          due_date: s.due_date,
        })),
      });
      navigate("/installment/sales");
    } catch {
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="New Installment Sale" description="Create installment sale with payment schedule" actions={
        <Button variant="outline" onClick={() => navigate("/installment/sales")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
      } />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left — Sale Details */}
        <Card>
          <CardHeader><CardTitle className="text-base">Sale Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Sale Date</Label><Input type="date" value={form.sale_date} onChange={(e) => set("sale_date", e.target.value)} /></div>
              <div>
                <Label>Customer *</Label>
                <Select value={form.installment_customer_id} onValueChange={handleSelectCustomer}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {instCustomers?.filter((c: any) => c.id).map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.customers?.name || "—"} ({c.guarantor_name})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Product *</Label>
                <Select value={form.product_id} onValueChange={handleSelectProduct}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {products?.filter((p) => p.id).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>IMEI / Serial</Label>
                {isSerialProduct ? (
                  <Popover open={imeiOpen} onOpenChange={setImeiOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between font-normal"
                      >
                        <span className={cn(!form.imei_serial && "text-muted-foreground")}>
                          {form.imei_serial || `Select IMEI/Serial (${availableSerials?.length ?? 0} available)`}
                        </span>
                        <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search IMEI / Serial..." />
                        <CommandList>
                          <CommandEmpty>
                            {availableSerials?.length
                              ? "No match."
                              : "No available IMEI/Serial in stock."}
                          </CommandEmpty>
                          <CommandGroup>
                            {(availableSerials || []).map((sn) => (
                              <CommandItem
                                key={sn}
                                value={sn}
                                onSelect={() => {
                                  set("imei_serial", sn);
                                  setImeiOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    form.imei_serial === sn ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {sn}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <Input
                    value={form.imei_serial}
                    onChange={(e) => set("imei_serial", e.target.value)}
                    placeholder={form.product_id ? "Optional" : "Select product first"}
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div><Label>Price</Label><Input type="number" value={form.price} onChange={(e) => setNum("price", e.target.value)} /></div>
              <div><Label>Discount</Label><Input type="number" value={form.discount} onChange={(e) => setNum("discount", e.target.value)} /></div>
              <div><Label>Interest %</Label><Input type="number" value={form.interest_percent} onChange={(e) => setNum("interest_percent", e.target.value)} /></div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div><Label>Shipping</Label><Input type="number" value={form.shipping_cost} onChange={(e) => setNum("shipping_cost", e.target.value)} /></div>
              <div><Label>Total</Label><Input value={total.toFixed(2)} readOnly className="bg-muted" /></div>
              <div><Label>Down Payment</Label><Input type="number" value={form.down_payment} onChange={(e) => setNum("down_payment", e.target.value)} /></div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Down Payment A/C</Label>
                <Select value={form.down_payment_account} onValueChange={(v) => set("down_payment_account", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Remaining</Label><Input value={remaining.toFixed(2)} readOnly className="bg-muted" /></div>
              <div><Label># Installments</Label><Input type="number" value={form.num_installments} onChange={(e) => setNum("num_installments", e.target.value)} /></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><Label>Duration (days)</Label><Input type="number" value={form.installment_duration_days} onChange={(e) => setNum("installment_duration_days", e.target.value)} /></div>
              <div className="flex items-end">
                <Button type="button" onClick={generateSchedule} className="w-full">
                  <CalendarPlus className="h-4 w-4 mr-2" /> Generate Schedule
                </Button>
              </div>
            </div>

            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
          </CardContent>
        </Card>

        {/* Right — Schedule */}
        <Card>
          <CardHeader><CardTitle className="text-base">Installment Schedule</CardTitle></CardHeader>
          <CardContent>
            {!schedules.length ? (
              <p className="text-muted-foreground text-center py-8">Click "Generate Schedule" to create payment plan</p>
            ) : (
              <div className="border rounded-lg overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">SN</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell>{s.serial_no}</TableCell>
                        <TableCell>{s.amount.toFixed(2)}</TableCell>
                        <TableCell>{s.due_date}</TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" onClick={() => removeSchedule(i)}><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold">
                      <TableCell>Total</TableCell>
                      <TableCell>{schedules.reduce((s, r) => s + r.amount, 0).toFixed(2)}</TableCell>
                      <TableCell colSpan={2}></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Button onClick={handleSubmit} disabled={saving}>
        <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Create Installment Sale"}
      </Button>

      <NidRiskDialog
        open={!!risk}
        result={risk}
        onCancel={() => { setRisk(null); set("installment_customer_id", ""); }}
        onContinue={() => setRisk(null)}
        continueLabel="Proceed with this customer"
      />

    </div>
  );
}
