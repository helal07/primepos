/**
 * Thin client for the generic Laravel REST endpoints (RestController).
 * Mirrors PostgREST-style queries: filter[col][op]=val, sort, with, q, page, per_page.
 * Reuses Stage-8 apiClient (Sanctum cookies + CSRF).
 */
import { api } from "@/lib/apiClient";

export type FilterOp =
  | "eq" | "neq" | "in" | "nin"
  | "like" | "ilike"
  | "gt" | "gte" | "lt" | "lte"
  | "null" | "notnull";

export type FilterValue = string | number | boolean | null | (string | number)[];

export type FilterMap = {
  [column: string]: FilterValue | Partial<Record<FilterOp, FilterValue>>;
};

export interface ListQuery {
  filter?: FilterMap;
  sort?: string;            // e.g. "-created_at,name"
  q?: string;               // full-text search across registered columns
  page?: number;
  perPage?: number;
  with?: string[];
}

export interface ListResult<T> {
  data: T[];
  meta: { page: number; per_page: number; total: number; last_page: number };
}

function buildQuery(q: ListQuery | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!q) return out;

  if (q.sort) out.sort = q.sort;
  if (q.q) out.q = q.q;
  if (q.page) out.page = String(q.page);
  if (q.perPage) out.per_page = String(q.perPage);
  if (q.with?.length) out.with = q.with.join(",");

  if (q.filter) {
    for (const [col, val] of Object.entries(q.filter)) {
      if (val === undefined) continue;
      if (val !== null && typeof val === "object" && !Array.isArray(val)) {
        for (const [op, v] of Object.entries(val)) {
          if (v === undefined) continue;
          out[`filter[${col}][${op}]`] = Array.isArray(v) ? v.join(",") : String(v);
        }
      } else {
        out[`filter[${col}]`] = Array.isArray(val) ? val.join(",") : String(val);
      }
    }
  }
  return out;
}

export const rest = {
  list<T = unknown>(resource: string, query?: ListQuery) {
    return api.get<ListResult<T>>(`/api/rest/${resource}`, { query: buildQuery(query) });
  },

  /** Convenience: returns just the data array. */
  async all<T = unknown>(resource: string, query?: ListQuery): Promise<T[]> {
    const r = await api.get<ListResult<T>>(`/api/rest/${resource}`, { query: buildQuery(query) });
    return r.data;
  },

  get<T = unknown>(resource: string, id: string, opts: { with?: string[] } = {}) {
    const query: Record<string, string> = {};
    if (opts.with?.length) query.with = opts.with.join(",");
    return api.get<T>(`/api/rest/${resource}/${id}`, { query });
  },

  create<T = unknown>(resource: string, body: Record<string, unknown>) {
    return api.post<T>(`/api/rest/${resource}`, body);
  },

  update<T = unknown>(resource: string, id: string, patch: Record<string, unknown>) {
    return api.patch<T>(`/api/rest/${resource}/${id}`, patch);
  },

  remove(resource: string, id: string) {
    return api.delete<{ ok: true }>(`/api/rest/${resource}/${id}`);
  },
};