import { useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, MapPin, Phone, Mail, Building2, Receipt, Wallet, CreditCard, FileText, Activity as ActivityIcon, User } from "lucide-react";

type ContactKind = "customer" | "supplier";

function fmt(n: number | string | null | undefined) {
  return `৳${Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function dateRangeDefaults() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
  const end = new Date(now.getFullYear(), 11, 31).toISOString().slice(0, 10);
  return { start, end };
}

export default function ContactProfile({ kind }: { kind: ContactKind }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const def = dateRangeDefaults();
  const [from, setFrom] = useState(def.start);
  const [to, setTo] = useState(def.end);
  const isCustomer = kind === "customer";
  const table = isCustomer ? "customers" : "suppliers";
  const txTable = isCustomer ? "sales" : "purchases";
  const txDateCol = isCustomer ? "sale_date" : "purchase_date";
  const fkCol = isCustomer ? "customer_id" : "supplier_id";
  const txInvoiceCol = isCustomer ? "invoice_number" : "reference_number";
  const paymentsTable = isCustomer ? "sale_payments" : "purchase_payments";
  const paymentFkCol = isCustomer ? "sale_id" : "purchase_id";

  const contactQ = useQuery({
    queryKey: [table, id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from(table as any).select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const txQ = useQuery({
    queryKey: [txTable, "by-contact", id, from, to],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(txTable as any)
        .select("*")
        .eq(fkCol, id!)
        .gte(txDateCol, from)
        .lte(txDateCol, to)
        .order(txDateCol, { ascending: false });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const overallQ = useQuery({
    queryKey: [txTable, "overall", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(txTable as any)
        .select("total_amount")
        .eq(fkCol, id!);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const txIds = (txQ.data ?? []).map((t: any) => t.id);

  const paymentsQ = useQuery({
    queryKey: [paymentsTable, id, txIds.length],
    enabled: txIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(paymentsTable as any)
        .select("*")
        .in(paymentFkCol, txIds);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const activityQ = useQuery({
    queryKey: ["activity_log", kind, id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_log")
        .select("*")
        .eq("entity_type", kind)
        .eq("entity_id", id!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const summary = useMemo(() => {
    const rows = txQ.data ?? [];
    const totalInvoice = rows.reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0);
    const payments = paymentsQ.data ?? [];
    const totalPaid = payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const overallInvoice = (overallQ.data ?? []).reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0);
    return { totalInvoice, totalPaid, balanceDue: totalInvoice - totalPaid, overallInvoice };
  }, [txQ.data, paymentsQ.data, overallQ.data]);

  if (contactQ.isLoading) return <Skeleton className="h-[400px] w-full" />;
  const c = contactQ.data;
  if (!c) return <div className="p-6 text-muted-foreground">Contact not found.</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="View Contact"
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        }
      />

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-semibold">{c.name}</h2>
                  <Badge variant="secondary">{isCustomer ? "Customer" : "Supplier"}</Badge>
                  {!c.is_active && <Badge variant="outline">Inactive</Badge>}
                </div>
                {c.company && (
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" /> {c.company}
                  </div>
                )}
                {c.phone && (
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" /> {c.phone}
                  </div>
                )}
                {c.email && (
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" /> {c.email}
                  </div>
                )}
                {c.address && (
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {c.address}
                  </div>
                )}
                {c.tax_number && (
                  <div className="text-sm text-muted-foreground">TIN/VAT: {c.tax_number}</div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 min-w-[260px]">
              <Card className="bg-muted/30">
                <CardContent className="p-3">
                  <div className="text-xs text-muted-foreground">Balance</div>
                  <div className="text-lg font-semibold">{fmt(c.balance)}</div>
                </CardContent>
              </Card>
              {isCustomer && (
                <Card className="bg-muted/30">
                  <CardContent className="p-3">
                    <div className="text-xs text-muted-foreground">Credit Limit</div>
                    <div className="text-lg font-semibold">
                      {c.credit_limit == null ? "—" : fmt(c.credit_limit)}
                    </div>
                  </CardContent>
                </Card>
              )}
              <Card className="bg-muted/30 col-span-2">
                <CardContent className="p-3">
                  <div className="text-xs text-muted-foreground">Total Invoice (overall)</div>
                  <div className="text-lg font-semibold">{fmt(summary.overallInvoice)}</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="ledger">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="ledger"><Receipt className="mr-1.5 h-4 w-4" /> Ledger</TabsTrigger>
          <TabsTrigger value="transactions">
            {isCustomer ? <><Wallet className="mr-1.5 h-4 w-4" /> Sales</> : <><Wallet className="mr-1.5 h-4 w-4" /> Purchases</>}
          </TabsTrigger>
          <TabsTrigger value="payments"><CreditCard className="mr-1.5 h-4 w-4" /> Payments</TabsTrigger>
          <TabsTrigger value="documents"><FileText className="mr-1.5 h-4 w-4" /> Documents & Notes</TabsTrigger>
          <TabsTrigger value="activity"><ActivityIcon className="mr-1.5 h-4 w-4" /> Activities</TabsTrigger>
        </TabsList>

        <div className="flex flex-col sm:flex-row gap-3 items-end mt-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">From</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">To</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        <TabsContent value="ledger" className="mt-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg border p-4">
                  <div className="text-xs text-muted-foreground">Total Invoice</div>
                  <div className="text-xl font-semibold">{fmt(summary.totalInvoice)}</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-xs text-muted-foreground">Total Paid</div>
                  <div className="text-xl font-semibold">{fmt(summary.totalPaid)}</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-xs text-muted-foreground">Balance Due</div>
                  <div className="text-xl font-semibold">{fmt(summary.balanceDue)}</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Showing all {isCustomer ? "invoices" : "purchases"} and payments between {from} and {to}
              </div>
              <LedgerTable
                isCustomer={isCustomer}
                txs={txQ.data ?? []}
                payments={paymentsQ.data ?? []}
                invoiceCol={txInvoiceCol}
                dateCol={txDateCol}
                txBaseRoute={isCustomer ? "/sales" : "/purchases"}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>{isCustomer ? "Invoice No" : "Reference"}</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(txQ.data ?? []).length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No records</TableCell></TableRow>
                  ) : (txQ.data ?? []).map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell>{t[txDateCol]}</TableCell>
                      <TableCell className="font-medium">{t[txInvoiceCol]}</TableCell>
                      <TableCell className="text-right">{fmt(t.total_amount)}</TableCell>
                      <TableCell><Badge variant={t.payment_status === "paid" ? "default" : "secondary"}>{t.payment_status}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{t.payment_method || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Link to={`${isCustomer ? "/sales" : "/purchases"}/${t.id}`}>
                          <Button variant="ghost" size="sm">View</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>{isCustomer ? "Invoice" : "Purchase"}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(paymentsQ.data ?? []).length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No payments</TableCell></TableRow>
                  ) : (paymentsQ.data ?? []).map((p: any) => {
                    const parentId = p[isCustomer ? "sale_id" : "purchase_id"];
                    const parent = (txQ.data ?? []).find((t: any) => t.id === parentId);
                    const ref = parent ? parent[txInvoiceCol] : "—";
                    const base = isCustomer ? "/sales" : "/purchases";
                    return (
                      <TableRow key={p.id}>
                        <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>{p.payment_method}</TableCell>
                        <TableCell className="text-right font-medium">{fmt(p.amount)}</TableCell>
                        <TableCell className="text-muted-foreground">{p.payment_note || "—"}</TableCell>
                        <TableCell>
                          {parentId ? (
                            <Link to={`${base}/${parentId}`} className="text-primary hover:underline">{ref}</Link>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {parentId && (
                            <Link to={`${base}/${parentId}`}>
                              <Button variant="ghost" size="sm">View</Button>
                            </Link>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <div className="text-sm font-medium mb-1">Internal Notes</div>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {c.notes || "No notes added."}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(activityQ.data ?? []).length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No activity recorded</TableCell></TableRow>
                  ) : (activityQ.data ?? []).map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell>{new Date(a.created_at).toLocaleString()}</TableCell>
                      <TableCell>{a.action}</TableCell>
                      <TableCell className="text-muted-foreground">{a.module || "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {a.details ? JSON.stringify(a.details) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LedgerTable({
  isCustomer, txs, payments, invoiceCol, dateCol, txBaseRoute,
}: {
  isCustomer: boolean;
  txs: any[];
  payments: any[];
  invoiceCol: string;
  dateCol: string;
  txBaseRoute: string;
}) {
  const rows = useMemo(() => {
    const txById = new Map(txs.map((t) => [t.id, t]));
    const a = txs.map((t) => ({
      kind: "invoice" as const,
      date: t[dateCol],
      ref: t[invoiceCol],
      parentRef: t[invoiceCol],
      debit: Number(t.total_amount || 0),
      credit: 0,
      id: t.id,
    }));
    const fkKey = isCustomer ? "sale_id" : "purchase_id";
    const b = payments.map((p) => ({
      kind: "payment" as const,
      date: (p.created_at || "").slice(0, 10),
      ref: `Payment (${p.payment_method})`,
      parentRef: txById.get(p[fkKey])?.[invoiceCol] ?? null,
      debit: 0,
      credit: Number(p.amount || 0),
      id: p[fkKey],
    }));
    return [...a, ...b].sort((x, y) => (x.date < y.date ? 1 : -1));
  }, [txs, payments, isCustomer, invoiceCol, dateCol]);

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead className="text-right">{isCustomer ? "Invoice" : "Purchase"} (Debit)</TableHead>
            <TableHead className="text-right">Payment (Credit)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No ledger entries</TableCell></TableRow>
          ) : rows.map((r, i) => (
            <TableRow key={i}>
              <TableCell>{r.date}</TableCell>
              <TableCell>
                {r.id ? (
                  <Link className="text-primary hover:underline" to={`${txBaseRoute}/${r.id}`}>
                    {r.kind === "payment" && r.parentRef ? `${r.ref} → ${r.parentRef}` : r.ref}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">{r.ref}</span>
                )}
              </TableCell>
              <TableCell className="text-right">{r.debit ? fmt(r.debit) : "—"}</TableCell>
              <TableCell className="text-right">{r.credit ? fmt(r.credit) : "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}