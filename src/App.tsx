import { lazy, Suspense } from "react";
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
import LandingPage from "./pages/LandingPage";

const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Products = lazy(() => import("./pages/Products"));
const ProductAdd = lazy(() => import("./pages/ProductAdd"));
const Categories = lazy(() => import("./pages/Categories"));
const Brands = lazy(() => import("./pages/Brands"));
const SellingPriceGroups = lazy(() => import("./pages/SellingPriceGroups"));
const CustomerGroups = lazy(() => import("./pages/CustomerGroups"));
const Units = lazy(() => import("./pages/Units"));
const Variations = lazy(() => import("./pages/Variations"));
const StockAdjustments = lazy(() => import("./pages/StockAdjustments"));
const StockTransfers = lazy(() => import("./pages/StockTransfers"));
const Warehouses = lazy(() => import("./pages/Warehouses"));
const WarehouseStock = lazy(() => import("./pages/WarehouseStock"));
const Sales = lazy(() => import("./pages/Sales"));
const SaleAdd = lazy(() => import("./pages/SaleAdd"));
const SaleView = lazy(() => import("./pages/SaleView"));
const POS = lazy(() => import("./pages/POS"));
const Customers = lazy(() => import("./pages/Customers"));
const Suppliers = lazy(() => import("./pages/Suppliers"));
const ContactProfile = lazy(() => import("./pages/ContactProfile"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const ProfilePage = lazy(() => import("./pages/Profile"));
const UsersPage = lazy(() => import("./pages/Users"));
const RolesPage = lazy(() => import("./pages/Roles"));
const ActivityLogPage = lazy(() => import("./pages/ActivityLog"));
const Purchases = lazy(() => import("./pages/Purchases"));
const PurchaseAdd = lazy(() => import("./pages/PurchaseAdd"));
const PurchaseView = lazy(() => import("./pages/PurchaseView"));
const PurchaseOrders = lazy(() => import("./pages/PurchaseOrders"));
const ChartOfAccounts = lazy(() => import("./pages/ChartOfAccounts"));
const Transactions = lazy(() => import("./pages/Transactions"));
const JournalEntries = lazy(() => import("./pages/JournalEntries"));
const TrialBalance = lazy(() => import("./pages/TrialBalance"));
const CashFlow = lazy(() => import("./pages/CashFlow"));
const Employees = lazy(() => import("./pages/Employees"));
const Attendance = lazy(() => import("./pages/Attendance"));
const LeaveManagement = lazy(() => import("./pages/LeaveManagement"));
const PayrollPage = lazy(() => import("./pages/Payroll"));
const WarrantyClaims = lazy(() => import("./pages/WarrantyClaims"));
const CmsPages = lazy(() => import("./pages/CmsPages"));
const Exchange = lazy(() => import("./pages/Exchange"));
const ExchangePurchases = lazy(() => import("./pages/ExchangePurchases"));
const ExchangePurchaseAdd = lazy(() => import("./pages/ExchangePurchaseAdd"));
const ExchangePurchaseView = lazy(() => import("./pages/ExchangePurchaseView"));
const ExchangeAgreement = lazy(() => import("./pages/ExchangeAgreement"));
const ExchangeSell = lazy(() => import("./pages/ExchangeSell"));
const Reports = lazy(() => import("./pages/Reports"));
const ProfitLossReport = lazy(() => import("./pages/reports/ProfitLossReport"));
const StockReport = lazy(() => import("./pages/reports/StockReport"));
const TaxReport = lazy(() => import("./pages/reports/TaxReport"));
const DailySummaryReport = lazy(() => import("./pages/reports/DailySummaryReport"));
const DueSaleReport = lazy(() => import("./pages/reports/DueSaleReport"));
const ProductProfitReport = lazy(() => import("./pages/reports/ProductProfitReport"));
const PurchaseSaleReport = lazy(() => import("./pages/reports/PurchaseSaleReport"));
const ContactsReport = lazy(() => import("./pages/reports/ContactsReport"));
const ItemsReport = lazy(() => import("./pages/reports/ItemsReport"));
const TrendingProductsReport = lazy(() => import("./pages/reports/TrendingProductsReport"));
const InstallmentReport = lazy(() => import("./pages/reports/InstallmentReport"));
const ExpenseReport = lazy(() => import("./pages/reports/ExpenseReport"));
const RegisterReport = lazy(() => import("./pages/reports/RegisterReport"));
const InstallmentCustomerAdd = lazy(() => import("./pages/InstallmentCustomerAdd"));
const InstallmentCustomers = lazy(() => import("./pages/InstallmentCustomers"));
const InstallmentSaleAdd = lazy(() => import("./pages/InstallmentSaleAdd"));
const InstallmentSales = lazy(() => import("./pages/InstallmentSales"));
const InstallmentCollections = lazy(() => import("./pages/InstallmentCollections"));
const InstallmentSchedule = lazy(() => import("./pages/InstallmentSchedule"));
const InstallmentAgreement = lazy(() => import("./pages/InstallmentAgreement"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const TenantManagement = lazy(() => import("./pages/admin/TenantManagement"));
const PackageManagement = lazy(() => import("./pages/admin/PackageManagement"));
const LandingCms = lazy(() => import("./pages/admin/LandingCms"));
const AdminTransactions = lazy(() => import("./pages/admin/AdminTransactions"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const TenantDetail = lazy(() => import("./pages/admin/TenantDetail"));
const Sitemap = lazy(() => import("./pages/admin/Sitemap"));
const SmsProviders = lazy(() => import("./pages/admin/SmsProviders"));
const SmsPlans = lazy(() => import("./pages/admin/SmsPlans"));
const SmsPurchases = lazy(() => import("./pages/admin/SmsPurchases"));
const NotFound = lazy(() => import("./pages/NotFound"));

const SaleEditRedirect = () => { const { id } = useParams(); return <Navigate to={`/sales/add?edit=${id}`} replace />; };
const PurchaseEditRedirect = () => { const { id } = useParams(); return <Navigate to={`/purchases/add?edit=${id}`} replace />; };

const queryClient = new QueryClient();

const RouteFallback = () => <div className="flex items-center justify-center p-8 text-muted-foreground">Loading…</div>;

const SuperadminRoutes = () => (
  <ProtectedRoute>
    <SuperadminRoute>
      <AdminLayout>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route index element={<AdminDashboard />} />
            <Route path="tenants" element={<TenantManagement />} />
            <Route path="tenants/:id" element={<TenantDetail />} />
            <Route path="packages" element={<PackageManagement />} />
            <Route path="cms" element={<LandingCms />} />
            <Route path="sitemap" element={<Sitemap />} />
            <Route path="sms/providers" element={<SmsProviders />} />
            <Route path="sms/plans" element={<SmsPlans />} />
            <Route path="sms/purchases" element={<SmsPurchases />} />
            <Route path="transactions" element={<AdminTransactions />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AdminLayout>
    </SuperadminRoute>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Suspense fallback={<RouteFallback />}><Login /></Suspense>} />
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
                        <Route path="/products" element={<Products />} />
                        <Route path="/products/add" element={<ProductAdd />} />
                        <Route path="/products/edit/:id" element={<ProductAdd />} />
                        <Route path="/categories" element={<Categories />} />
                        <Route path="/brands" element={<Brands />} />
                        <Route path="/products/price-groups" element={<SellingPriceGroups />} />
                        <Route path="/contacts/customer-groups" element={<CustomerGroups />} />
                        <Route path="/units" element={<Units />} />
                        <Route path="/variations" element={<Variations />} />
                        <Route path="/stock-adjustments" element={<StockAdjustments />} />
                        <Route path="/stock-transfers" element={<StockTransfers />} />
                        <Route path="/warehouses" element={<ModuleGate module="warehouses"><Warehouses /></ModuleGate>} />
                        <Route path="/warehouses/stock" element={<ModuleGate module="warehouses"><WarehouseStock /></ModuleGate>} />
                        <Route path="/warranties" element={<PlaceholderPage title="Warranties" />} />
                        <Route path="/products/import" element={<PlaceholderPage title="Bulk Import" />} />
                        <Route path="/products/export" element={<PlaceholderPage title="Export" />} />
                        <Route path="/products/labels" element={<PlaceholderPage title="Print Labels" />} />
                        <Route path="/pos" element={<POS />} />
                        <Route path="/sales" element={<Sales />} />
                        <Route path="/sales/add" element={<SaleAdd />} />
                        <Route path="/sales/:id" element={<SaleView />} />
                        <Route path="/sales/:id/edit" element={<SaleEditRedirect />} />
                        <Route path="/sales/orders" element={
                          <Sales defaultStatus="order" title="Sales Orders" description="Pending orders waiting to be invoiced" hideStatusFilter addLabel="Add Order" addPath="/sales/add?status=order" />
                        } />
                        <Route path="/invoices" element={
                          <Sales defaultStatus="completed" title="Invoices" description="All completed sale invoices" hideStatusFilter />
                        } />
                        <Route path="/sales/drafts" element={
                          <Sales defaultStatus="draft" title="Drafts" description="Draft sales" hideStatusFilter addLabel="Add Draft" />
                        } />
                        <Route path="/quotations" element={
                          <Sales defaultStatus="quotation" title="Quotations" description="Customer quotations" hideStatusFilter addLabel="Add Quotation" addPath="/sales/add?status=quotation" />
                        } />
                        <Route path="/sales/returns" element={
                          <Sales defaultStatus="returned" title="Sale Returns" description="Returned sales" hideStatusFilter />
                        } />
                        <Route path="/shipments" element={<PlaceholderPage title="Shipments" />} />
                        <Route path="/purchases/add" element={<PurchaseAdd />} />
                        <Route path="/purchases" element={<Purchases />} />
                        <Route path="/purchases/:id" element={<PurchaseView />} />
                        <Route path="/purchases/:id/edit" element={<PurchaseEditRedirect />} />
                        <Route path="/purchase-orders" element={<PurchaseOrders />} />
                        <Route path="/purchases/returns" element={<PlaceholderPage title="Purchase Returns" />} />
                        <Route path="/customers" element={<Customers />} />
                        <Route path="/customers/:id" element={<ContactProfile kind="customer" />} />
                        <Route path="/suppliers" element={<Suppliers />} />
                        <Route path="/suppliers/:id" element={<ContactProfile kind="supplier" />} />
                        <Route path="/accounts" element={<ChartOfAccounts />} />
                        <Route path="/transactions" element={<Transactions />} />
                        <Route path="/journal" element={<JournalEntries />} />
                        <Route path="/trial-balance" element={<TrialBalance />} />
                        <Route path="/cash-flow" element={<CashFlow />} />
                        <Route path="/account-list" element={<PlaceholderPage title="Account List" />} />
                        <Route path="/employees" element={<Employees />} />
                        <Route path="/attendance" element={<Attendance />} />
                        <Route path="/leave" element={<LeaveManagement />} />
                        <Route path="/payroll" element={<PayrollPage />} />
                        <Route path="/warranty-claims" element={<WarrantyClaims />} />
                        <Route path="/cms/pages" element={<CmsPages />} />
                        <Route path="/exchange" element={<ModuleGate module="exchange"><Exchange /></ModuleGate>} />
                        <Route path="/exchange/purchases" element={<ModuleGate module="exchange"><ExchangePurchases /></ModuleGate>} />
                        <Route path="/exchange/purchases/add" element={<ModuleGate module="exchange"><ExchangePurchaseAdd /></ModuleGate>} />
                        <Route path="/exchange/purchases/:id" element={<ModuleGate module="exchange"><ExchangePurchaseView /></ModuleGate>} />
                        <Route path="/exchange/agreement/:id" element={<ModuleGate module="exchange"><ExchangeAgreement /></ModuleGate>} />
                        <Route path="/exchange/sell" element={<ModuleGate module="exchange"><ExchangeSell /></ModuleGate>} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/reports/profit-loss" element={<ProfitLossReport />} />
                        <Route path="/reports/stock" element={<StockReport />} />
                        <Route path="/reports/tax" element={<TaxReport />} />
                        <Route path="/reports/daily-summary" element={<DailySummaryReport />} />
                        <Route path="/reports/due-sales" element={<DueSaleReport />} />
                        <Route path="/reports/product-profit" element={<ProductProfitReport />} />
                        <Route path="/reports/purchase-sale" element={<PurchaseSaleReport />} />
                        <Route path="/reports/contacts" element={<ContactsReport />} />
                        <Route path="/reports/items" element={<ItemsReport />} />
                        <Route path="/reports/trending" element={<TrendingProductsReport />} />
                        <Route path="/reports/installment" element={<InstallmentReport />} />
                        <Route path="/reports/expense" element={<ExpenseReport />} />
                        <Route path="/reports/register" element={<RegisterReport />} />
                        <Route path="/installment/customers/add" element={<InstallmentCustomerAdd />} />
                        <Route path="/installment/customers" element={<InstallmentCustomers />} />
                        <Route path="/installment/sales/add" element={<InstallmentSaleAdd />} />
                        <Route path="/installment/sales" element={<InstallmentSales />} />
                        <Route path="/installment/collections" element={<InstallmentCollections />} />
                        <Route path="/installment/schedule" element={<InstallmentSchedule />} />
                        <Route path="/installment/agreement/:id" element={<InstallmentAgreement />} />
                        <Route path="/users" element={<UsersPage />} />
                        <Route path="/roles" element={<RolesPage />} />
                        <Route path="/activity-log" element={<ActivityLogPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
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
