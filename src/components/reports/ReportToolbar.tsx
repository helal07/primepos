import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ExportData {
  columns: string[];
  rows: (string | number)[][];
  filename: string;
  title?: string;
}

interface ReportToolbarProps {
  from?: string;
  to?: string;
  onFromChange?: (v: string) => void;
  onToChange?: (v: string) => void;
  singleDate?: string;
  onDateChange?: (v: string) => void;
  showPaymentFilter?: boolean;
  paymentMethod?: string;
  onPaymentMethodChange?: (v: string) => void;
  showStatusFilter?: boolean;
  paymentStatus?: string;
  onPaymentStatusChange?: (v: string) => void;
  exportData: ExportData;
}

function exportCSV({ columns, rows, filename }: ExportData) {
  const escape = (v: string | number) => {
    const s = String(v);
    return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [columns.map(escape).join(","), ...rows.map(r => r.map(escape).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportExcel({ columns, rows, filename }: ExportData) {
  const ws = XLSX.utils.aoa_to_sheet([columns, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

function exportPDF({ columns, rows, filename, title }: ExportData) {
  const doc = new jsPDF({ orientation: columns.length > 6 ? "landscape" : "portrait" });
  doc.setFontSize(14);
  doc.text(title || filename, 14, 15);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 22);
  autoTable(doc, {
    head: [columns],
    body: rows.map(r => r.map(String)),
    startY: 28,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [14, 95, 153] },
  });
  doc.save(`${filename}.pdf`);
}

export default function ReportToolbar({
  from, to, onFromChange, onToChange,
  singleDate, onDateChange,
  showPaymentFilter, paymentMethod, onPaymentMethodChange,
  showStatusFilter, paymentStatus, onPaymentStatusChange,
  exportData,
}: ReportToolbarProps) {
  return (
    <div className="no-print flex flex-wrap items-end gap-3">
      {/* Date filters */}
      {singleDate !== undefined && onDateChange && (
        <div className="space-y-1">
          <Label className="text-xs">Date</Label>
          <Input type="date" value={singleDate} onChange={e => onDateChange(e.target.value)} className="w-[150px] h-9" />
        </div>
      )}
      {from !== undefined && onFromChange && (
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input type="date" value={from} onChange={e => onFromChange(e.target.value)} className="w-[150px] h-9" />
        </div>
      )}
      {to !== undefined && onToChange && (
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input type="date" value={to} onChange={e => onToChange(e.target.value)} className="w-[150px] h-9" />
        </div>
      )}

      {/* Payment method */}
      {showPaymentFilter && onPaymentMethodChange && (
        <div className="space-y-1">
          <Label className="text-xs">Payment Method</Label>
          <Select value={paymentMethod || "all"} onValueChange={onPaymentMethodChange}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              <SelectItem value="mobile">Mobile</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Payment status */}
      {showStatusFilter && onPaymentStatusChange && (
        <div className="space-y-1">
          <Label className="text-xs">Payment Status</Label>
          <Select value={paymentStatus || "all"} onValueChange={onPaymentStatusChange}>
            <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="due">Due</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Export & Print */}
      <div className="flex gap-1.5">
        <Button variant="outline" size="sm" onClick={() => exportCSV(exportData)} title="Export CSV">
          <Download className="h-4 w-4 mr-1" /> CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => exportExcel(exportData)} title="Export Excel">
          <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
        </Button>
        <Button variant="outline" size="sm" onClick={() => exportPDF(exportData)} title="Export PDF">
          <FileText className="h-4 w-4 mr-1" /> PDF
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.print()} title="Print">
          <Printer className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
