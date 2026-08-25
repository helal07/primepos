/**
 * Drop-in replacements for `supabase.functions.invoke(...)` calls.
 * Maps each former edge function to its Laravel REST endpoint.
 */
import { api } from "@/lib/apiClient";

// ---- Tenant lifecycle ------------------------------------------------------

export interface TenantSignupPayload {
  businessName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address?: string;
  password: string;
  registrationChoice: "trial" | "paid";
  packageId: string;
}
export interface TenantSignupResult { tenant_id: string; user_id: string }

export const tenantSignup = (body: TenantSignupPayload) =>
  api.post<TenantSignupResult>("/api/tenants/signup", body);

export interface AdminCreateTenantPayload {
  admin_email: string;
  admin_password: string;
  admin_display_name?: string;
  choice: "trial" | "paid" | "active";
  tenant: Record<string, unknown>;
}
export const adminCreateTenant = (body: AdminCreateTenantPayload) =>
  api.post<{ tenant_id: string; user_id: string }>("/api/admin/tenants", body);

// ---- Tenant users ----------------------------------------------------------

export interface CreateTenantUserPayload {
  email: string;
  password: string;
  display_name?: string;
  role_name?: string | null;
}
export const createTenantUser = (body: CreateTenantUserPayload) =>
  api.post<{ user_id: string; email: string }>("/api/tenant-users", body);

export const deleteTenantUser = (userId: string) =>
  api.delete<{ ok: true }>(`/api/tenant-users/${userId}`);

export const resetTenantPassword = (userId: string, newPassword: string) =>
  api.post<{ email: string }>(`/api/tenant-users/${userId}/reset-password`, {
    new_password: newPassword,
  });

// ---- Payments --------------------------------------------------------------

export type GatewayCode = "bkash" | "sslcommerz" | "eps";

export interface PublicGateway {
  id: string;
  code: GatewayCode;
  display_name: string;
  logo_url?: string | null;
  instructions?: string | null;
}

export const listCheckoutGateways = () =>
  api.get<PublicGateway[]>("/api/public/payment-gateways");

export interface PaymentInitPayload {
  gateway: GatewayCode | string;
  package_id: string;
  subscription_type?: "monthly" | "yearly";
  from?: string;
}
export const paymentInit = (body: PaymentInitPayload) =>
  api.post<{ url: string; reference?: string }>("/api/payments/init", body);

export const superApprovePayment = (paymentId: string, action: "approve" | "reject") =>
  api.post<{ ok: true }>(`/api/payments/${paymentId}/approve`, { action });

// ---- Notifications ---------------------------------------------------------

export interface SendNotificationPayload {
  tenant_ids: string[];
  channel: "email" | "sms" | "push";
  subject?: string;
  message: string;
}
export const sendTenantNotification = (body: SendNotificationPayload) =>
  api.post<{ sent: number; failed: number }>("/api/notifications/send", body);

// ---- Tracking --------------------------------------------------------------

export interface TrackEventPayload {
  event_name: string;
  event_id?: string;
  event_source_url?: string;
  user_data?: Record<string, unknown>;
  custom_data?: Record<string, unknown>;
  ga4_client_id?: string;
}
export const trackEventApi = (body: TrackEventPayload) =>
  api.post<{ ok: true }>("/api/track/event", body).catch(() => undefined);