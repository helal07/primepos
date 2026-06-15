import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useCategoryMutations, useBrandMutations, useUnitMutations, useCategories, useBrands, useUnits } from "@/hooks/useInventory";
import { rest } from "@/lib/restResource";

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

  const lookupId = async (resource: "categories" | "brands" | "units", nm: string) => {
    const rows = await rest.all<{ id: string }>(resource, {
      filter: { name: nm }, sort: "-created_at", perPage: 1,
    });
    return rows[0]?.id || "";
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    if (kind === "category") {
      await catM.create.mutateAsync({ name: name.trim(), is_active: true } as any);
      onCreated?.(await lookupId("categories", name.trim()));
    } else if (kind === "brand") {
      await brandM.create.mutateAsync({ name: name.trim(), is_active: true } as any);
      onCreated?.(await lookupId("brands", name.trim()));
    } else {
      await unitM.create.mutateAsync({ name: name.trim(), short_name: shortName.trim() || name.trim().slice(0, 3), is_active: true } as any);
      onCreated?.(await lookupId("units", name.trim()));
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