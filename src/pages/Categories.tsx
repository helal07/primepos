import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const data = [
  { id: 1, name: "Smartphones", sub: 4, products: 128 },
  { id: 2, name: "Laptops", sub: 3, products: 56 },
  { id: 3, name: "Accessories", sub: 8, products: 342 },
  { id: 4, name: "Audio", sub: 2, products: 89 },
];

export default function Categories() {
  return (
    <div className="space-y-6">
      <PageHeader title="Categories" description="Manage product categories and sub-categories"
        actions={<Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Category</Button>} />
      <Card><CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search categories..." className="pl-9 h-9" /></div>
        </div>
        <div className="rounded-md border"><Table><TableHeader><TableRow>
          <TableHead>Name</TableHead><TableHead className="text-right">Sub-Categories</TableHead><TableHead className="text-right">Products</TableHead>
        </TableRow></TableHeader><TableBody>
          {data.map((c) => (<TableRow key={c.id}><TableCell className="font-medium">{c.name}</TableCell><TableCell className="text-right">{c.sub}</TableCell><TableCell className="text-right">{c.products}</TableCell></TableRow>))}
        </TableBody></Table></div>
      </CardContent></Card>
    </div>
  );
}
