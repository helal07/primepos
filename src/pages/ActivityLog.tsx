import { useQuery } from "@tanstack/react-query";
import { rest } from "@/lib/restResource";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity } from "lucide-react";

export default function ActivityLogPage() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["activity_log"],
    queryFn: async () => {
      return await rest.all<any>("activity_log", { sort: "-created_at", perPage: 100 });
    },
  });

  const formatDate = (d: string) => new Date(d).toLocaleString();

  return (
    <div className="space-y-6">
      <PageHeader title="Activity Log" description="Track user actions across the system" actions={
        <Badge variant="outline" className="gap-1">
          <Activity className="h-3 w-3" />
          {logs?.length ?? 0} entries
        </Badge>
      } />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : logs?.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Activity className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No activity yet</p>
              <p className="text-sm">Actions across the system will appear here.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(log.created_at)}</TableCell>
                    <TableCell className="font-medium">{log.user_id.slice(0, 8)}</TableCell>
                    <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                    <TableCell>{log.module ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {log.details ? JSON.stringify(log.details) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
