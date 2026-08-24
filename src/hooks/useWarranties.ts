import { useQuery } from "@tanstack/react-query";
import { rest } from "@/lib/restResource";

export type WarrantyDurationType = "days" | "weeks" | "months" | "years";

export interface WarrantyType {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  duration_type: WarrantyDurationType | string;
  is_active: boolean;
}

/** Warranty definitions (name + period) — available to every tenant. */
export function useWarrantyTypes() {
  return useQuery({
    queryKey: ["warranties"],
    queryFn: async () =>
      await rest.all<WarrantyType>("warranties", { sort: "-created_at", perPage: 500 }),
  });
}

/** Human label like "1 Year Warranty (1 years)". */
export function warrantyLabel(w: Pick<WarrantyType, "name" | "duration" | "duration_type">) {
  return `${w.name} (${w.duration} ${w.duration_type})`;
}

/** Approximate month equivalent so legacy product/report fields keep working. */
export function warrantyToMonths(duration: number, type: string): number {
  const d = Number(duration) || 0;
  switch (type) {
    case "days": return Math.max(0, Math.round(d / 30));
    case "weeks": return Math.max(0, Math.round(d / 4.345));
    case "years": return d * 12;
    default: return d;
  }
}

/** Coverage end date from a start date + warranty period. */
export function warrantyEndDate(start: string | Date, duration: number, type: string): Date {
  const d = new Date(start);
  const n = Number(duration) || 0;
  switch (type) {
    case "days": d.setDate(d.getDate() + n); break;
    case "weeks": d.setDate(d.getDate() + n * 7); break;
    case "years": d.setFullYear(d.getFullYear() + n); break;
    default: d.setMonth(d.getMonth() + n); break;
  }
  return d;
}

export function daysRemaining(end: Date): number {
  return Math.ceil((end.getTime() - Date.now()) / 86_400_000);
}
