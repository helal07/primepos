import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUsersWithRoles, useRoles, useUpdateUserRole } from "@/hooks/useRoles";
import { Shield, Users as UsersIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function UsersPage() {
  const { data: users, isLoading } = useUsersWithRoles();
  const { data: roles } = useRoles();
  const updateRole = useUpdateUserRole();
  const [editingUser, setEditingUser] = useState<string | null>(null);

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
        <Badge variant="outline" className="gap-1">
          <UsersIcon className="h-3 w-3" />
          {users?.length ?? 0} users
        </Badge>
      } />

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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingUser(editingUser === user.user_id ? null : user.user_id)}
                      >
                        {editingUser === user.user_id ? "Cancel" : "Change Role"}
                      </Button>
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
