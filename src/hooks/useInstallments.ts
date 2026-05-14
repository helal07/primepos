import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toFriendlyError } from "@/lib/friendlyError";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

// ── Installment Customers ──
export function useInstallmentCustomers() {
  return useQuery({
    queryKey: ["installment_customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("installment_customers")
        .select("*, customers(name, phone, email, address)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useInstallmentCustomerMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const inv = () => qc.invalidateQueries({ queryKey: ["installment_customers"] });

  const create = useMutation({
    mutationFn: async (row: any) => {
      const { error } = await supabase.from("installment_customers").insert(row);
      if (error) throw error;
    },
    onSuccess: () => { inv(); toast({ title: "Installment customer created" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...rest }: any) => {
      const { error } = await supabase.from("installment_customers").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { inv(); toast({ title: "Customer updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("installment_customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { inv(); toast({ title: "Customer deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  return { create, update, remove };
}

// ── Installment Sales ──
export function useInstallmentSales() {
  return useQuery({
    queryKey: ["installment_sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("installment_sales")
        .select("*, customers(name, phone), products(name, image_url), installment_customers(guarantor_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useInstallmentSaleMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const inv = () => {
    qc.invalidateQueries({ queryKey: ["installment_sales"] });
    qc.invalidateQueries({ queryKey: ["installment_schedules"] });
  };

  const create = useMutation({
    mutationFn: async ({ schedules, ...sale }: any) => {
      const { data, error } = await supabase
        .from("installment_sales")
        .insert({ ...sale, created_by: user?.id })
        .select("id")
        .single();
      if (error) throw error;
      if (schedules?.length) {
        const rows = schedules.map((s: any) => ({ ...s, installment_sale_id: data.id }));
        const { error: se } = await supabase.from("installment_schedules").insert(rows);
        if (se) throw se;
      }
      return data;
    },
    onSuccess: () => { inv(); toast({ title: "Installment sale created" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("installment_sales").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { inv(); toast({ title: "Status updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  return { create, updateStatus };
}

// ── Installment Schedules ──
export function useInstallmentSchedules(saleId: string | null) {
  return useQuery({
    queryKey: ["installment_schedules", saleId],
    enabled: !!saleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("installment_schedules")
        .select("*")
        .eq("installment_sale_id", saleId!)
        .order("serial_no");
      if (error) throw error;
      return data;
    },
  });
}

export function useAllSchedules() {
  return useQuery({
    queryKey: ["installment_schedules_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("installment_schedules")
        .select("*, installment_sales(invoice_no, customers(name, phone), products(name))")
        .order("due_date");
      if (error) throw error;
      return data;
    },
  });
}

// ── Installment Collections ──
export function useInstallmentCollections(saleId?: string | null) {
  return useQuery({
    queryKey: ["installment_collections", saleId],
    enabled: saleId !== undefined,
    queryFn: async () => {
      let q = supabase.from("installment_collections").select("*, installment_schedules(serial_no, due_date)");
      if (saleId) q = q.eq("installment_sale_id", saleId);
      const { data, error } = await q.order("collected_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCollectionMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const collect = useMutation({
    mutationFn: async (row: any) => {
      // Insert collection
      const { error } = await supabase.from("installment_collections").insert({ ...row, collected_by: user?.id });
      if (error) throw error;
      // Update schedule paid_amount
      const { data: schedule } = await supabase
        .from("installment_schedules")
        .select("paid_amount, amount")
        .eq("id", row.schedule_id)
        .single();
      if (schedule) {
        const newPaid = (schedule.paid_amount || 0) + row.amount;
        const newStatus = newPaid >= schedule.amount ? "paid" : "partial";
        await supabase.from("installment_schedules").update({
          paid_amount: newPaid,
          paid_date: newPaid >= schedule.amount ? new Date().toISOString().split("T")[0] : null,
          status: newStatus,
        }).eq("id", row.schedule_id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["installment_collections"] });
      qc.invalidateQueries({ queryKey: ["installment_schedules"] });
      toast({ title: "Payment collected" });
    },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  return { collect };
}
