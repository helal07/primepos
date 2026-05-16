import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUsersWithRoles, useRoles, useUpdateUserRole, useDeleteUser } from "@/hooks/useRoles";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, Users as UsersIcon, Trash2, Plus } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { toFriendlyError } from "@/lib/friendlyError";

export default function UsersPage() {
  const { data: users, isLoading } = useUsersWithRoles();
  const { data: roles } = useRoles();
  const updateRole = useUpdateUserRole();
  const deleteUser = useDeleteUser();
  const { user: currentUser } = useAuth();
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ display_name: "", email: "", password: "", role_name: "" });

  const resetForm = () => setForm({ display_name: "", email: "", password: "", role_name: "" });

  const handleAdd = async () => {
    if (!form.email || !form.password) {
      toast({ title: "Email and password are required", variant: "destructive" });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-tenant-user", {
        body: {
          email: form.email,
          password: form.password,
          display_name: form.display_name || form.email,
          role_name: form.role_name || null,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "User created" });
      qc.invalidateQueries({ queryKey: ["users_with_roles"] });
      setAddOpen(false);
      resetForm();
    } catch (e: any) {
      toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string | null) =>
    name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "??";

  const getRoleBadgeVariant = (roleName: string) => {
    if (roleName === "Superadmin") return "destructive" as const;
    if (roleName === "Tenant Manager") return "default" as const;
    return "secondary" as const;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="Manage user accounts and their roles" actions={
        <>
          <Badge variant="outline" className="gap-1">
            <UsersIcon className="h-3 w-3" />
            {users?.length ?? 0} users
          </Badge>
          <Button onClick={() => { resetForm(); setAddOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Add User
          </Button>
        </>
      } />

      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add User</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} placeholder="Full name" />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="user@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Password *</Label>
              <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role_name || "__none"} onValueChange={(v) => setForm({ ...form, role_name: v === "__none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="No role (assign later)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No role (assign later)</SelectItem>
                  {roles?.filter(r => r.name !== "Superadmin").map((r) => (
                    <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(!roles || roles.filter(r => !r.is_system).length === 0) && (
                <p className="text-xs text-muted-foreground">
                  Tip: Create custom roles under Roles & Permissions before assigning them.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving}>{saving ? "Creating..." : "Create User"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {getInitials(user.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.display_name || "Unnamed"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {editingUser === user.user_id ? (
                        <Select
                          defaultValue={user.role_id}
                          onValueChange={(roleId) => {
                            updateRole.mutate({ userId: user.user_id, roleId });
                            setEditingUser(null);
                          }}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {roles?.map((r) => (
                              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={getRoleBadgeVariant(user.role_name)}>
                          <Shield className="h-3 w-3 mr-1" />
                          {user.role_name}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingUser(editingUser === user.user_id ? null : user.user_id)}
                        >
                          {editingUser === user.user_id ? "Cancel" : "Change Role"}
                        </Button>
                        {currentUser?.id !== user.user_id && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" title="Delete user">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete user?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This permanently removes <strong>{user.display_name || "this user"}</strong>, their profile and role assignment. This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteUser.mutate(user.user_id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {users?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
