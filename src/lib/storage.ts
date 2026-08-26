/**
 * Bucket helper that mirrors the old Supabase Storage surface
 * but talks to Laravel /api/files/* (see backend FileController).
 *
 * Mapping:
 *   uploadFile(bucket, file, { filename? })  -> POST /api/files/upload
 *   fileUrl(bucket, path)                    -> public bucket: direct /storage URL
 *                                                private bucket: short-lived signed URL
 *   signedUrl(bucket, path, ttlMinutes?)     -> GET /api/files/sign (auth required)
 *   deleteFile(bucket, path)                 -> DELETE /api/files/{bucket}/{path}
 */
import { api, API_URL } from "@/lib/apiClient";

const PUBLIC_BUCKETS = new Set(["product-images", "avatars", "branding"]);

export function isPublicBucket(bucket: string): boolean {
  return PUBLIC_BUCKETS.has(bucket);
}

export interface UploadResult {
  bucket: string;
  path: string;
  url: string;
}

export async function uploadFile(
  bucket: string,
  file: File,
  opts: { filename?: string } = {},
): Promise<UploadResult> {
  const fd = new FormData();
  fd.append("bucket", bucket);
  fd.append("file", file);
  if (opts.filename) fd.append("filename", opts.filename);
  return api.upload<UploadResult>("/api/files/upload", fd);
}

export function publicUrl(bucket: string, path: string): string {
  return `${API_URL}/storage/${bucket}/${path.replace(/^\//, "")}`;
}

/**
 * Turns any stored reference into a URL usable from the current origin:
 *  - absolute URL containing /storage/  -> rewritten to the API host (older records
 *    stored APP_URL-based links that may point at a different host)
 *  - other absolute URLs / data URIs    -> returned untouched
 *  - bare "<bucket>/<path>"             -> served from the API /storage root
 */
export function normalizeStorageUrl(url?: string | null): string {
  if (!url) return "";
  const i = url.indexOf("/storage/");
  if (i !== -1) return `${API_URL}${url.slice(i)}`;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  const bucket = url.replace(/^\//, "").split("/")[0];
  if (isPublicBucket(bucket)) return `${API_URL}/storage/${url.replace(/^\//, "")}`;
  return url;
}



/** Public bucket -> direct URL. Private bucket -> short-lived signed URL via API. */
export async function fileUrl(bucket: string, path: string, ttlMinutes = 10): Promise<string> {
  if (!path) return "";
  if (path.startsWith("http")) return path; // legacy / already a URL
  if (isPublicBucket(bucket)) return publicUrl(bucket, path);
  const res = await api.get<{ url: string; expires_at: string }>("/api/files/sign", {
    query: { bucket, path, ttl: ttlMinutes },
  });
  return res.url;
}

export const signedUrl = fileUrl;

export async function deleteFile(bucket: string, path: string): Promise<void> {
  await api.delete(`/api/files/${bucket}/${encodeURI(path)}`);
}