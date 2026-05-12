import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useCategoryMutations, useBrandMutations, useUnitMutations, useCategories, useBrands, useUnits } from "@/hooks/useInventory";

type Kind = "category" | "brand" | "unit";

interface Props {
  kind: Kind;
  onCreated?: (id: string) => void;
}

export function QuickAddDialog({ kind, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const catM = useCategoryMutations();
  const brandM = useBrandMutations();
  const unitM = useUnitMutations();
  const { data: categories } = useCategories();
  const { data: brands } = useBrands();
  const { data: units } = useUnits();

  const label = kind === "category" ? "Category" : kind === "brand" ? "Brand" : "Unit";

  const handleSave = async () => {
    if (!name.trim()) return;
    if (kind === "category") {
      await catM.create.mutateAsync({ name: name.trim(), is_active: true } as any);
      const fresh = (await (await import("@/integrations/supabase/client")).supabase.from("categories").select("id").eq("name", name.trim()).order("created_at", { ascending: false }).limit(1).single()).data;
      onCreated?.(fresh?.id || "");
    } else if (kind === "brand") {
      await brandM.create.mutateAsync({ name: name.trim(), is_active: true } as any);
      const fresh = (await (await import("@/integrations/supabase/client")).supabase.from("brands").select("id").eq("name", name.trim()).order("created_at", { ascending: false }).limit(1).single()).data;
      onCreated?.(fresh?.id || "");
    } else {
      await unitM.create.mutateAsync({ name: name.trim(), short_name: shortName.trim() || name.trim().slice(0, 3), is_active: true } as any);
      const fresh = (await (await import("@/integrations/supabase/client")).supabase.from("units").select("id").eq("name", name.trim()).order("created_at", { ascending: false }).limit(1).single()).data;
      onCreated?.(fresh?.id || "");
    }
    setName("");
    setShortName("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" title={`Add new ${label}`}>
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New {label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>{label} Name *</Label>
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={`Enter ${label.toLowerCase()} name`} onKeyDown={(e) => e.key === "Enter" && handleSave()} />
          </div>
          {kind === "unit" && (
            <div className="space-y-2">
              <Label>Short Name</Label>
              <Input value={shortName} onChange={(e) => setShortName(e.target.value)} placeholder="e.g. pcs, kg, m" />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}