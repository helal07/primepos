import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toFriendlyError } from "@/lib/friendlyError";
import { rest } from "@/lib/restResource";
import { useToast } from "@/hooks/use-toast";

export interface Role {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface UserWithRole {
  user_id: string;
  role_id: string;
  role_name: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
}

export const MODULE_LIST = [
  "dashboard", "products", "categories", "brands", "units",
  "sales", "pos", "purchases", "customers", "suppliers",
  "accounting", "hrm", "warranty", "settings", "users", "roles",
] as const;

export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const data = await rest.all<Role>("roles", { sort: "-is_system,name", perPage: 500 });
      // Hide global system roles other than the locked "Tenant Manager" admin role.
      // Tenant Managers create their own roles per Ultimate POS flow.
      return data.filter(
        (r) => !r.is_system || r.name === "Tenant Manager"
      );
    },
  });
}

export function useRolePermissions(roleId: string | null) {
  return useQuery({
    queryKey: ["role_permissions", roleId],
    enabled: !!roleId,
    queryFn: async () => {
      return await rest.all<RolePermission>("role_permissions", {
        filter: { role_id: roleId! },
        perPage: 2000,
      });
    },
  });
}

export function useUsersWithRoles() {
  return useQuery({
    queryKey: ["users_with_roles"],
    queryFn: async () => {
      // Profiles are tenant-scoped via BelongsToTenant, so this returns only tenant users.
      const [profiles, userRoles] = await Promise.all([
        rest.all<any>("profiles", { perPage: 1000 }),
        rest.all<any>("user_roles", { with: ["role"], perPage: 1000 }),
      ]);

      const roleMap = new Map(
        userRoles.map((ur: any) => [ur.user_id, { role_id: ur.role_id, role_name: ur.role?.name }])
      );

      return (profiles ?? []).map((p) => ({
        user_id: p.user_id,
        role_id: roleMap.get(p.user_id)?.role_id ?? "",
        role_name: roleMap.get(p.user_id)?.role_name ?? "No role",
        display_name: p.display_name ?? null,
        avatar_url: p.avatar_url ?? null,
      }));
    },
  });
}

export function useSaveRole() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, name, description }: { id?: string; name: string; description: string }) => {
      if (id) {
        await rest.update("roles", id, { name, description });
      } else {
        await rest.create("roles", { name, description });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["roles"] }); toast({ title: "Role saved" }); },
    onError: (e: any) => { toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }); },
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      await rest.remove("roles", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["roles"] }); toast({ title: "Role deleted" }); },
    onError: (e: any) => { toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }); },
  });
}

export function useSavePermissions() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ roleId, permissions }: { roleId: string; permissions: Omit<RolePermission, "id">[] }) => {
      // REST has no bulk-delete: list existing rows for this role, delete each, then insert.
      const existing = await rest.all<{ id: string }>("role_permissions", {
        filter: { role_id: roleId },
        perPage: 2000,
      });
      await Promise.all(existing.map((r) => rest.remove("role_permissions", r.id)));
      await Promise.all(permissions.map((p) => rest.create("role_permissions", p as any)));
    },
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ["role_permissions", vars.roleId] }); toast({ title: "Permissions saved" }); },
    onError: (e: any) => { toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }); },
  });
}

// ============================================================
// Granular Ultimate POS-style permission catalog & grants
// ============================================================

export interface CatalogEntry {
  key: string;
  module: string;
  group_label: string;
  label: string;
  description: string | null;
  sort_order: number;
}

export const MODULE_LABELS: Record<string, string> = {
  sell: "Sell",
  purchase: "Purchase",
  product: "Product",
  stock: "Stock",
  customer: "Customer",
  supplier: "Supplier",
  expense: "Expense",
  account: "Accounting",
  hrm: "HRM",
  warranty: "Warranty",
  exchange: "Exchange",
  installment: "Installment",
  cms: "Website (CMS)",
  report: "Reports",
  settings: "Settings",
};

export function usePermissionCatalog() {
  return useQuery({
    queryKey: ["permission_catalog"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      return await rest.all<CatalogEntry>("permission_catalog", {
        sort: "module,sort_order",
        perPage: 1000,
      });
    },
  });
}

export function useRoleGrants(roleId: string | null) {
  return useQuery({
    queryKey: ["role_permission_grants", roleId],
    enabled: !!roleId,
    queryFn: async () => {
      const data = await rest.all<{ permission_key: string }>("role_permission_grants", {
        filter: { role_id: roleId! },
        perPage: 5000,
      });
      return new Set<string>(data.map((r) => r.permission_key));
    },
  });
}

export function useSaveRoleGrants() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ roleId, keys }: { roleId: string; keys: string[] }) => {
      const existing = await rest.all<{ id: string }>("role_permission_grants", {
        filter: { role_id: roleId },
        perPage: 5000,
      });
      await Promise.all(existing.map((r) => rest.remove("role_permission_grants", r.id)));
      await Promise.all(
        keys.map((k) => rest.create("role_permission_grants", { role_id: roleId, permission_key: k })),
      );
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["role_permission_grants", vars.roleId] });
      qc.invalidateQueries({ queryKey: ["my_permissions"] });
      toast({ title: "Permissions saved" });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" });
    },
  });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      // Insert the new role FIRST (so the caller never temporarily loses
      // their Tenant Manager role mid-operation, which would trip RLS),
      // then remove any other roles for this user. REST has no upsert.
      const existing = await rest.all<{ id: string; role_id: string }>("user_roles", {
        filter: { user_id: userId },
        perPage: 100,
      });
      const already = existing.find((r) => r.role_id === roleId);
      if (!already) {
        await rest.create("user_roles", { user_id: userId, role_id: roleId });
      }
      await Promise.all(
        existing.filter((r) => r.role_id !== roleId).map((r) => rest.remove("user_roles", r.id)),
      );
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users_with_roles"] }); toast({ title: "Role updated" }); },
    onError: (e: any) => { toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }); },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { deleteTenantUser } = await import("@/lib/functions");
      await deleteTenantUser(userId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users_with_roles"] });
      toast({ title: "User deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });
}
