import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const customers = [
  { id: 1, name: "Ahmed Khan", phone: "+92 300 1234567", email: "ahmed@mail.com", purchases: 24, balance: 0 },
  { id: 2, name: "Sara Ali", phone: "+92 321 9876543", email: "sara@mail.com", purchases: 12, balance: 450 },
  { id: 3, name: "Omar Sheikh", phone: "+92 333 4567890", email: "omar@mail.com", purchases: 8, balance: 1200 },
];

export default function Customers() {
  return (
    <div className="space-y-6">
      <PageHeader title="Customers" description="Manage your customers"
        actions={<Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Customer</Button>} />
      <Card><CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search customers..." className="pl-9 h-9" /></div>
        </div>
        <div className="rounded-md border"><Table><TableHeader><TableRow>
          <TableHead>Name</TableHead><TableHead className="hidden md:table-cell">Phone</TableHead><TableHead className="hidden md:table-cell">Email</TableHead><TableHead className="text-right">Purchases</TableHead><TableHead className="text-right">Balance</TableHead>
        </TableRow></TableHeader><TableBody>
          {customers.map((c) => (<TableRow key={c.id} className="cursor-pointer">
            <TableCell className="font-medium">{c.name}</TableCell>
            <TableCell className="hidden md:table-cell text-muted-foreground">{c.phone}</TableCell>
            <TableCell className="hidden md:table-cell text-muted-foreground">{c.email}</TableCell>
            <TableCell className="text-right">{c.purchases}</TableCell>
            <TableCell className="text-right">{c.balance > 0 ? <Badge variant="secondary">${c.balance}</Badge> : <span className="text-muted-foreground">$0</span>}</TableCell>
          </TableRow>))}
        </TableBody></Table></div>
      </CardContent></Card>
    </div>
  );
}
