import { Suspense } from "react";
import { lazyRetry } from "@/lib/lazyRetry";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useParams } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SuperadminRoute } from "@/components/admin/SuperadminRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AppLayout } from "@/components/layout/AppLayout";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import { ModuleGate } from "@/components/ModuleGate";
import { PermissionGate } from "@/components/PermissionGate";
import { DynamicManifest } from "@/components/DynamicManifest";
import { BrandingInjector } from "@/components/BrandingInjector";
import { TrackingInjector } from "@/components/TrackingInjector";
import LandingPage from "./pages/LandingPage";

const Login = lazyRetry(() => import("./pages/Login"));
const SuperadminLogin = lazyRetry(() => import("./pages/superadmin/SuperadminLogin"));
const Register = lazyRetry(() => import("./pages/Register"));
const SubscriptionPage = lazyRetry(() => import("./pages/Subscription"));
const Dashboard = lazyRetry(() => import("./pages/Dashboard"));
const Products = lazyRetry(() => import("./pages/Products"));
const ProductAdd = lazyRetry(() => import("./pages/ProductAdd"));
const Categories = lazyRetry(() => import("./pages/Categories"));
const Brands = lazyRetry(() => import("./pages/Brands"));
const Warranties = lazyRetry(() => import("./pages/Warranties"));
const WarrantyChecking = lazyRetry(() => import("./pages/WarrantyChecking"));

const ProductBulkImport = lazyRetry(() => import("./pages/ProductBulkImport"));
const ProductExport = lazyRetry(() => import("./pages/ProductExport"));
const PrintLabels = lazyRetry(() => import("./pages/PrintLabels"));
const SellingPriceGroups = lazyRetry(() => import("./pages/SellingPriceGroups"));
const CustomerGroups = lazyRetry(() => import("./pages/CustomerGroups"));
const Units = lazyRetry(() => import("./pages/Units"));
const Variations = lazyRetry(() => import("./pages/Variations"));
const StockAdjustments = lazyRetry(() => import("./pages/StockAdjustments"));
const StockTransfers = lazyRetry(() => import("./pages/StockTransfers"));
const Warehouses = lazyRetry(() => import("./pages/Warehouses"));
const WarehouseStock = lazyRetry(() => import("./pages/WarehouseStock"));
const Sales = lazyRetry(() => import("./pages/Sales"));
const SaleAdd = lazyRetry(() => import("./pages/SaleAdd"));
const SalesOrderAdd = lazyRetry(() => import("./pages/SalesOrderAdd"));
const SaleView = lazyRetry(() => import("./pages/SaleView"));
const POS = lazyRetry(() => import("./pages/POS"));
const Customers = lazyRetry(() => import("./pages/Customers"));
const CustomerAdd = lazyRetry(() => import("./pages/CustomerAdd"));
const Suppliers = lazyRetry(() => import("./pages/Suppliers"));
const ContactProfile = lazyRetry(() => import("./pages/ContactProfile"));
const SettingsPage = lazyRetry(() => import("./pages/Settings"));
const TenantBackupPage = lazyRetry(() => import("./pages/settings/TenantBackup"));
const ProfilePage = lazyRetry(() => import("./pages/Profile"));
const UsersPage = lazyRetry(() => import("./pages/Users"));
const RolesPage = lazyRetry(() => import("./pages/Roles"));
const ActivityLogPage = lazyRetry(() => import("./pages/ActivityLog"));
const Purchases = lazyRetry(() => import("./pages/Purchases"));
const PurchaseAdd = lazyRetry(() => import("./pages/PurchaseAdd"));
const PurchaseView = lazyRetry(() => import("./pages/PurchaseView"));
const PurchaseOrders = lazyRetry(() => import("./pages/PurchaseOrders"));
const PurchaseOrderAdd = lazyRetry(() => import("./pages/PurchaseOrderAdd"));
const ChartOfAccounts = lazyRetry(() => import("./pages/ChartOfAccounts"));
const Transactions = lazyRetry(() => import("./pages/Transactions"));
const JournalEntries = lazyRetry(() => import("./pages/JournalEntries"));
const TrialBalance = lazyRetry(() => import("./pages/TrialBalance"));
const CashFlow = lazyRetry(() => import("./pages/CashFlow"));
const Employees = lazyRetry(() => import("./pages/Employees"));
const Attendance = lazyRetry(() => import("./pages/Attendance"));
const LeaveManagement = lazyRetry(() => import("./pages/LeaveManagement"));
const PayrollPage = lazyRetry(() => import("./pages/Payroll"));
const WarrantyClaims = lazyRetry(() => import("./pages/WarrantyClaims"));
const Exchange = lazyRetry(() => import("./pages/Exchange"));
const ExchangePurchases = lazyRetry(() => import("./pages/ExchangePurchases"));
const ExchangePurchaseAdd = lazyRetry(() => import("./pages/ExchangePurchaseAdd"));
const ExchangePurchaseView = lazyRetry(() => import("./pages/ExchangePurchaseView"));
const ExchangeAgreement = lazyRetry(() => import("./pages/ExchangeAgreement"));
const ExchangeSell = lazyRetry(() => import("./pages/ExchangeSell"));
const Reports = lazyRetry(() => import("./pages/Reports"));
const ProfitLossReport = lazyRetry(() => import("./pages/reports/ProfitLossReport"));
const StockReport = lazyRetry(() => import("./pages/reports/StockReport"));
const TaxReport = lazyRetry(() => import("./pages/reports/TaxReport"));
const DailySummaryReport = lazyRetry(() => import("./pages/reports/DailySummaryReport"));
const DueSaleReport = lazyRetry(() => import("./pages/reports/DueSaleReport"));
const ProductProfitReport = lazyRetry(() => import("./pages/reports/ProductProfitReport"));
const PurchaseSaleReport = lazyRetry(() => import("./pages/reports/PurchaseSaleReport"));
const ContactsReport = lazyRetry(() => import("./pages/reports/ContactsReport"));
const ItemsReport = lazyRetry(() => import("./pages/reports/ItemsReport"));
const TrendingProductsReport = lazyRetry(() => import("./pages/reports/TrendingProductsReport"));
const InstallmentReport = lazyRetry(() => import("./pages/reports/InstallmentReport"));
const ExpenseReport = lazyRetry(() => import("./pages/reports/ExpenseReport"));
const RegisterReport = lazyRetry(() => import("./pages/reports/RegisterReport"));
const InstallmentCustomerAdd = lazyRetry(() => import("./pages/InstallmentCustomerAdd"));
const InstallmentCustomers = lazyRetry(() => import("./pages/InstallmentCustomers"));
const InstallmentSaleAdd = lazyRetry(() => import("./pages/InstallmentSaleAdd"));
const InstallmentSales = lazyRetry(() => import("./pages/InstallmentSales"));
const InstallmentCollections = lazyRetry(() => import("./pages/InstallmentCollections"));
const InstallmentSchedule = lazyRetry(() => import("./pages/InstallmentSchedule"));
const InstallmentAgreement = lazyRetry(() => import("./pages/InstallmentAgreement"));
const InstallmentSaleView = lazyRetry(() => import("./pages/InstallmentSaleView"));
const AdminDashboard = lazyRetry(() => import("./pages/admin/AdminDashboard"));
const TenantManagement = lazyRetry(() => import("./pages/admin/TenantManagement"));
const PackageManagement = lazyRetry(() => import("./pages/admin/PackageManagement"));
const LandingCms = lazyRetry(() => import("./pages/admin/LandingCms"));
const AdminSettings = lazyRetry(() => import("./pages/admin/AdminSettings"));
const TrialEmailTemplates = lazyRetry(() => import("./pages/admin/TrialEmailTemplates"));
const SuperadminProfile = lazyRetry(() => import("./pages/superadmin/SuperadminProfile"));
const TenantDetail = lazyRetry(() => import("./pages/admin/TenantDetail"));
const Sitemap = lazyRetry(() => import("./pages/admin/Sitemap"));
const SmsProviders = lazyRetry(() => import("./pages/admin/SmsProviders"));
const SmsPlans = lazyRetry(() => import("./pages/admin/SmsPlans"));
const SmsPurchases = lazyRetry(() => import("./pages/admin/SmsPurchases"));
const AdminNotifications = lazyRetry(() => import("./pages/admin/Notifications"));
const NotificationTemplates = lazyRetry(() => import("./pages/admin/NotificationTemplates"));
const SuperPayments = lazyRetry(() => import("./pages/admin/SuperPayments"));
const PaymentGateways = lazyRetry(() => import("./pages/admin/PaymentGateways"));
const NotFound = lazyRetry(() => import("./pages/NotFound"));
const Shipments = lazyRetry(() => import("./pages/Shipments"));
const Expenses = lazyRetry(() => import("./pages/expenses/Expenses"));
const ExpenseAdd = lazyRetry(() => import("./pages/expenses/ExpenseAdd"));
const ExpenseCategories = lazyRetry(() => import("./pages/expenses/ExpenseCategories"));
const LockedModule = lazyRetry(() => import("./pages/LockedModule"));

const SaleEditRedirect = () => { const { id } = useParams(); return <Navigate to={`/sales/add?edit=${id}`} replace />; };
const PurchaseEditRedirect = () => { const { id } = useParams(); return <Navigate to={`/purchases/add?edit=${id}`} replace />; };

const queryClient = new QueryClient();

const RouteFallback = () => <div className="flex items-center justify-center p-8 text-muted-foreground">Loading…</div>;

const SuperadminRoutes = () => (
  <SuperadminRoute>
      <AdminLayout>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route index element={<AdminDashboard />} />
            <Route path="tenants" element={<TenantManagement />} />
            <Route path="tenants/:id" element={<TenantDetail />} />
            <Route path="packages" element={<PackageManagement />} />
            <Route path="cms" element={<LandingCms />} />
            <Route path="sitemap" element={<Navigate to="/superadmin/settings" replace />} />
            <Route path="sms/providers" element={<SmsProviders />} />
            <Route path="sms/plans" element={<SmsPlans />} />
            <Route path="sms/purchases" element={<SmsPurchases />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="notification-templates" element={<NotificationTemplates />} />
            <Route path="payments" element={<SuperPayments />} />
            <Route path="payment-gateways" element={<Navigate to="/superadmin/settings" replace />} />
            <Route path="transactions" element={<Navigate to="/superadmin/payments" replace />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="trial-emails" element={<TrialEmailTemplates />} />
            <Route path="profile" element={<SuperadminProfile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AdminLayout>
  </SuperadminRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
          <DynamicManifest />
          <BrandingInjector />
          <TrackingInjector />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Suspense fallback={<RouteFallback />}><Login /></Suspense>} />
            <Route path="/superadmin/login" element={<Suspense fallback={<RouteFallback />}><SuperadminLogin /></Suspense>} />
            <Route path="/register" element={<Suspense fallback={<RouteFallback />}><Register /></Suspense>} />
            <Route path="/subscription" element={
              <ProtectedRoute>
                <Suspense fallback={<RouteFallback />}><SubscriptionPage /></Suspense>
              </ProtectedRoute>
            } />
            {/* SaaS Admin — separate layout */}
            <Route path="/superadmin/*" element={<SuperadminRoutes />} />
            <Route path="/admin/*" element={<Navigate to="/superadmin" replace />} />
            {/* Tenant routes */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Suspense fallback={<RouteFallback />}>
                      <Routes>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/products" element={<ModuleGate module="products"><Products /></ModuleGate>} />
                        <Route path="/products/add" element={<ModuleGate module="products"><ProductAdd /></ModuleGate>} />
                        <Route path="/products/edit/:id" element={<ModuleGate module="products"><ProductAdd /></ModuleGate>} />
                        <Route path="/categories" element={<ModuleGate module="products"><Categories /></ModuleGate>} />
                        <Route path="/brands" element={<ModuleGate module="products"><Brands /></ModuleGate>} />
                        <Route path="/products/price-groups" element={<ModuleGate module="products"><SellingPriceGroups /></ModuleGate>} />
                        <Route path="/contacts/customer-groups" element={<ModuleGate module="contacts"><CustomerGroups /></ModuleGate>} />
                        <Route path="/units" element={<ModuleGate module="products"><Units /></ModuleGate>} />
                        <Route path="/variations" element={<ModuleGate module="products"><Variations /></ModuleGate>} />
                        <Route path="/stock-adjustments" element={<ModuleGate module="products"><StockAdjustments /></ModuleGate>} />
                        <Route path="/stock-transfers" element={<ModuleGate module="warehouses"><StockTransfers /></ModuleGate>} />
                        <Route path="/warehouses" element={<ModuleGate module="warehouses"><Warehouses /></ModuleGate>} />
                        <Route path="/warehouses/stock" element={<ModuleGate module="warehouses"><WarehouseStock /></ModuleGate>} />
                        {/* Warranty definitions are part of product setup — open to all tenants. */}
                        <Route path="/warranties" element={<Warranties />} />

                        <Route path="/products/import" element={<ModuleGate module="products"><ProductBulkImport /></ModuleGate>} />
                        <Route path="/products/export" element={<ModuleGate module="products"><ProductExport /></ModuleGate>} />
                        <Route path="/products/labels" element={<ModuleGate module="products"><PrintLabels /></ModuleGate>} />
                        <Route path="/pos" element={<ModuleGate module="pos"><POS /></ModuleGate>} />
                        <Route path="/sales" element={<ModuleGate module="sales"><PermissionGate module="sales" action="view"><Sales /></PermissionGate></ModuleGate>} />
                        <Route path="/sales/add" element={<ModuleGate module="sales"><PermissionGate module="sales" action="create"><SaleAdd /></PermissionGate></ModuleGate>} />
                        <Route path="/sales/:id" element={<ModuleGate module="sales"><PermissionGate module="sales" action="view"><SaleView /></PermissionGate></ModuleGate>} />
                        <Route path="/sales/:id/edit" element={<ModuleGate module="sales"><PermissionGate module="sales" action="edit"><SaleEditRedirect /></PermissionGate></ModuleGate>} />
                        <Route path="/sales/orders" element={<ModuleGate module="sales">
                          <Sales defaultStatus="order" title="Sales Orders" description="Pending orders waiting to be invoiced" hideStatusFilter addLabel="Add Sales Order" addPath="/sales/orders/add" />
                        </ModuleGate>} />
                        <Route path="/sales/orders/add" element={<ModuleGate module="sales"><SalesOrderAdd /></ModuleGate>} />
                        <Route path="/invoices" element={<ModuleGate module="sales">
                          <Sales defaultStatus="completed" title="Invoices" description="All completed sale invoices" hideStatusFilter />
                        </ModuleGate>} />
                        <Route path="/sales/drafts" element={<ModuleGate module="sales">
                          <Sales defaultStatus="draft" title="Drafts" description="Draft sales" hideStatusFilter addLabel="Add Draft" />
                        </ModuleGate>} />
                        <Route path="/quotations" element={<ModuleGate module="sales">
                          <Sales defaultStatus="quotation" title="Quotations" description="Customer quotations" hideStatusFilter addLabel="Add Quotation" addPath="/sales/add?status=quotation" />
                        </ModuleGate>} />
                        <Route path="/sales/returns" element={<ModuleGate module="sales">
                          <Sales defaultStatus="returned" title="Sale Returns" description="Returned sales" hideStatusFilter />
                        </ModuleGate>} />
                        <Route path="/shipments" element={<ModuleGate module="sales"><Shipments /></ModuleGate>} />
                        <Route path="/expenses" element={<ModuleGate module="expenses"><PermissionGate module="expenses" action="view"><Expenses /></PermissionGate></ModuleGate>} />
                        <Route path="/expenses/add" element={<ModuleGate module="expenses"><PermissionGate module="expenses" action="create"><ExpenseAdd /></PermissionGate></ModuleGate>} />
                        <Route path="/expenses/:id/edit" element={<ModuleGate module="expenses"><PermissionGate module="expenses" action="edit"><ExpenseAdd /></PermissionGate></ModuleGate>} />
                        <Route path="/expenses/categories" element={<ModuleGate module="expenses"><PermissionGate module="expenses" action="view"><ExpenseCategories /></PermissionGate></ModuleGate>} />
                        <Route path="/locked/:module" element={<LockedModule />} />
                        <Route path="/purchases/add" element={<ModuleGate module="purchases"><PermissionGate module="purchases" action="create"><PurchaseAdd /></PermissionGate></ModuleGate>} />
                        <Route path="/purchases" element={<ModuleGate module="purchases"><PermissionGate module="purchases" action="view"><Purchases /></PermissionGate></ModuleGate>} />
                        <Route path="/purchases/:id" element={<ModuleGate module="purchases"><PermissionGate module="purchases" action="view"><PurchaseView /></PermissionGate></ModuleGate>} />
                        <Route path="/purchases/:id/edit" element={<ModuleGate module="purchases"><PermissionGate module="purchases" action="edit"><PurchaseEditRedirect /></PermissionGate></ModuleGate>} />
                        <Route path="/purchase-orders" element={<ModuleGate module="purchases"><PermissionGate module="purchases" action="view"><PurchaseOrders /></PermissionGate></ModuleGate>} />
                        <Route path="/purchase-orders/add" element={<ModuleGate module="purchases"><PermissionGate module="purchases" action="create"><PurchaseOrderAdd /></PermissionGate></ModuleGate>} />
                        <Route path="/purchases/returns" element={<ModuleGate module="purchases"><PlaceholderPage title="Purchase Returns" /></ModuleGate>} />
                        <Route path="/customers" element={<ModuleGate module="contacts"><PermissionGate module="contacts" action="view"><Customers /></PermissionGate></ModuleGate>} />
                        <Route path="/customers/add" element={<ModuleGate module="contacts"><PermissionGate module="contacts" action="create"><CustomerAdd /></PermissionGate></ModuleGate>} />
                        <Route path="/customers/:id/edit" element={<ModuleGate module="contacts"><PermissionGate module="contacts" action="edit"><CustomerAdd /></PermissionGate></ModuleGate>} />
                        <Route path="/customers/:id" element={<ModuleGate module="contacts"><PermissionGate module="contacts" action="view"><ContactProfile kind="customer" /></PermissionGate></ModuleGate>} />
                        <Route path="/suppliers" element={<ModuleGate module="contacts"><PermissionGate module="contacts" action="view"><Suppliers /></PermissionGate></ModuleGate>} />
                        <Route path="/suppliers/:id" element={<ModuleGate module="contacts"><PermissionGate module="contacts" action="view"><ContactProfile kind="supplier" /></PermissionGate></ModuleGate>} />
                        <Route path="/accounts" element={<ModuleGate module="accounting"><ChartOfAccounts /></ModuleGate>} />
                        <Route path="/transactions" element={<ModuleGate module="accounting"><Transactions /></ModuleGate>} />
                        <Route path="/journal" element={<ModuleGate module="accounting"><JournalEntries /></ModuleGate>} />
                        <Route path="/trial-balance" element={<ModuleGate module="accounting"><TrialBalance /></ModuleGate>} />
                        <Route path="/cash-flow" element={<ModuleGate module="accounting"><CashFlow /></ModuleGate>} />
                        <Route path="/account-list" element={<ModuleGate module="accounting"><PlaceholderPage title="Account List" /></ModuleGate>} />
                        <Route path="/employees" element={<ModuleGate module="hrm"><Employees /></ModuleGate>} />
                        <Route path="/attendance" element={<ModuleGate module="hrm"><Attendance /></ModuleGate>} />
                        <Route path="/leave" element={<ModuleGate module="hrm"><LeaveManagement /></ModuleGate>} />
                        <Route path="/payroll" element={<ModuleGate module="hrm"><PayrollPage /></ModuleGate>} />
                        <Route path="/warranty-claims" element={<ModuleGate module="warranty"><WarrantyClaims /></ModuleGate>} />
                        <Route path="/warranty-checking" element={<ModuleGate module="warranty"><WarrantyChecking /></ModuleGate>} />

                        <Route path="/exchange" element={<ModuleGate module="exchange"><Exchange /></ModuleGate>} />
                        <Route path="/exchange/purchases" element={<ModuleGate module="exchange"><ExchangePurchases /></ModuleGate>} />
                        <Route path="/exchange/purchases/add" element={<ModuleGate module="exchange"><ExchangePurchaseAdd /></ModuleGate>} />
                        <Route path="/exchange/purchases/:id" element={<ModuleGate module="exchange"><ExchangePurchaseView /></ModuleGate>} />
                        <Route path="/exchange/agreement/:id" element={<ModuleGate module="exchange"><ExchangeAgreement /></ModuleGate>} />
                        <Route path="/exchange/sell" element={<ModuleGate module="exchange"><ExchangeSell /></ModuleGate>} />
                        <Route path="/reports" element={<ModuleGate module="reports"><Reports /></ModuleGate>} />
                        <Route path="/reports/profit-loss" element={<ModuleGate module="reports"><ProfitLossReport /></ModuleGate>} />
                        <Route path="/reports/stock" element={<ModuleGate module="reports"><StockReport /></ModuleGate>} />
                        <Route path="/reports/tax" element={<ModuleGate module="reports"><TaxReport /></ModuleGate>} />
                        <Route path="/reports/daily-summary" element={<ModuleGate module="reports"><DailySummaryReport /></ModuleGate>} />
                        <Route path="/reports/due-sales" element={<ModuleGate module="reports"><DueSaleReport /></ModuleGate>} />
                        <Route path="/reports/product-profit" element={<ModuleGate module="reports"><ProductProfitReport /></ModuleGate>} />
                        <Route path="/reports/purchase-sale" element={<ModuleGate module="reports"><PurchaseSaleReport /></ModuleGate>} />
                        <Route path="/reports/contacts" element={<ModuleGate module="reports"><ContactsReport /></ModuleGate>} />
                        <Route path="/reports/items" element={<ModuleGate module="reports"><ItemsReport /></ModuleGate>} />
                        <Route path="/reports/trending" element={<ModuleGate module="reports"><TrendingProductsReport /></ModuleGate>} />
                        <Route path="/reports/installment" element={<ModuleGate module="reports"><InstallmentReport /></ModuleGate>} />
                        <Route path="/reports/expense" element={<ModuleGate module="reports"><ExpenseReport /></ModuleGate>} />
                        <Route path="/reports/register" element={<ModuleGate module="reports"><RegisterReport /></ModuleGate>} />
                        <Route path="/installment/customers/add" element={<ModuleGate module="installments"><InstallmentCustomerAdd /></ModuleGate>} />
                        <Route path="/installment/customers" element={<ModuleGate module="installments"><InstallmentCustomers /></ModuleGate>} />
                        <Route path="/installment/sales/add" element={<ModuleGate module="installments"><InstallmentSaleAdd /></ModuleGate>} />
                        <Route path="/installment/sales" element={<ModuleGate module="installments"><InstallmentSales /></ModuleGate>} />
                        <Route path="/installment/sales/:id" element={<ModuleGate module="installments"><InstallmentSaleView /></ModuleGate>} />
                        <Route path="/installment/collections" element={<ModuleGate module="installments"><InstallmentCollections /></ModuleGate>} />
                        <Route path="/installment/schedule" element={<ModuleGate module="installments"><InstallmentSchedule /></ModuleGate>} />
                        <Route path="/installment/agreement/:id" element={<ModuleGate module="installments"><InstallmentAgreement /></ModuleGate>} />
                        <Route path="/users" element={<PermissionGate module="users" action="view"><UsersPage /></PermissionGate>} />
                        <Route path="/roles" element={<PermissionGate module="roles" action="view"><RolesPage /></PermissionGate>} />
                        <Route path="/activity-log" element={<ActivityLogPage />} />
                        <Route path="/settings" element={<PermissionGate module="settings" action="view"><SettingsPage /></PermissionGate>} />
                        <Route path="/settings/backup" element={<TenantBackupPage />} />
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
