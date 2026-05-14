// Build a WhatsApp click-to-chat URL using the api.whatsapp.com/send pattern.
// This requires NO API credentials — it opens the user's WhatsApp app/web
// with the phone number and message body prefilled.

export function buildWhatsappUrl(phone: string, text: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  // Use api.whatsapp.com/send — universal: opens the app on mobile, web on desktop.
  return `https://api.whatsapp.com/send/?phone=${digits}&text=${encodeURIComponent(text)}&type=phone_number&app_absent=0`;
}

export interface SaleShareInput {
  sale: any;
  payments: any[];
  settings: any;
}

// Bengali due-payment notice mirroring the reference message format.
export function buildSaleWhatsappMessage({ sale, payments, settings }: SaleShareInput): string {
  const business = settings?.business_name || settings?.company_name || "";
  const ownerLine = settings?.owner_name ? `Msp ${settings.owner_name}` : "";
  const branch = settings?.branch || settings?.address || "";
  const customerName = sale?.customers?.name || "Customer";

  const total = Number(sale?.total_amount || 0);
  const paid = (payments || []).reduce((s, p: any) => s + Number(p.amount || 0), 0);
  const due = Math.max(0, total - paid);

  const fmt = (n: number) => new Intl.NumberFormat("en-IN").format(n);

  const invoiceUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/sales/${sale?.id}`;
  const paymentUrl = settings?.payment_link_base
    ? `${settings.payment_link_base}/${sale?.id}`
    : "";

  const bankBlock = settings?.bank_name
    ? [
        settings.bank_name,
        business,
        settings?.bank_branch ? `Branch: ${settings.bank_branch}` : "",
        settings?.bank_account ? `AC no: ${settings.bank_account}` : "",
      ].filter(Boolean).join("\n")
    : "";

  const lines = [
    `প্রিয় ${[business, branch, ownerLine].filter(Boolean).join(", ")},`,
    "",
    `আপনার ইনভয়েজ নাম্বার ${sale?.invoice_number || ""}`,
    `আপনার ইনভয়েজ দেখুতে ক্লিক করুন  ${invoiceUrl}`,
    `মোট বিল :  ${fmt(total)}`,
    `প্রদান করলেন :  ${fmt(paid)}`,
    `আজকের বাকি :  ${fmt(due)}`,
    `মোট বাকি : ${fmt(due)}`,
  ];

  if (paymentUrl) {
    lines.push(`পেমেন্ট করতে ক্লিক করুন (বিকাশ/নগদ/রকেট) : ${paymentUrl}`);
  }
  if (bankBlock) {
    lines.push(bankBlock);
  }

  lines.push("", "ধন্যবাদ", business || "", settings?.business_phone || settings?.phone || "");

  // Strip empty trailing lines around the greeting; replace customer placeholder if needed.
  return lines.join("\n").replace(/^প্রিয়\s*,/, `প্রিয় ${customerName},`);
}

export function buildSaleWhatsappUrl(input: SaleShareInput): string {
  const phone = input.sale?.customers?.phone || "";
  const text = buildSaleWhatsappMessage(input);
  return buildWhatsappUrl(phone, text);
}
