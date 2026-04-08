import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  "accounting", "hrm", "warranty", "cms", "settings", "users", "roles",
] as const;

export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("roles").select("*").order("is_system", { ascending: false }).order("name");
      if (error) throw error;
      return data as Role[];
    },
  });
}

export function useRolePermissions(roleId: string | null) {
  return useQuery({
    queryKey: ["role_permissions", roleId],
    enabled: !!roleId,
    queryFn: async () => {
      const { data, error } = await supabase.from("role_permissions").select("*").eq("role_id", roleId!);
      if (error) throw error;
      return data as RolePermission[];
    },
  });
}

export function useUsersWithRoles() {
  return useQuery({
    queryKey: ["users_with_roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role_id, roles(name), profiles(display_name, avatar_url)")
        ;
      if (error) throw error;
      // Flatten joined data
      return (data as any[]).map((d) => ({
        user_id: d.user_id,
        role_id: d.role_id,
        role_name: d.roles?.name ?? "Unknown",
        display_name: d.profiles?.display_name ?? null,
        avatar_url: d.profiles?.avatar_url ?? null,
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
        const { error } = await supabase.from("roles").update({ name, description }).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("roles").insert({ name, description });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["roles"] }); toast({ title: "Role saved" }); },
    onError: (e: any) => { toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["roles"] }); toast({ title: "Role deleted" }); },
    onError: (e: any) => { toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });
}

export function useSavePermissions() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ roleId, permissions }: { roleId: string; permissions: Omit<RolePermission, "id">[] }) => {
      // Delete existing then insert new
      const { error: delErr } = await supabase.from("role_permissions").delete().eq("role_id", roleId);
      if (delErr) throw delErr;
      if (permissions.length > 0) {
        const { error: insErr } = await supabase.from("role_permissions").insert(permissions);
        if (insErr) throw insErr;
      }
    },
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ["role_permissions", vars.roleId] }); toast({ title: "Permissions saved" }); },
    onError: (e: any) => { toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      // Upsert: delete existing then insert
      const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (delErr) throw delErr;
      const { error: insErr } = await supabase.from("user_roles").insert({ user_id: userId, role_id: roleId });
      if (insErr) throw insErr;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users_with_roles"] }); toast({ title: "Role updated" }); },
    onError: (e: any) => { toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });
}
