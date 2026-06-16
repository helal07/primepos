import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toFriendlyError } from "@/lib/friendlyError";
import { rest } from "@/lib/restResource";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantRealtime } from "@/hooks/useTenantRealtime";
import { toast } from "sonner";

/** Alias singular Laravel relations → plural Supabase shape for legacy UI. */
function aliasEmployee<T extends Record<string, any>>(row: T): T {
  if (!row) return row;
  const out: any = { ...row };
  if (out.employee && !out.employees) out.employees = out.employee;
  return out;
}

// ── Employees ──
export function useEmployees() {
  return useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      return await rest.all<any>("employees", { sort: "name", perPage: 500 });
    },
  });
}

export function useEmployeeMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const upsertEmployee = useMutation({
    mutationFn: async (emp: any) => {
      if (emp.id) {
        const { id, ...patch } = emp;
        await rest.update("employees", id, patch);
      } else {
        await rest.create("employees", { ...emp, created_by: user?.id });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employees"] }); toast.success("Employee saved"); },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });

  const deleteEmployee = useMutation({
    mutationFn: async (id: string) => { await rest.remove("employees", id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employees"] }); toast.success("Employee deleted"); },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });

  return { upsertEmployee, deleteEmployee };
}

// ── Attendance ──
export function useAttendance(date?: string) {
  useTenantRealtime(["attendance"], [["attendance"]]);
  return useQuery({
    queryKey: ["attendance", date],
    queryFn: async () => {
      const filter: Record<string, any> = {};
      if (date) filter.date = date;
      const rows = await rest.all<any>("attendance", {
        filter, with: ["employee"], sort: "-date", perPage: 200,
      });
      return rows.map(aliasEmployee);
    },
  });
}

export function useAttendanceMutations() {
  const qc = useQueryClient();

  const markAttendance = useMutation({
    mutationFn: async (record: any) => {
      // Manual upsert by (employee_id, date) since REST has no native upsert.
      const existing = await rest.all<any>("attendance", {
        filter: { employee_id: record.employee_id, date: record.date },
        perPage: 1,
      });
      if (existing[0]?.id) {
        const { id: _i, ...patch } = record;
        await rest.update("attendance", existing[0].id, patch);
      } else {
        await rest.create("attendance", record);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["attendance"] }); toast.success("Attendance saved"); },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });

  return { markAttendance };
}

// ── Leave ──
export function useLeaveRequests() {
  useTenantRealtime(["leave_requests"], [["leave_requests"]]);
  return useQuery({
    queryKey: ["leave_requests"],
    queryFn: async () => {
      const rows = await rest.all<any>("leave_requests", {
        with: ["employee"], sort: "-created_at", perPage: 500,
      });
      return rows.map(aliasEmployee);
    },
  });
}

export function useLeaveMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const createLeave = useMutation({
    mutationFn: async (leave: any) => { await rest.create("leave_requests", leave); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leave_requests"] }); toast.success("Leave request created"); },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });

  const updateLeaveStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await rest.update("leave_requests", id, { status, approved_by: user?.id });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leave_requests"] }); toast.success("Leave status updated"); },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });

  return { createLeave, updateLeaveStatus };
}

// ── Payroll ──
export function usePayroll(month?: number, year?: number) {
  useTenantRealtime(["payroll"], [["payroll"]]);
  return useQuery({
    queryKey: ["payroll", month, year],
    queryFn: async () => {
      const filter: Record<string, any> = {};
      if (month && year) { filter.month = month; filter.year = year; }
      const rows = await rest.all<any>("payroll", {
        filter, with: ["employee"], sort: "-year,-month", perPage: 200,
      });
      return rows.map(aliasEmployee);
    },
  });
}

export function usePayrollMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const upsertPayroll = useMutation({
    mutationFn: async (record: any) => {
      const payload = { ...record, created_by: user?.id };
      if (record.id) {
        const { id, ...patch } = payload;
        await rest.update("payroll", id, patch);
      } else {
        await rest.create("payroll", payload);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payroll"] }); toast.success("Payroll saved"); },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });

  return { upsertPayroll };
}
