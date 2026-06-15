import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toFriendlyError } from "@/lib/friendlyError";
import { rest } from "@/lib/restResource";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/** Alias singular Laravel relation → plural Supabase shape so legacy UI keeps working. */
function aliasAccount<T extends Record<string, any>>(row: T): T {
  if (!row) return row;
  const out: any = { ...row };
  if (out.account && !out.accounts) out.accounts = out.account;
  return out;
}

export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      return await rest.all<any>("accounts", { sort: "code", perPage: 1000 });
    },
  });
}

export function useAccountMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const create = useMutation({
    mutationFn: async (account: { code: string; name: string; type: string; parent_id?: string | null; description?: string }) => {
      await rest.create("accounts", { ...account, created_by: user?.id });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["accounts"] }); toast.success("Account created"); },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; code?: string; name?: string; type?: string; parent_id?: string | null; description?: string; is_active?: boolean }) => {
      await rest.update("accounts", id, updates);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["accounts"] }); toast.success("Account updated"); },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await rest.remove("accounts", id);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["accounts"] }); toast.success("Account deleted"); },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });

  return { create, update, remove };
}

export function useJournalEntries() {
  return useQuery({
    queryKey: ["journal_entries"],
    queryFn: async () => {
      return await rest.all<any>("journal_entries", { sort: "-created_at", perPage: 500 });
    },
  });
}

export function useJournalEntryLines(entryId: string | null) {
  return useQuery({
    queryKey: ["journal_entry_lines", entryId],
    enabled: !!entryId,
    queryFn: async () => {
      const rows = await rest.all<any>("journal_entry_lines", {
        filter: { journal_entry_id: entryId! },
        with: ["account"],
        perPage: 2000,
      });
      return rows.map(aliasAccount);
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
      const entry = await rest.create<any>("journal_entries", { ...entryData, created_by: user?.id });
      if (lines.length > 0) {
        await Promise.all(lines.map((l) => rest.create("journal_entry_lines", { ...l, journal_entry_id: entry.id })));
        await Promise.all(lines.map((l) => rest.create("transactions", {
          transaction_date: data.entry_date,
          description: l.description || data.description,
          reference: data.reference,
          type: "journal",
          account_id: l.account_id,
          debit: l.debit,
          credit: l.credit,
          journal_entry_id: entry.id,
          created_by: user?.id,
        })));
      }
      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal_entries"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Journal entry created");
    },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const txns = await rest.all<any>("transactions", { filter: { journal_entry_id: id }, perPage: 1000 });
      await Promise.all(txns.map((t: any) => rest.remove("transactions", t.id)));
      await rest.remove("journal_entries", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal_entries"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Journal entry deleted");
    },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });

  return { createEntry, deleteEntry };
}

export function useTransactions() {
  return useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const rows = await rest.all<any>("transactions", {
        with: ["account"],
        sort: "-transaction_date",
        perPage: 1000,
      });
      return rows.map(aliasAccount);
    },
  });
}
