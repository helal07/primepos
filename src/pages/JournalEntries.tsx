import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { useJournalEntries, useJournalMutations, useAccounts } from "@/hooks/useAccounting";

interface JournalLine {
  account_id: string;
  debit: number;
  credit: number;
  description: string;
}

export default function JournalEntries() {
  const { data: entries, isLoading } = useJournalEntries();
  const { data: accounts } = useAccounts();
  const { createEntry, deleteEntry } = useJournalMutations();

  const [open, setOpen] = useState(false);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<JournalLine[]>([
    { account_id: "", debit: 0, credit: 0, description: "" },
    { account_id: "", debit: 0, credit: 0, description: "" },
  ]);

  const addLine = () => setLines([...lines, { account_id: "", debit: 0, credit: 0, description: "" }]);
  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx));
  const updateLine = (idx: number, field: string, value: any) =>
    setLines(lines.map((l, i) => i === idx ? { ...l, [field]: value } : l));

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const handleSubmit = () => {
    const validLines = lines.filter((l) => l.account_id && (l.debit > 0 || l.credit > 0));
    createEntry.mutate(
      { entry_date: entryDate, reference, description, status: "posted", lines: validLines },
      { onSuccess: () => { setOpen(false); setLines([{ account_id: "", debit: 0, credit: 0, description: "" }, { account_id: "", debit: 0, credit: 0, description: "" }]); setReference(""); setDescription(""); } }
    );
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Journal Entries" description="Record double-entry journal entries" actions={
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> New Entry</Button>
      } />
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                ))
              ) : (entries ?? []).length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No journal entries</TableCell></TableRow>
              ) : (
                (entries ?? []).map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell>{new Date(e.entry_date).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{e.reference || "—"}</TableCell>
                    <TableCell>{e.description || "—"}</TableCell>
                    <TableCell><Badge variant={e.status === "posted" ? "default" : "outline"}>{e.status}</Badge></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteEntry.mutate(e.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>New Journal Entry</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Date</Label><Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} /></div>
              <div><Label>Reference</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="JE-001" /></div>
              <div><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead className="w-32">Debit</TableHead>
                  <TableHead className="w-32">Credit</TableHead>
                  <TableHead>Memo</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Select value={line.account_id} onValueChange={(v) => updateLine(idx, "account_id", v)}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Select account" /></SelectTrigger>
                        <SelectContent>
                          {(accounts ?? []).map((a: any) => (
                            <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Input type="number" min={0} value={line.debit} onChange={(e) => updateLine(idx, "debit", parseFloat(e.target.value) || 0)} className="h-8" /></TableCell>
                    <TableCell><Input type="number" min={0} value={line.credit} onChange={(e) => updateLine(idx, "credit", parseFloat(e.target.value) || 0)} className="h-8" /></TableCell>
                    <TableCell><Input value={line.description} onChange={(e) => updateLine(idx, "description", e.target.value)} className="h-8" /></TableCell>
                    <TableCell>
                      {lines.length > 2 && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeLine(idx)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell><Button variant="ghost" size="sm" onClick={addLine}><Plus className="h-3 w-3 mr-1" /> Add Line</Button></TableCell>
                  <TableCell className="font-bold">৳{totalDebit.toFixed(2)}</TableCell>
                  <TableCell className="font-bold">৳{totalCredit.toFixed(2)}</TableCell>
                  <TableCell colSpan={2}>
                    {!isBalanced && totalDebit + totalCredit > 0 && (
                      <span className="text-destructive text-xs">Debits ≠ Credits</span>
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!isBalanced || createEntry.isPending}>
              {createEntry.isPending ? "Saving..." : "Post Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
