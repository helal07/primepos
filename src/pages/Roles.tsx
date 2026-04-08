import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useRoles, useRolePermissions, useSaveRole, useDeleteRole, useSavePermissions, MODULE_LIST, type RolePermission } from "@/hooks/useRoles";
import { Plus, Pencil, Trash2, Shield, Lock } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function RolesPage() {
  const { data: roles, isLoading } = useRoles();
  const saveRole = useSaveRole();
  const deleteRole = useDeleteRole();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRole, setEditRole] = useState<{ id?: string; name: string; description: string } | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  const openCreate = () => { setEditRole({ name: "", description: "" }); setDialogOpen(true); };
  const openEdit = (role: any) => { setEditRole({ id: role.id, name: role.name, description: role.description ?? "" }); setDialogOpen(true); };

  const handleSave = () => {
    if (!editRole?.name.trim()) return;
    saveRole.mutate({ id: editRole.id, name: editRole.name.trim(), description: editRole.description.trim() }, {
      onSuccess: () => { setDialogOpen(false); setEditRole(null); },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Roles & Permissions" description="Create custom roles and configure module access" actions={
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />New Role</Button>
      } />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roles List */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Roles</CardTitle></CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : (
              <div className="divide-y">
                {roles?.map((role) => (
                  <div
                    key={role.id}
                    className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors ${selectedRoleId === role.id ? "bg-muted" : ""}`}
                    onClick={() => setSelectedRoleId(role.id)}
                  >
                    <div className="flex items-center gap-2">
                      {role.is_system ? <Lock className="h-3.5 w-3.5 text-muted-foreground" /> : <Shield className="h-3.5 w-3.5 text-primary" />}
                      <span className="font-medium text-sm">{role.name}</span>
                      {role.is_system && <Badge variant="outline" className="text-[10px] px-1.5 py-0">System</Badge>}
                    </div>
                    {!role.is_system && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(role); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => e.stopPropagation()}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete "{role.name}"?</AlertDialogTitle>
                              <AlertDialogDescription>This will remove the role and all its permissions. Users with this role will lose access.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => { deleteRole.mutate(role.id); if (selectedRoleId === role.id) setSelectedRoleId(null); }}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Permissions Panel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              {selectedRoleId ? `Permissions — ${roles?.find(r => r.id === selectedRoleId)?.name}` : "Select a role"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedRoleId && roles?.find(r => r.id === selectedRoleId)?.name === "Superadmin" ? (
              <p className="text-muted-foreground text-sm">Superadmin has unrestricted access to all modules. No permissions configuration needed.</p>
            ) : selectedRoleId ? (
              <PermissionsEditor roleId={selectedRoleId} />
            ) : (
              <p className="text-muted-foreground text-sm">Click a role on the left to configure its module permissions.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editRole?.id ? "Edit Role" : "Create Role"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Role Name</Label>
              <Input value={editRole?.name ?? ""} onChange={(e) => setEditRole(prev => prev ? { ...prev, name: e.target.value } : null)} placeholder="e.g. Sales Manager" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={editRole?.description ?? ""} onChange={(e) => setEditRole(prev => prev ? { ...prev, description: e.target.value } : null)} placeholder="What can this role do?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveRole.isPending}>{saveRole.isPending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PermissionsEditor({ roleId }: { roleId: string }) {
  const { data: permissions, isLoading } = useRolePermissions(roleId);
  const savePerms = useSavePermissions();
  const [local, setLocal] = useState<Record<string, { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }>>({});
  const [initialized, setInitialized] = useState<string | null>(null);

  // Sync from server when permissions load or roleId changes
  if (permissions && initialized !== roleId) {
    const map: typeof local = {};
    for (const m of MODULE_LIST) {
      const p = permissions.find(pp => pp.module === m);
      map[m] = { can_view: p?.can_view ?? false, can_create: p?.can_create ?? false, can_edit: p?.can_edit ?? false, can_delete: p?.can_delete ?? false };
    }
    setLocal(map);
    setInitialized(roleId);
  }

  const toggle = (mod: string, perm: "can_view" | "can_create" | "can_edit" | "can_delete") => {
    setLocal(prev => ({ ...prev, [mod]: { ...prev[mod], [perm]: !prev[mod]?.[perm] } }));
  };

  const handleSave = () => {
    const perms = MODULE_LIST.filter(m => local[m] && (local[m].can_view || local[m].can_create || local[m].can_edit || local[m].can_delete))
      .map(m => ({ role_id: roleId, module: m, ...local[m] }));
    savePerms.mutate({ roleId, permissions: perms });
  };

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Module</TableHead>
            <TableHead className="text-center w-20">View</TableHead>
            <TableHead className="text-center w-20">Create</TableHead>
            <TableHead className="text-center w-20">Edit</TableHead>
            <TableHead className="text-center w-20">Delete</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {MODULE_LIST.map((mod) => (
            <TableRow key={mod}>
              <TableCell className="font-medium">{capitalize(mod)}</TableCell>
              {(["can_view", "can_create", "can_edit", "can_delete"] as const).map((perm) => (
                <TableCell key={perm} className="text-center">
                  <Checkbox checked={local[mod]?.[perm] ?? false} onCheckedChange={() => toggle(mod, perm)} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button onClick={handleSave} disabled={savePerms.isPending}>{savePerms.isPending ? "Saving..." : "Save Permissions"}</Button>
    </div>
  );
}
