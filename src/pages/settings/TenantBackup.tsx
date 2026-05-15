import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { AlertTriangle, Download, RotateCcw, Upload, Database } from "lucide-react";

type Backup = {
  id: string;
  tenant_id: string;
  kind: string;
  storage_path: string | null;
  size_bytes: number | null;
  row_counts: Record<string, number> | null;
  created_at: string;
  notes: string | null;
};

function formatBytes(b?: number | null) {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

export default function TenantBackup() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tenant, setTenant] = useState<any>(null);
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [pendingRestore, setPendingRestore] = useState<
    | { kind: "file"; payload: any; label: string }
    | { kind: "snapshot"; path: string; label: string }
    | null
  >(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profile } = await supabase
        .from("profiles").select("tenant_id").eq("user_id", user.id).maybeSingle();
      if (!profile?.tenant_id) { setIsOwner(false); return; }
      const { data: t } = await supabase
        .from("tenants").select("id,name,slug,owner_user_id").eq("id", profile.tenant_id).maybeSingle();
      setTenant(t);
      setIsOwner(!!t && t.owner_user_id === user.id);
    })();
  }, [user]);

  const { data: backups = [], isLoading } = useQuery({
    queryKey: ["tenant_backups"],
    enabled: !!isOwner,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_backups").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Backup[];
    },
  });

  const snapshots = useMemo(() => backups.filter(b => b.kind === "snapshot"), [backups]);
  const recent = useMemo(() => backups.slice(0, 10), [backups]);

  if (isOwner === null) {
    return <p className="text-sm text-muted-foreground p-4">Loading…</p>;
  }
  if (!isOwner) {
    return (
      <div className="space-y-4">
        <PageHeader title="Backup & Restore" description="Tenant data backup" />
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Owner only</AlertTitle>
          <AlertDescription>
            Only the account owner can download or restore tenant backups.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  async function downloadBackup() {
    setBusy("download");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tenant-backup-export`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token ?? ""}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        },
      );
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tenant-backup-${tenant?.slug ?? "data"}-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Backup downloaded");
      qc.invalidateQueries({ queryKey: ["tenant_backups"] });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to download backup");
    } finally {
      setBusy(null);
    }
  }

  async function downloadSnapshot(b: Backup) {
    if (!b.storage_path) return;
    setBusy(b.id);
    try {
      const { data, error } = await supabase.storage
        .from("tenant-backups")
        .createSignedUrl(b.storage_path, 60);
      if (error || !data) throw error ?? new Error("Failed");
      window.open(data.signedUrl, "_blank");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to fetch snapshot");
    } finally {
      setBusy(null);
    }
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const text = await f.text();
      const parsed = JSON.parse(text);
      if (!parsed?.tables || parsed?.schema_version !== 1) {
        throw new Error("Not a valid tenant backup file");
      }
      setPendingRestore({ kind: "file", payload: parsed, label: f.name });
      setConfirmText("");
    } catch (e: any) {
      toast.error(e.message ?? "Could not read file");
    }
  }

  function askRestoreSnapshot(b: Backup) {
    if (!b.storage_path) return;
    setPendingRestore({
      kind: "snapshot",
      path: b.storage_path,
      label: `Snapshot from ${new Date(b.created_at).toLocaleString()}`,
    });
    setConfirmText("");
  }

  async function performRestore() {
    if (!pendingRestore) return;
    setBusy("restore");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const body = pendingRestore.kind === "file"
        ? { payload: pendingRestore.payload }
        : { snapshot_path: pendingRestore.path };
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tenant-backup-restore`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token ?? ""}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify(body),
        },
      );
      const out = await res.json().catch(() => ({}));
      if (!res.ok || out.error) throw new Error(out.error ?? "Restore failed");
      toast.success(`Restore complete — ${out.result?.inserted_rows ?? 0} rows`);
      setPendingRestore(null);
      qc.invalidateQueries();
    } catch (e: any) {
      toast.error(e.message ?? "Restore failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6 p-2 md:p-0">
      <PageHeader
        title="Backup & Restore"
        description={`Download or restore data for "${tenant?.name ?? ""}". Only your tenant is affected.`}
      />

      <Alert>
        <Database className="h-4 w-4" />
        <AlertTitle>What's included</AlertTitle>
        <AlertDescription>
          All your business data — products, sales, purchases, customers, accounting, stock,
          warranties, HR, etc. Uploaded files (product images, invoice PDFs) and login passwords
          are <strong>not</strong> included in this version.
        </AlertDescription>
      </Alert>

      {/* Manual download */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-4 w-4" /> Download a backup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Get a single JSON file containing every row of your tenant's data.
          </p>
          <Button onClick={downloadBackup} disabled={busy === "download"}>
            {busy === "download" ? "Preparing…" : "Download backup now"}
          </Button>
        </CardContent>
      </Card>

      {/* Snapshots */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Automatic snapshots</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Up to 2 most recent nightly snapshots are kept automatically.
          </p>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : snapshots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No snapshots yet — first one runs tonight.</p>
          ) : (
            <div className="space-y-2">
              {snapshots.map(s => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 border rounded-md p-3">
                  <div className="text-sm">
                    <p className="font-medium">{new Date(s.created_at).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(s.size_bytes)} · {Object.values(s.row_counts ?? {}).reduce((a, b) => a + Number(b), 0)} rows
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => downloadSnapshot(s)} disabled={busy === s.id}>
                      <Download className="h-3.5 w-3.5 mr-1" /> Download
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => askRestoreSnapshot(s)}>
                      <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restore
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Restore from file */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" /> Restore from a backup file
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>This replaces all your current data</AlertTitle>
            <AlertDescription>
              We will save a safety snapshot first, but after restore your current data will be gone.
            </AlertDescription>
          </Alert>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={onPickFile} />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            Choose backup file…
          </Button>
        </CardContent>
      </Card>

      {/* Activity */}
      <Card>
        <CardHeader><CardTitle className="text-base">Recent activity</CardTitle></CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <div className="space-y-2 text-sm">
              {recent.map(b => (
                <div key={b.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <Badge variant="secondary" className="mr-2 capitalize">{b.kind.replace(/_/g, " ")}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleString()}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatBytes(b.size_bytes)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm restore */}
      <AlertDialog open={!!pendingRestore} onOpenChange={(o) => !o && setPendingRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore tenant data?</AlertDialogTitle>
            <AlertDialogDescription>
              You're about to replace all data for <strong>{tenant?.name}</strong> with{" "}
              <em>{pendingRestore?.label}</em>. Other tenants are not affected. A safety snapshot of
              your current state will be saved automatically before the restore runs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label>Type your tenant name to confirm</Label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={tenant?.name}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmText !== (tenant?.name ?? "") || busy === "restore"}
              onClick={performRestore}
            >
              {busy === "restore" ? "Restoring…" : "Replace all data"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}