import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const salesData = [
  { id: "INV-0042", date: "2026-04-08", customer: "Ahmed Khan", items: 3, total: 3450, status: "completed", payment: "Cash" },
  { id: "INV-0041", date: "2026-04-08", customer: "Sara Ali", items: 1, total: 890, status: "completed", payment: "Card" },
  { id: "INV-0040", date: "2026-04-07", customer: "Walk-in", items: 5, total: 1240, status: "completed", payment: "Cash" },
  { id: "INV-0039", date: "2026-04-07", customer: "Omar Sheikh", items: 2, total: 2680, status: "pending", payment: "Split" },
];

export default function Sales() {
  return (
    <div className="space-y-6">
      <PageHeader title="Sales" description="View and manage all sales transactions"
        actions={<Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Sale</Button>} />
      <Card><CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search sales..." className="pl-9 h-9" /></div>
        </div>
        <div className="rounded-md border"><Table><TableHeader><TableRow>
          <TableHead>Invoice</TableHead><TableHead>Date</TableHead><TableHead className="hidden md:table-cell">Customer</TableHead><TableHead className="text-right">Items</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Status</TableHead>
        </TableRow></TableHeader><TableBody>
          {salesData.map((s) => (<TableRow key={s.id} className="cursor-pointer">
            <TableCell className="font-medium">{s.id}</TableCell>
            <TableCell className="text-muted-foreground">{s.date}</TableCell>
            <TableCell className="hidden md:table-cell">{s.customer}</TableCell>
            <TableCell className="text-right">{s.items}</TableCell>
            <TableCell className="text-right font-medium">${s.total}</TableCell>
            <TableCell><Badge variant={s.status === "completed" ? "default" : "secondary"}>{s.status}</Badge></TableCell>
          </TableRow>))}
        </TableBody></Table></div>
      </CardContent></Card>
    </div>
  );
}
