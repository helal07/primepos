/**
 * Translate raw Supabase / Postgres / network errors into short,
 * user-friendly messages a non-technical customer can act on.
 */
export function toFriendlyError(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (!err) return fallback;

  const e = err as any;
  const raw =
    (typeof e === "string" && e) ||
    e?.message ||
    e?.error_description ||
    e?.error ||
    e?.hint ||
    e?.details ||
    "";
  const msg = String(raw);
  const low = msg.toLowerCase();
  const code = String(e?.code ?? "").toLowerCase();

  // ---------- Auth ----------
  if (low.includes("invalid login") || low.includes("invalid credentials") || low.includes("invalid email or password")) {
    return "Invalid email or password.";
  }
  if (low.includes("email not confirmed") || low.includes("email_not_confirmed")) {
    return "Please verify your email address before signing in.";
  }
  if (low.includes("user already registered") || low.includes("already registered") ||
      low.includes("already exists") || low.includes("email_exists") || code === "email_exists") {
    return "An account with this email already exists. Please sign in instead.";
  }
  if (low.includes("password should be at least") || low.includes("weak password") || low.includes("password must")) {
    return "Password is too weak. Use at least 8 characters with letters and numbers.";
  }
  if (low.includes("rate limit") || low.includes("too many requests") || code === "429") {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (low.includes("otp") && low.includes("expired")) {
    return "Your verification code has expired. Please request a new one.";
  }
  if (low.includes("jwt") || low.includes("not authenticated") || low.includes("auth session missing")) {
    return "Your session has expired. Please sign in again.";
  }

  // ---------- Permissions / RLS ----------
  if (low.includes("row-level security") || low.includes("row level security") ||
      low.includes("permission denied") || code === "42501") {
    return "You don't have permission to perform this action.";
  }
  if (low.includes("not allowed") || low.includes("forbidden")) {
    return "You're not allowed to do this. Please contact your administrator.";
  }

  // ---------- Postgres constraint codes ----------
  if (code === "23505" || low.includes("duplicate key") || low.includes("unique constraint")) {
    // Try to extract the field name from "Key (field)=(value) already exists"
    const m = msg.match(/key \(([^)]+)\)=\(([^)]+)\)/i);
    if (m) {
      const field = m[1].replace(/_/g, " ");
      if (/email/i.test(field)) return "An account with this email already exists.";
      if (/phone/i.test(field)) return "This phone number is already in use.";
      if (/imei|serial/i.test(field)) return `This IMEI/Serial "${m[2]}" is already in the system.`;
      if (/sku|barcode/i.test(field)) return `This ${field} "${m[2]}" already exists.`;
      return `This ${field} already exists. Please use a different value.`;
    }
    if (/imei|serial/i.test(low)) return "This IMEI/Serial number already exists.";
    if (/email/i.test(low)) return "This email is already in use.";
    if (/phone/i.test(low)) return "This phone number is already in use.";
    return "A record with the same details already exists.";
  }
  if (code === "23503" || low.includes("foreign key") || low.includes("violates foreign key")) {
    if (low.includes("update") || low.includes("delete")) {
      return "Can't delete this — it's still being used by other records.";
    }
    return "Some related information is missing or invalid.";
  }
  if (code === "23502" || low.includes("null value in column") || low.includes("not-null")) {
    const m = msg.match(/column "([^"]+)"/i);
    const field = m ? m[1].replace(/_/g, " ") : "required field";
    return `Please fill in the ${field}.`;
  }
  if (code === "23514" || low.includes("check constraint")) {
    return "Some of the values entered are not valid. Please review and try again.";
  }
  if (code === "22001" || low.includes("value too long")) {
    return "One of the fields is too long. Please shorten it.";
  }
  if (code === "22p02" || low.includes("invalid input syntax")) {
    return "Some of the values entered are in the wrong format.";
  }

  // ---------- Storage ----------
  if (low.includes("payload too large") || low.includes("file size") || low.includes("max file size")) {
    return "File is too large. Please upload a smaller file.";
  }
  if (low.includes("mime type") || low.includes("invalid file type")) {
    return "This file type is not supported.";
  }

  // ---------- Network ----------
  if (low.includes("failed to fetch") || low.includes("networkerror") || low.includes("network request failed") ||
      low.includes("load failed") || e?.name === "TypeError" && low.includes("fetch")) {
    return "Network problem. Please check your internet connection and try again.";
  }
  if (low.includes("timeout") || low.includes("timed out")) {
    return "The request took too long. Please try again.";
  }

  // ---------- Specific business rules surfaced by triggers / RPCs ----------
  if (low.includes("imei") && low.includes("already")) return msg; // already friendly from trigger
  if (low.includes("subscription") && (low.includes("expired") || low.includes("active"))) return msg;
  if (low.includes("cannot delete tenant")) return msg;
  if (low.includes("not found")) return msg.replace(/^.*?:\s*/, "").trim() || "Not found.";

  // Generic, but readable fallback
  if (msg && msg.length < 180) return msg.replace(/^Error:\s*/i, "");
  return fallback;
}

/** Convenience for toast helpers */
export function friendly(err: unknown, fallback?: string) {
  return toFriendlyError(err, fallback);
}
