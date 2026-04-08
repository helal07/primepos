import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity } from "lucide-react";

interface LogEntry {
  id: string;
  user_id: string;
  action: string;
  module: string | null;
  entity_type: string | null;
  details: any;
  created_at: string;
  profiles: { display_name: string | null } | null;
}

export default function ActivityLogPage() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["activity_log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_log")
        .select("*, profiles!activity_log_user_id_fkey(display_name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) {
        // If join fails (no FK), try without join
        const { data: d2, error: e2 } = await supabase
          .from("activity_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);
        if (e2) throw e2;
        return d2 as LogEntry[];
      }
      return data as LogEntry[];
    },
  });

  const formatDate = (d: string) => new Date(d).toLocaleString();

  return (
    <div className="space-y-6">
      <PageHeader title="Activity Log" description="Track user actions across the system">
        <Badge variant="outline" className="gap-1">
          <Activity className="h-3 w-3" />
          {logs?.length ?? 0} entries
        </Badge>
      </PageHeader>

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
                    <TableCell className="font-medium">{(log as any).profiles?.display_name || "System"}</TableCell>
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
