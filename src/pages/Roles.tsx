import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useRoles, useSaveRole, useDeleteRole,
  usePermissionCatalog, useRoleGrants, useSaveRoleGrants, MODULE_LABELS,
} from "@/hooks/useRoles";
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
  const { data: catalog, isLoading: catLoading } = usePermissionCatalog();
  const { data: grants, isLoading: grantsLoading } = useRoleGrants(roleId);
  const saveGrants = useSaveRoleGrants();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("sell");

  useEffect(() => {
    if (grants && initialized !== roleId) {
      setSelected(new Set(grants));
      setInitialized(roleId);
    }
  }, [grants, roleId, initialized]);

  const byModule = useMemo(() => {
    const m = new Map<string, Array<{ group: string; items: typeof catalog }>>();
    if (!catalog) return m;
    for (const entry of catalog) {
      if (!m.has(entry.module)) m.set(entry.module, []);
    }
    // group by module -> group_label
    for (const [mod] of m) {
      const items = catalog.filter((c) => c.module === mod);
      const groups = new Map<string, typeof catalog>();
      for (const it of items) {
        if (!groups.has(it.group_label)) groups.set(it.group_label, [] as any);
        (groups.get(it.group_label) as any).push(it);
      }
      m.set(
        mod,
        Array.from(groups.entries()).map(([group, items]) => ({ group, items }))
      );
    }
    return m;
  }, [catalog]);

  const modules = useMemo(() => Array.from(byModule.keys()), [byModule]);

  useEffect(() => {
    if (modules.length && !modules.includes(activeTab)) setActiveTab(modules[0]);
  }, [modules, activeTab]);

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAllInModule = (mod: string, on: boolean) => {
    const keys = (catalog ?? []).filter((c) => c.module === mod).map((c) => c.key);
    setSelected((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => (on ? next.add(k) : next.delete(k)));
      return next;
    });
  };

  const toggleAllInGroup = (mod: string, group: string, on: boolean) => {
    const keys = (catalog ?? [])
      .filter((c) => c.module === mod && c.group_label === group)
      .map((c) => c.key);
    setSelected((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => (on ? next.add(k) : next.delete(k)));
      return next;
    });
  };

  const handleSave = () => {
    saveGrants.mutate({ roleId, keys: Array.from(selected) });
  };

  if (catLoading || grantsLoading) return <Skeleton className="h-60 w-full" />;
  if (!modules.length) return <p className="text-sm text-muted-foreground">No permission catalog found.</p>;

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap h-auto justify-start gap-1 bg-muted/50 p-1">
          {modules.map((mod) => (
            <TabsTrigger key={mod} value={mod} className="text-xs">
              {MODULE_LABELS[mod] ?? mod}
            </TabsTrigger>
          ))}
        </TabsList>

        {modules.map((mod) => {
          const modKeys = (catalog ?? []).filter((c) => c.module === mod).map((c) => c.key);
          const allOn = modKeys.length > 0 && modKeys.every((k) => selected.has(k));
          return (
            <TabsContent key={mod} value={mod} className="mt-4 space-y-5">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-sm font-semibold">{MODULE_LABELS[mod] ?? mod}</h3>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox
                    checked={allOn}
                    onCheckedChange={(v) => toggleAllInModule(mod, !!v)}
                  />
                  Select all in {MODULE_LABELS[mod] ?? mod}
                </label>
              </div>

              {(byModule.get(mod) ?? []).map(({ group, items }) => {
                const groupKeys = (items ?? []).map((i) => i.key);
                const groupAllOn = groupKeys.length > 0 && groupKeys.every((k) => selected.has(k));
                return (
                  <div key={group} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-[11px]">{group}</Badge>
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox
                          checked={groupAllOn}
                          onCheckedChange={(v) => toggleAllInGroup(mod, group, !!v)}
                        />
                        Select all
                      </label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 pl-1">
                      {(items ?? []).map((it) => (
                        <label
                          key={it.key}
                          className="flex items-start gap-2 text-sm cursor-pointer py-1"
                          title={it.description ?? undefined}
                        >
                          <Checkbox
                            checked={selected.has(it.key)}
                            onCheckedChange={() => toggle(it.key)}
                            className="mt-0.5"
                          />
                          <span>
                            <span className="text-foreground">{it.label}</span>
                            {it.description && (
                              <span className="block text-xs text-muted-foreground">{it.description}</span>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </TabsContent>
          );
        })}
      </Tabs>

      <div className="flex items-center justify-between pt-4 border-t">
        <span className="text-xs text-muted-foreground">
          {selected.size} permission{selected.size === 1 ? "" : "s"} selected
        </span>
        <Button onClick={handleSave} disabled={saveGrants.isPending}>
          {saveGrants.isPending ? "Saving..." : "Save Permissions"}
        </Button>
      </div>
    </div>
  );
}
