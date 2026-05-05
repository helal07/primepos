export type ModuleKey =
  | "pos"
  | "sales"
  | "purchases"
  | "products"
  | "contacts"
  | "accounting"
  | "hrm"
  | "cms"
  | "warranty"
  | "installments"
  | "reports"
  | "exchange";

export interface ModuleDef {
  key: ModuleKey;
  label: string;
  description: string;
}

export const MODULE_CATALOG: ModuleDef[] = [
  { key: "pos", label: "POS", description: "Point of sale checkout screen." },
  { key: "sales", label: "Sales", description: "Sales list, orders, invoices, drafts, quotations, returns." },
  { key: "purchases", label: "Purchases", description: "Supplier purchases and purchase orders." },
  { key: "products", label: "Products & Inventory", description: "Catalog, stock, categories, brands." },
  { key: "contacts", label: "Contacts", description: "Customers and suppliers." },
  { key: "accounting", label: "Accounting", description: "Chart of accounts, journals, trial balance." },
  { key: "hrm", label: "HRM", description: "Employees, attendance, leave, payroll." },
  { key: "cms", label: "CMS", description: "Website pages and content." },
  { key: "warranty", label: "Warranty", description: "Warranty claims management." },
  { key: "installments", label: "Installments", description: "Installment sales and collections." },
  { key: "reports", label: "Reports", description: "All business reports." },
  { key: "exchange", label: "Exchange", description: "Used phone buy/sell with seller KYC, IMEI tracking and printable agreements." },
];

export const DEFAULT_MODULES: ModuleKey[] = [
  "pos", "sales", "purchases", "products", "contacts", "reports",
];