import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toFriendlyError } from "@/lib/friendlyError";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// ── Employees ──
export function useEmployees() {
  return useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useEmployeeMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const upsertEmployee = useMutation({
    mutationFn: async (emp: any) => {
      if (emp.id) {
        const { error } = await supabase.from("employees").update(emp).eq("id", emp.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("employees").insert({ ...emp, created_by: user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employees"] }); toast.success("Employee saved"); },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });

  const deleteEmployee = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employees").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employees"] }); toast.success("Employee deleted"); },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });

  return { upsertEmployee, deleteEmployee };
}

// ── Attendance ──
export function useAttendance(date?: string) {
  return useQuery({
    queryKey: ["attendance", date],
    queryFn: async () => {
      let q = supabase.from("attendance").select("*, employees(name)").order("date", { ascending: false });
      if (date) q = q.eq("date", date);
      const { data, error } = await q.limit(200);
      if (error) throw error;
      return data;
    },
  });
}

export function useAttendanceMutations() {
  const qc = useQueryClient();

  const markAttendance = useMutation({
    mutationFn: async (record: any) => {
      const { error } = await supabase.from("attendance").upsert(record, { onConflict: "employee_id,date" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["attendance"] }); toast.success("Attendance saved"); },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });

  return { markAttendance };
}

// ── Leave ──
export function useLeaveRequests() {
  return useQuery({
    queryKey: ["leave_requests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leave_requests").select("*, employees(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useLeaveMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const createLeave = useMutation({
    mutationFn: async (leave: any) => {
      const { error } = await supabase.from("leave_requests").insert(leave);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leave_requests"] }); toast.success("Leave request created"); },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });

  const updateLeaveStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("leave_requests").update({ status, approved_by: user?.id }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leave_requests"] }); toast.success("Leave status updated"); },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });

  return { createLeave, updateLeaveStatus };
}

// ── Payroll ──
export function usePayroll(month?: number, year?: number) {
  return useQuery({
    queryKey: ["payroll", month, year],
    queryFn: async () => {
      let q = supabase.from("payroll").select("*, employees(name)").order("year", { ascending: false }).order("month", { ascending: false });
      if (month && year) q = q.eq("month", month).eq("year", year);
      const { data, error } = await q.limit(200);
      if (error) throw error;
      return data;
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
        const { error } = await supabase.from("payroll").update(payload).eq("id", record.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("payroll").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payroll"] }); toast.success("Payroll saved"); },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });

  return { upsertPayroll };
}
