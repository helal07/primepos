import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toFriendlyError } from "@/lib/friendlyError";
import { rest } from "@/lib/restResource";
import { api } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSuperadminRealtime } from "@/hooks/useSuperadminRealtime";
import { toast } from "sonner";

// ─── Packages ────────────────────────────────────────────
export function usePackages() {
  return useQuery({
    queryKey: ["saas_packages"],
    queryFn: async () => rest.all<any>("saas_packages", { sort: "sort_order", perPage: 200 }),
  });
}

export function usePackageMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const create = useMutation({
    mutationFn: async (pkg: any) => { await rest.create("saas_packages", pkg); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["saas_packages"] }); toast({ title: "Package created" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...rest_ }: { id: string } & Record<string, any>) => {
      await rest.update("saas_packages", id, rest_);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["saas_packages"] }); toast({ title: "Package updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { await rest.remove("saas_packages", id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["saas_packages"] }); toast({ title: "Package deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  return { create, update, remove };
}

// ─── Tenants ─────────────────────────────────────────────
export function useTenants() {
  useSuperadminRealtime(["tenants"], [["tenants"], ["admin_sms_revenue"]]);
  return useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const rows = await rest.all<any>("tenants", { with: ["package"], sort: "-created_at", perPage: 500 });
      // Alias singular Eloquent relation to legacy plural key the UI expects.
      return rows.map((t) => ({ ...t, saas_packages: t.package ?? null }));
    },
  });
}

export function useTenantMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const create = useMutation({
    mutationFn: async (t: {
      name: string; phone?: string; email?: string; address?: string;
      owner_user_id: string; package_id?: string;
      subscription_start?: string; subscription_end?: string;
      status?: string; notes?: string;
    }) => {
      const data = await rest.create<any>("tenants", t as any);
      // Set tenant_id on the owner's profile (lookup by user_id → patch by id).
      const profiles = await rest.all<{ id: string }>("profiles", {
        filter: { user_id: t.owner_user_id }, perPage: 1,
      });
      if (profiles[0]) {
        await rest.update("profiles", profiles[0].id, { tenant_id: data.id });
      }
      await rest.create("tenant_actions_log", {
        tenant_id: data.id, action: "created", performed_by: user!.id,
      });
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tenants"] }); toast({ title: "Tenant created" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Record<string, any>) => {
      await rest.update("tenants", id, patch);
      await rest.create("tenant_actions_log", {
        tenant_id: id, action: "updated", details: patch, performed_by: user!.id,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tenants"] }); toast({ title: "Tenant updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/admin/tenants/${id}`);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tenants"] }); toast({ title: "Tenant deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  const suspend = useMutation({
    mutationFn: async (id: string) => {
      await rest.update("tenants", id, { status: "suspended" });
      await rest.create("tenant_actions_log", {
        tenant_id: id, action: "suspended", performed_by: user!.id,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tenants"] }); toast({ title: "Tenant suspended" }); },
  });

  const activate = useMutation({
    mutationFn: async (id: string) => {
      const tenant = await rest.get<any>("tenants", id, { with: ["package"] });
      const currentEnd = tenant?.subscription_end ? new Date(`${tenant.subscription_end}T23:59:59`) : null;
      const tenantPackage = (tenant?.package ?? tenant?.saas_packages) as { duration_days?: number | null } | null;
      const patch: { status: string; subscription_start?: string; subscription_end?: string } = { status: "active" };

      if (!currentEnd || currentEnd < new Date()) {
        const durationDays = Number(tenantPackage?.duration_days ?? 30);
        const newEnd = new Date();
        newEnd.setDate(newEnd.getDate() + durationDays);
        patch.subscription_start = new Date().toISOString().split("T")[0];
        patch.subscription_end = newEnd.toISOString().split("T")[0];
      }

      await rest.update("tenants", id, patch);
      await rest.create("tenant_actions_log", {
        tenant_id: id, action: "activated", details: patch, performed_by: user!.id,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tenants"] }); toast({ title: "Tenant activated" }); },
  });

  const extend = useMutation({
    mutationFn: async ({ id, days }: { id: string; days: number }) => {
      const tenant = await rest.get<any>("tenants", id);
      const now = new Date();
      const currentEnd = tenant?.subscription_end ? new Date(`${tenant.subscription_end}T23:59:59`) : now;
      if (currentEnd < now) currentEnd.setTime(now.getTime());
      currentEnd.setDate(currentEnd.getDate() + days);
      await rest.update("tenants", id, {
        subscription_end: currentEnd.toISOString().split("T")[0],
        status: "active",
      });
      await rest.create("tenant_actions_log", {
        tenant_id: id, action: "extended", details: { days }, performed_by: user!.id,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tenants"] }); toast({ title: "Subscription extended" }); },
  });

  return { create, update, remove, suspend, activate, extend };
}

// ─── Tenant Action Logs ──────────────────────────────────
export function useTenantActionLogs(tenantId?: string) {
  return useQuery({
    queryKey: ["tenant_actions_log", tenantId],
    enabled: !!tenantId,
    queryFn: async () => rest.all<any>("tenant_actions_log", {
      filter: { tenant_id: tenantId! }, sort: "-created_at", perPage: 500,
    }),
  });
}

// ─── Landing CMS (business_settings key/value, global tenant_id IS NULL) ───
export function useLandingCms(key: string) {
  return useQuery({
    queryKey: ["business_settings", key],
    queryFn: async () => {
      const res = await api.get<{ value: any }>(`/api/public/landing/cms/${encodeURIComponent(key)}`);
      return res.value ?? null;
    },
  });
}

export function useLandingCmsMutation() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      // Admin-only write — global rows have tenant_id IS NULL.
      const existing = await rest.all<{ id: string }>("business_settings", {
        filter: { key, tenant_id: { null: true } },
        perPage: 1,
      });
      if (existing[0]) {
        await rest.update("business_settings", existing[0].id, { value });
      } else {
        await rest.create("business_settings", { key, value, tenant_id: null });
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
      if (adminMode) {
        return await rest.all<any>("landing_features", { sort: "sort_order", perPage: 200 });
      }
      return await api.get<any[]>("/api/public/landing/features");
    },
  });
}

export function useLandingFeatureMutations() {
  const qc = useQueryClient();
  const upsert = useMutation({
    mutationFn: async (row: any) => {
      if (row.id) {
        const { id, created_at, updated_at, ...rest_ } = row;
        await rest.update("landing_features", id, rest_);
      } else {
        await rest.create("landing_features", row);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["landing_features"] }); toast.success("Feature saved"); },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { await rest.remove("landing_features", id); },
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
      if (adminMode) {
        return await rest.all<any>("landing_reviews", { sort: "sort_order", perPage: 200 });
      }
      return await api.get<any[]>("/api/public/landing/reviews");
    },
  });
}

export function useLandingReviewMutations() {
  const qc = useQueryClient();
  const upsert = useMutation({
    mutationFn: async (row: any) => {
      if (row.id) {
        const { id, created_at, updated_at, ...rest_ } = row;
        await rest.update("landing_reviews", id, rest_);
      } else {
        await rest.create("landing_reviews", row);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["landing_reviews"] }); toast.success("Review saved"); },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { await rest.remove("landing_reviews", id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["landing_reviews"] }); toast.success("Deleted"); },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });
  return { upsert, remove };
}

// ---------- Public landing pricing (uses saas_packages) ----------
export function useLandingPricing() {
  return useQuery({
    queryKey: ["landing_pricing"],
    queryFn: async () => await api.get<any[]>("/api/public/landing/pricing"),
  });
}
