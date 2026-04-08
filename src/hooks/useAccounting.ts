import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .order("code", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useAccountMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const create = useMutation({
    mutationFn: async (account: { code: string; name: string; type: string; parent_id?: string | null; description?: string }) => {
      const { error } = await supabase.from("accounts").insert({ ...account, created_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["accounts"] }); toast.success("Account created"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; code?: string; name?: string; type?: string; parent_id?: string | null; description?: string; is_active?: boolean }) => {
      const { error } = await supabase.from("accounts").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["accounts"] }); toast.success("Account updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["accounts"] }); toast.success("Account deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return { create, update, remove };
}

export function useJournalEntries() {
  return useQuery({
    queryKey: ["journal_entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useJournalEntryLines(entryId: string | null) {
  return useQuery({
    queryKey: ["journal_entry_lines", entryId],
    enabled: !!entryId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entry_lines")
        .select("*, accounts(name, code)")
        .eq("journal_entry_id", entryId!);
      if (error) throw error;
      return data;
    },
  });
}

export function useJournalMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const createEntry = useMutation({
    mutationFn: async (data: {
      entry_date: string; reference: string; description: string; status: string;
      lines: { account_id: string; debit: number; credit: number; description?: string }[];
    }) => {
      const { lines, ...entryData } = data;
      const { data: entry, error } = await supabase
        .from("journal_entries")
        .insert({ ...entryData, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;

      if (lines.length > 0) {
        const entryLines = lines.map((l) => ({ ...l, journal_entry_id: entry.id }));
        const { error: lErr } = await supabase.from("journal_entry_lines").insert(entryLines);
        if (lErr) throw lErr;

        // Also create transaction records
        const txns = lines.map((l) => ({
          transaction_date: data.entry_date,
          description: l.description || data.description,
          reference: data.reference,
          type: "journal",
          account_id: l.account_id,
          debit: l.debit,
          credit: l.credit,
          journal_entry_id: entry.id,
          created_by: user?.id,
        }));
        await supabase.from("transactions").insert(txns);
      }
      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal_entries"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Journal entry created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("transactions").delete().eq("journal_entry_id", id);
      const { error } = await supabase.from("journal_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal_entries"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Journal entry deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { createEntry, deleteEntry };
}

export function useTransactions() {
  return useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*, accounts(name, code)")
        .order("transaction_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
