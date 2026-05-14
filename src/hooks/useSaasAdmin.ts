import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toFriendlyError } from "@/lib/friendlyError";
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
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
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
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
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
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
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
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
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
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("superadmin_delete_tenant", { _tenant_id: id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenants"] });
      toast({ title: "Tenant deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
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
      const { data: tenant, error: tenantError } = await supabase
        .from("tenants")
        .select("subscription_end, saas_packages(duration_days)")
        .eq("id", id)
        .single();
      if (tenantError) throw tenantError;

      const currentEnd = tenant?.subscription_end ? new Date(`${tenant.subscription_end}T23:59:59`) : null;
      const tenantPackage = tenant?.saas_packages as { duration_days?: number | null } | null;
      const patch: { status: string; subscription_start?: string; subscription_end?: string } = { status: "active" };

      if (!currentEnd || currentEnd < new Date()) {
        const durationDays = Number(tenantPackage?.duration_days ?? 30);
        const newEnd = new Date();
        newEnd.setDate(newEnd.getDate() + durationDays);
        patch.subscription_start = new Date().toISOString().split("T")[0];
        patch.subscription_end = newEnd.toISOString().split("T")[0];
      }

      const { error } = await supabase.from("tenants").update(patch).eq("id", id);
      if (error) throw error;
      await supabase.from("tenant_actions_log").insert({
        tenant_id: id,
        action: "activated",
        details: patch,
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
      const now = new Date();
      const currentEnd = tenant?.subscription_end ? new Date(`${tenant.subscription_end}T23:59:59`) : now;
      if (currentEnd < now) currentEnd.setTime(now.getTime());
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
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });
}

// ---------- Landing Features ----------
export function useLandingFeatures(adminMode = false) {
  return useQuery({
    queryKey: ["landing_features", adminMode],
    queryFn: async () => {
      const q = supabase.from("landing_features").select("*").order("sort_order");
      const { data, error } = adminMode ? await q : await q.eq("is_active", true);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useLandingFeatureMutations() {
  const qc = useQueryClient();
  const upsert = useMutation({
    mutationFn: async (row: any) => {
      if (row.id) {
        const { id, created_at, updated_at, ...rest } = row;
        const { error } = await supabase.from("landing_features").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("landing_features").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["landing_features"] }); toast.success("Feature saved"); },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("landing_features").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["landing_features"] }); toast.success("Deleted"); },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });
  return { upsert, remove };
}

// ---------- Landing Reviews ----------
export function useLandingReviews(adminMode = false) {
  return useQuery({
    queryKey: ["landing_reviews", adminMode],
    queryFn: async () => {
      const q = supabase.from("landing_reviews").select("*").order("sort_order");
      const { data, error } = adminMode ? await q : await q.eq("is_active", true);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useLandingReviewMutations() {
  const qc = useQueryClient();
  const upsert = useMutation({
    mutationFn: async (row: any) => {
      if (row.id) {
        const { id, created_at, updated_at, ...rest } = row;
        const { error } = await supabase.from("landing_reviews").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("landing_reviews").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["landing_reviews"] }); toast.success("Review saved"); },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("landing_reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["landing_reviews"] }); toast.success("Deleted"); },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });
  return { upsert, remove };
}

// ---------- Public landing pricing (uses saas_packages) ----------
export function useLandingPricing() {
  return useQuery({
    queryKey: ["landing_pricing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saas_packages")
        .select("*")
        .eq("is_active", true)
        .eq("show_on_landing", true)
        .order("price");
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ---------- Published CMS pages (footer auto-list / public route) ----------
export function usePublishedCmsPages() {
  return useQuery({
    queryKey: ["cms_pages_published"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cms_pages")
        .select("id,title,slug,content,meta_title,meta_description,featured_image,updated_at")
        .eq("status", "published")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePublishedCmsPage(slug: string | undefined) {
  return useQuery({
    enabled: !!slug,
    queryKey: ["cms_page_public", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cms_pages")
        .select("*")
        .eq("slug", slug!)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
