import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import { useLandingReviews, useLandingReviewMutations } from "@/hooks/useSaasAdmin";

export function LandingReviewsEditor() {
  const { data = [] } = useLandingReviews(true);
  const { upsert, remove } = useLandingReviewMutations();
  const [draft, setDraft] = useState({ name: "", role: "", rating: 5, text: "", avatar_url: "" });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <h4 className="text-sm font-semibold">Add Testimonial</h4>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <Input placeholder="Role / Business" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number" min={1} max={5}
              placeholder="Rating (1-5)"
              value={draft.rating}
              onChange={(e) => setDraft({ ...draft, rating: Number(e.target.value) || 5 })}
            />
            <Input placeholder="Avatar URL (optional)" value={draft.avatar_url} onChange={(e) => setDraft({ ...draft, avatar_url: e.target.value })} />
          </div>
          <Textarea placeholder="Review text" rows={3} value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
          <Button
            size="sm"
            disabled={!draft.name.trim() || !draft.text.trim() || upsert.isPending}
            onClick={() => {
              upsert.mutate({ ...draft, sort_order: data.length, is_active: true });
              setDraft({ name: "", role: "", rating: 5, text: "", avatar_url: "" });
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Testimonial
          </Button>
        </CardContent>
      </Card>

      {data.map((row: any) => (
        <Card key={row.id}>
          <CardContent className="p-4 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Input value={row.name} onChange={(e) => upsert.mutate({ ...row, name: e.target.value })} />
              <Input value={row.role ?? ""} onChange={(e) => upsert.mutate({ ...row, role: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" min={1} max={5} value={row.rating} onChange={(e) => upsert.mutate({ ...row, rating: Number(e.target.value) || 5 })} />
              <Input value={row.avatar_url ?? ""} onChange={(e) => upsert.mutate({ ...row, avatar_url: e.target.value })} />
            </div>
            <Textarea rows={3} value={row.text} onChange={(e) => upsert.mutate({ ...row, text: e.target.value })} />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={row.is_active} onCheckedChange={(v) => upsert.mutate({ ...row, is_active: v })} />
                <span className="text-xs text-muted-foreground">{row.is_active ? "Visible" : "Hidden"}</span>
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove.mutate(row.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      {!data.length && <p className="text-sm text-muted-foreground">No testimonials yet.</p>}
    </div>
  );
}