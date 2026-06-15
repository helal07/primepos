import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rest } from "@/lib/restResource";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Mail, MessageSquare, Bell, Send } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

type Channel = "email" | "sms" | "push";

export default function Notifications() {
  const qc = useQueryClient();
  const [channel, setChannel] = useState<Channel>("email");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [allTenants, setAllTenants] = useState(false);
  const [search, setSearch] = useState("");

  const { data: tenants = [] } = useQuery({
    queryKey: ["notif-tenants"],
    queryFn: async () => {
      return await rest.all<any>("tenants", { sort: "name", perPage: 1000 });
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["notif-history"],
    queryFn: async () => {
      const rows = await rest.all<any>("tenant_notifications", {
        sort: "-created_at", perPage: 50, with: ["tenant"],
      });
      // Alias `tenant` -> `tenants` to match existing UI shape
      return rows.map((r: any) => ({ ...r, tenants: r.tenant }));
    },
  });

  const filtered = tenants.filter((t: any) =>
    !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.email?.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const send = useMutation({
    mutationFn: async () => {
      const ids = allTenants ? tenants.map((t: any) => t.id) : selected;
      if (ids.length === 0) throw new Error("Select at least one tenant");
      if (!message.trim()) throw new Error("Message is required");
      if (channel === "email" && !subject.trim()) throw new Error("Subject is required for email");
      const { sendTenantNotification } = await import("@/lib/functions");
      return await sendTenantNotification({ tenant_ids: ids, channel, subject, message });
    },
    onSuccess: (data: any) => {
      toast({ title: "Sent", description: `Delivered to ${data?.sent ?? 0} tenant(s)${data?.failed ? `, ${data.failed} failed` : ""}` });
      setSubject("");
      setMessage("");
      setSelected([]);
      setAllTenants(false);
      qc.invalidateQueries({ queryKey: ["notif-history"] });
    },
    onError: (e: any) => toast({ title: "Send failed", description: e.message, variant: "destructive" }),
  });

  const channelMeta = {
    email: { icon: Mail, label: "Email", hint: "Sent to tenant's registered email." },
    sms: { icon: MessageSquare, label: "SMS", hint: "Sent to tenant's registered phone." },
    push: { icon: Bell, label: "Push", hint: "In-app notification visible to tenant users." },
  } as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-sm text-muted-foreground">Send announcements and alerts to your tenants.</p>
      </div>

      <Tabs value={channel} onValueChange={(v) => setChannel(v as Channel)}>
        <TabsList>
          <TabsTrigger value="email"><Mail className="h-4 w-4 mr-2" />Email</TabsTrigger>
          <TabsTrigger value="sms"><MessageSquare className="h-4 w-4 mr-2" />SMS</TabsTrigger>
          <TabsTrigger value="push"><Bell className="h-4 w-4 mr-2" />Push</TabsTrigger>
        </TabsList>

        {(["email", "sms", "push"] as Channel[]).map((c) => (
          <TabsContent key={c} value={c} className="mt-4">
            <div className="grid gap-4 lg:grid-cols-[1fr,360px]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    {(() => { const Icon = channelMeta[c].icon; return <Icon className="h-4 w-4" />; })()}
                    Compose {channelMeta[c].label}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{channelMeta[c].hint}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {c === "email" && (
                    <div>
                      <Label>Subject</Label>
                      <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
                    </div>
                  )}
                  <div>
                    <Label>Message</Label>
                    <Textarea rows={c === "sms" ? 4 : 8} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Your message..." />
                    {c === "sms" && <p className="text-[11px] text-muted-foreground mt-1">{message.length} chars</p>}
                  </div>
                  <Button onClick={() => send.mutate()} disabled={send.isPending}>
                    <Send className="h-4 w-4 mr-2" />
                    {send.isPending ? "Sending..." : `Send ${channelMeta[c].label}`}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recipients</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={allTenants} onCheckedChange={(v) => setAllTenants(!!v)} />
                    All tenants ({tenants.length})
                  </label>
                  <Input placeholder="Search tenant..." value={search} onChange={(e) => setSearch(e.target.value)} disabled={allTenants} />
                  <ScrollArea className="h-64 border rounded-md p-2">
                    <div className="space-y-1">
                      {filtered.map((t: any) => (
                        <label key={t.id} className={`flex items-center gap-2 text-sm p-1.5 rounded hover:bg-muted ${allTenants ? "opacity-50" : ""}`}>
                          <Checkbox
                            checked={allTenants || selected.includes(t.id)}
                            onCheckedChange={() => toggle(t.id)}
                            disabled={allTenants}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">{t.name}</div>
                            <div className="truncate text-[11px] text-muted-foreground">{t.email}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </ScrollArea>
                  <p className="text-xs text-muted-foreground">
                    {allTenants ? `All ${tenants.length} tenants` : `${selected.length} selected`}
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {history.length === 0 && <p className="text-sm text-muted-foreground">No notifications sent yet.</p>}
            {history.map((h: any) => (
              <div key={h.id} className="flex items-start gap-3 border-b last:border-0 py-2">
                <Badge variant="outline" className="uppercase text-[10px]">{h.channel}</Badge>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{h.subject || h.message?.slice(0, 60)}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {h.tenants?.name || "—"} · {new Date(h.created_at).toLocaleString()}
                  </div>
                  {h.error && <div className="text-[11px] text-destructive">{h.error}</div>}
                </div>
                <Badge variant={h.status === "sent" ? "default" : h.status === "failed" ? "destructive" : "secondary"}>{h.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}