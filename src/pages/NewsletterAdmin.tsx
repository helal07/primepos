import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Download } from "lucide-react";
import { toast } from "sonner";

export default function NewsletterAdmin() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: tenantId } = useQuery({
    queryKey: ["my_tenant", user?.id], enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("tenant_id").eq("user_id", user!.id).maybeSingle();
      return data?.tenant_id ?? null;
    },
  });

  const { data: subs = [] } = useQuery({
    queryKey: ["newsletter_subs", tenantId], enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await (supabase as any).from("newsletter_subscribers").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("newsletter_subscribers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["newsletter_subs"] }); toast.success("Removed"); },
  });

  const exportCsv = () => {
    const csv = ["email,source,date", ...subs.map((s: any) => `${s.email},${s.source || ""},${new Date(s.created_at).toISOString()}`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "newsletter.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Newsletter" description={`${subs.length} subscriber${subs.length === 1 ? "" : "s"}`} />
      <div className="flex justify-end">
        <Button variant="outline" onClick={exportCsv} disabled={subs.length === 0}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Source</TableHead><TableHead>Date</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {subs.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No subscribers yet</TableCell></TableRow>}
            {subs.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell>{s.email}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{s.source || "-"}</TableCell>
                <TableCell className="text-sm">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm("Remove?")) remove.mutate(s.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}