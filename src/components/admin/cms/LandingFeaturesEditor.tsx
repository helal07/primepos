import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import { useLandingFeatures, useLandingFeatureMutations } from "@/hooks/useSaasAdmin";

const ICON_OPTIONS = [
  "ShoppingCart", "Package", "BarChart3", "Calculator", "Users", "Globe",
  "ShieldCheck", "Smartphone", "Zap", "Lock", "HeadphonesIcon", "Sparkles",
  "Wallet", "CreditCard", "Receipt", "Truck", "Building2", "Settings",
];

export function LandingFeaturesEditor() {
  const { data = [] } = useLandingFeatures(true);
  const { upsert, remove } = useLandingFeatureMutations();
  const [draft, setDraft] = useState({ icon: "Sparkles", title: "", description: "" });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <h4 className="text-sm font-semibold">Add Feature</h4>
          <div className="grid grid-cols-3 gap-2">
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={draft.icon}
              onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
            >
              {ICON_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
            <Input
              className="col-span-2"
              placeholder="Title (e.g. Point of Sale)"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </div>
          <Textarea
            placeholder="Description"
            rows={2}
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
          <Button
            size="sm"
            disabled={!draft.title.trim() || upsert.isPending}
            onClick={() => {
              upsert.mutate({
                ...draft,
                title: draft.title.trim(),
                description: draft.description.trim(),
                sort_order: data.length,
                is_active: true,
              });
              setDraft({ icon: "Sparkles", title: "", description: "" });
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Feature
          </Button>
        </CardContent>
      </Card>

      {data.map((row: any) => (
        <Card key={row.id}>
          <CardContent className="p-4 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={row.icon}
                onChange={(e) => upsert.mutate({ ...row, icon: e.target.value })}
              >
                {ICON_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
              <Input
                className="col-span-2"
                value={row.title}
                onChange={(e) => upsert.mutate({ ...row, title: e.target.value })}
              />
            </div>
            <Textarea
              rows={2}
              value={row.description ?? ""}
              onChange={(e) => upsert.mutate({ ...row, description: e.target.value })}
            />
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
      {!data.length && <p className="text-sm text-muted-foreground">No features yet.</p>}
    </div>
  );
}