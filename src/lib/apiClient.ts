/**
 * Sanctum-aware HTTP client for the Laravel backend.
 * - withCredentials so XSRF-TOKEN + session cookies are sent
 * - lazy /sanctum/csrf-cookie bootstrap
 * - throws ApiError with normalized shape
 */

// Coolify/VPS builds use VITE_API_BASE_URL. Keep the older VITE_API_URL as a
// compatibility fallback; an empty value means Laravel is on the same origin.
// The Lovable preview/sandbox has no Laravel on its own origin, so fall back to
// the deployed VPS API there.
const PREVIEW_API_FALLBACK = "https://my.primepos.xyz";

function resolveApiBase(): string {
  const configured = (import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL ?? "").trim();
  if (configured) return configured.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const isPreview =
      host.endsWith(".lovable.app") ||
      host.endsWith(".lovableproject.com") ||
      host === "localhost" ||
      host === "127.0.0.1";
    if (isPreview) return PREVIEW_API_FALLBACK;
  }
  return "";
}

export const API_URL = resolveApiBase();


const TOKEN_KEY = "pp_auth_token";
export function getAuthToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setAuthToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* ignore */ }
}

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;
  data?: unknown;
  constructor(message: string, status: number, errors?: Record<string, string[]>, data?: unknown) {
    super(message);
    this.status = status;
    this.errors = errors;
    this.data = data;
  }
}

type Body = unknown | FormData | undefined;

interface Opts {
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: Opts["query"]): string {
  const base = path.startsWith("http") ? path : `${API_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  if (!query) return base;
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    usp.append(k, String(v));
  }
  const qs = usp.toString();
  return qs ? `${base}${base.includes("?") ? "&" : "?"}${qs}` : base;
}

async function request<T = unknown>(method: string, path: string, body?: Body, opts: Opts = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(opts.headers ?? {}),
  };
  const token = getAuthToken();
  if (token && !headers["Authorization"]) headers["Authorization"] = `Bearer ${token}`;

  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const res = await fetch(buildUrl(path, opts.query), {
    method,
    headers,
    body: payload,
    signal: opts.signal,
  });

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : await res.text();

  if (!isJson) {
    throw new ApiError(
      "Laravel API returned a non-JSON response. Check VITE_API_BASE_URL and the VPS /api routing configuration.",
      res.ok ? 502 : res.status,
      undefined,
      data,
    );
  }

  if (!res.ok) {
    const msg = (isJson && (data as any)?.message) || res.statusText || `HTTP ${res.status}`;
    throw new ApiError(msg, res.status, (data as any)?.errors, data);
  }
  return data as T;
}

export const api = {
  get:    <T = unknown>(path: string, opts?: Opts)               => request<T>("GET",    path, undefined, opts),
  post:   <T = unknown>(path: string, body?: Body, opts?: Opts)  => request<T>("POST",   path, body,      opts),
  put:    <T = unknown>(path: string, body?: Body, opts?: Opts)  => request<T>("PUT",    path, body,      opts),
  patch:  <T = unknown>(path: string, body?: Body, opts?: Opts)  => request<T>("PATCH",  path, body,      opts),
  delete: <T = unknown>(path: string, opts?: Opts)               => request<T>("DELETE", path, undefined, opts),
  upload: <T = unknown>(path: string, form: FormData, opts?: Opts) => request<T>("POST", path, form,     opts),
};