import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

// ─── Packages ────────────────────────────────────────────
export function usePackages() {
  return useQuery({
    queryKey: ["saas_packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saas_packages")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });
}

export function usePackageMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const create = useMutation({
    mutationFn: async (pkg: {
      name: string;
      price: number;
      duration_days: number;
      max_users: number;
      max_business_location: number;
      max_invoice: number;
      features: string[];
      is_popular: boolean;
      is_active: boolean;
      sort_order: number;
      enabled_modules?: string[];
    }) => {
      const { error } = await supabase.from("saas_packages").insert(pkg);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saas_packages"] });
      toast({ title: "Package created" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...rest }: { id: string } & Partial<{
      name: string; price: number; duration_days: number; max_users: number;
      max_business_location: number; max_invoice: number; features: string[];
      is_popular: boolean; is_active: boolean; sort_order: number;
      enabled_modules: string[];
    }>) => {
      const { error } = await supabase.from("saas_packages").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saas_packages"] });
      toast({ title: "Package updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saas_packages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saas_packages"] });
      toast({ title: "Package deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return { create, update, remove };
}

// ─── Tenants ─────────────────────────────────────────────
export function useTenants() {
  return useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*, saas_packages(name, price, duration_days)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useTenantMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const create = useMutation({
    mutationFn: async (t: {
      name: string;
      phone?: string;
      email?: string;
      address?: string;
      owner_user_id: string;
      package_id?: string;
      subscription_start?: string;
      subscription_end?: string;
      status?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase.from("tenants").insert(t).select().single();
      if (error) throw error;
      // Set tenant_id on the owner's profile for data isolation
      await supabase
        .from("profiles")
        .update({ tenant_id: data.id } as any)
        .eq("user_id", t.owner_user_id);
      // Log action
      await supabase.from("tenant_actions_log").insert({
        tenant_id: data.id,
        action: "created",
        performed_by: user!.id,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenants"] });
      toast({ title: "Tenant created" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...rest }: { id: string } & Partial<{
      name: string; phone: string; email: string; address: string;
      owner_user_id: string; package_id: string; subscription_start: string;
      subscription_end: string; status: string; notes: string;
    }>) => {
      const { error } = await supabase.from("tenants").update(rest).eq("id", id);
      if (error) throw error;
      await supabase.from("tenant_actions_log").insert({
        tenant_id: id,
        action: "updated",
        details: rest as any,
        performed_by: user!.id,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenants"] });
      toast({ title: "Tenant updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tenants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenants"] });
      toast({ title: "Tenant deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const suspend = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tenants").update({ status: "suspended" }).eq("id", id);
      if (error) throw error;
      await supabase.from("tenant_actions_log").insert({
        tenant_id: id,
        action: "suspended",
        performed_by: user!.id,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenants"] });
      toast({ title: "Tenant suspended" });
    },
  });

  const activate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tenants").update({ status: "active" }).eq("id", id);
      if (error) throw error;
      await supabase.from("tenant_actions_log").insert({
        tenant_id: id,
        action: "activated",
        performed_by: user!.id,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenants"] });
      toast({ title: "Tenant activated" });
    },
  });

  const extend = useMutation({
    mutationFn: async ({ id, days }: { id: string; days: number }) => {
      // Get current end date
      const { data: tenant } = await supabase.from("tenants").select("subscription_end").eq("id", id).single();
      const currentEnd = tenant?.subscription_end ? new Date(tenant.subscription_end) : new Date();
      currentEnd.setDate(currentEnd.getDate() + days);
      const { error } = await supabase.from("tenants").update({
        subscription_end: currentEnd.toISOString().split("T")[0],
        status: "active",
      }).eq("id", id);
      if (error) throw error;
      await supabase.from("tenant_actions_log").insert({
        tenant_id: id,
        action: "extended",
        details: { days },
        performed_by: user!.id,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenants"] });
      toast({ title: "Subscription extended" });
    },
  });

  return { create, update, remove, suspend, activate, extend };
}

// ─── Tenant Action Logs ──────────────────────────────────
export function useTenantActionLogs(tenantId?: string) {
  return useQuery({
    queryKey: ["tenant_actions_log", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_actions_log")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ─── Landing CMS ─────────────────────────────────────────
export function useLandingCms(key: string) {
  return useQuery({
    queryKey: ["business_settings", key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      if (error) throw error;
      return data?.value ?? null;
    },
  });
}

export function useLandingCmsMutation() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { data: existing } = await supabase
        .from("business_settings")
        .select("id")
        .eq("key", key)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("business_settings")
          .update({ value })
          .eq("key", key);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("business_settings")
          .insert({ key, value });
        if (error) throw error;
      }
    },
    onSuccess: (_, { key }) => {
      qc.invalidateQueries({ queryKey: ["business_settings", key] });
      toast({ title: "Saved" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}
