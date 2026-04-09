import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import ReportToolbar from "@/components/reports/ReportToolbar";

export default function ContactsReport() {
  const { data, isLoading } = useQuery({
    queryKey: ["report_contacts"],
    queryFn: async () => {
      const [custRes, supRes] = await Promise.all([
        supabase.from("customers").select("id, name, phone, email, balance, total_purchases, is_active").order("total_purchases", { ascending: false }),
        supabase.from("suppliers").select("id, name, phone, email, balance, is_active").order("balance", { ascending: false }),
      ]);
      return { customers: custRes.data ?? [], suppliers: supRes.data ?? [] };
    },
  });

  const fmt = (n: number) => n.toLocaleString("en", { minimumFractionDigits: 2 });
  const totalCustBalance = (data?.customers ?? []).reduce((s, c: any) => s + Number(c.balance), 0);
  const totalSupBalance = (data?.suppliers ?? []).reduce((s, c: any) => s + Number(c.balance), 0);

  const exportData = useMemo(() => ({
    columns: ["Type", "Name", "Phone", "Email", "Balance", "Status"],
    rows: [
      ...(data?.customers ?? []).map((c: any) => ["Customer", c.name, c.phone || "-", c.email || "-", fmt(Number(c.balance)), c.is_active ? "Active" : "Inactive"]),
      ...(data?.suppliers ?? []).map((s: any) => ["Supplier", s.name, s.phone || "-", s.email || "-", fmt(Number(s.balance)), s.is_active ? "Active" : "Inactive"]),
    ] as (string | number)[][],
    filename: "contacts-report",
    title: "Supplier & Customer Report",
  }), [data]);

  return (
    <div className="space-y-6">
      <PageHeader title="Supplier & Customer Report" subtitle="Ledger and payment overview" />
      <ReportToolbar exportData={exportData} />
      <div className="print-area space-y-6">
        {isLoading ? <Skeleton className="h-60 w-full" /> : data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Customers</p><p className="text-xl font-bold">{data.customers.length}</p></CardContent></Card>
              <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Customer Balance</p><p className="text-xl font-bold">৳ {fmt(totalCustBalance)}</p></CardContent></Card>
              <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Suppliers</p><p className="text-xl font-bold">{data.suppliers.length}</p></CardContent></Card>
              <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Supplier Balance</p><p className="text-xl font-bold">৳ {fmt(totalSupBalance)}</p></CardContent></Card>
            </div>
            <Tabs defaultValue="customers">
              <TabsList><TabsTrigger value="customers">Customers</TabsTrigger><TabsTrigger value="suppliers">Suppliers</TabsTrigger></TabsList>
              <TabsContent value="customers"><Card><CardContent className="pt-4">
                <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Purchases</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
                <TableBody>{data.customers.map((c: any) => (
                  <TableRow key={c.id}><TableCell className="font-medium">{c.name}</TableCell><TableCell>{c.phone || "-"}</TableCell><TableCell>{c.email || "-"}</TableCell><TableCell><Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "Active" : "Inactive"}</Badge></TableCell><TableCell className="text-right">৳ {fmt(Number(c.total_purchases))}</TableCell><TableCell className="text-right">৳ {fmt(Number(c.balance))}</TableCell></TableRow>
                ))}</TableBody></Table>
              </CardContent></Card></TabsContent>
              <TabsContent value="suppliers"><Card><CardContent className="pt-4">
                <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
                <TableBody>{data.suppliers.map((s: any) => (
                  <TableRow key={s.id}><TableCell className="font-medium">{s.name}</TableCell><TableCell>{s.phone || "-"}</TableCell><TableCell>{s.email || "-"}</TableCell><TableCell><Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? "Active" : "Inactive"}</Badge></TableCell><TableCell className="text-right">৳ {fmt(Number(s.balance))}</TableCell></TableRow>
                ))}</TableBody></Table>
              </CardContent></Card></TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}
