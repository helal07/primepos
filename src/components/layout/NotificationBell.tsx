import { useEffect, useRef, useState } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { rest } from "@/lib/restResource";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface NotifRow {
  id: string;
  subject: string | null;
  message: string;
  created_at: string;
  read_at: string | null;
}

export function NotificationBell() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const seenIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playChime = () => {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const now = ctx.currentTime;
      const notes = [880, 1320]; // A5, E6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        const start = now + i * 0.14;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
        osc.connect(gain).connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.4);
      });
    } catch {
      // ignore
    }
  };

  const { data: items = [] } = useQuery({
    queryKey: ["my-notifications"],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async () => {
      return await rest.all<NotifRow>("tenant_notifications", {
        filter: { channel: "push" },
        sort: "-created_at",
        perPage: 30,
      });
    },
  });

  const unread = items.filter((i) => !i.read_at).length;

  // Toast newly-arrived push notifications when polling picks them up.
  // Seed `seenIds` on the first fetch so we don't toast the initial backlog.
  useEffect(() => {
    if (!initialized.current) {
      items.forEach((i) => seenIds.current.add(i.id));
      initialized.current = true;
      return;
    }
    const fresh = items.filter((i) => !seenIds.current.has(i.id));
    if (fresh.length === 0) return;
    fresh.forEach((row) => {
      seenIds.current.add(row.id);
      playChime();
      toast(row.subject || "New notification", {
        description: row.message,
        duration: 8000,
      });
    });
  }, [items]);

  const markRead = useMutation({
    mutationFn: async (id?: string) => {
      const now = new Date().toISOString();
      if (id) {
        await rest.update("tenant_notifications", id, { read_at: now });
        return;
      }
      // Bulk mark-all-read: list unread push rows, patch each (REST has no bulk update).
      const unreadRows = await rest.all<{ id: string }>("tenant_notifications", {
        filter: { channel: "push", read_at: { null: true } },
        perPage: 200,
      });
      await Promise.all(unreadRows.map((r) => rest.update("tenant_notifications", r.id, { read_at: now })));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-notifications"] }),
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 md:h-9 md:w-9 rounded-full">
          <Bell className={cn("h-4 w-4", unread > 0 && "text-destructive")} />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="text-sm font-semibold">Notifications</div>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => markRead.mutate(undefined)}>
              <CheckCheck className="h-3.5 w-3.5 mr-1" /> Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No notifications yet</div>
          ) : (
            <ul className="divide-y">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "p-3 text-sm flex gap-2 items-start hover:bg-muted/50",
                    !n.read_at && "bg-primary/5",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    {n.subject && <div className="font-medium truncate">{n.subject}</div>}
                    <div className="text-muted-foreground whitespace-pre-wrap break-words">{n.message}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                  </div>
                  {!n.read_at && (
                    <button
                      title="Mark as read"
                      onClick={() => markRead.mutate(n.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
