import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useParams } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SuperadminRoute } from "@/components/admin/SuperadminRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AppLayout } from "@/components/layout/AppLayout";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import Login from "./pages/Login";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import ProductAdd from "./pages/ProductAdd";
import Categories from "./pages/Categories";
import Brands from "./pages/Brands";
import SellingPriceGroups from "./pages/SellingPriceGroups";
import CustomerGroups from "./pages/CustomerGroups";
import Units from "./pages/Units";
import Variations from "./pages/Variations";
import StockAdjustments from "./pages/StockAdjustments";
import StockTransfers from "./pages/StockTransfers";
import Sales from "./pages/Sales";
import SaleAdd from "./pages/SaleAdd";
import SaleView from "./pages/SaleView";
import POS from "./pages/POS";
import Customers from "./pages/Customers";
import Suppliers from "./pages/Suppliers";
import ContactProfile from "./pages/ContactProfile";
import SettingsPage from "./pages/Settings";
import UsersPage from "./pages/Users";
import RolesPage from "./pages/Roles";
import ActivityLogPage from "./pages/ActivityLog";
import Purchases from "./pages/Purchases";
import PurchaseAdd from "./pages/PurchaseAdd";
import PurchaseView from "./pages/PurchaseView";
import PurchaseOrders from "./pages/PurchaseOrders";
import ChartOfAccounts from "./pages/ChartOfAccounts";
import Transactions from "./pages/Transactions";
import JournalEntries from "./pages/JournalEntries";
import TrialBalance from "./pages/TrialBalance";
import CashFlow from "./pages/CashFlow";
import Employees from "./pages/Employees";
import Attendance from "./pages/Attendance";
import LeaveManagement from "./pages/LeaveManagement";
import PayrollPage from "./pages/Payroll";
import WarrantyClaims from "./pages/WarrantyClaims";
import CmsPages from "./pages/CmsPages";
import Exchange from "./pages/Exchange";
import ExchangePurchases from "./pages/ExchangePurchases";
import ExchangePurchaseAdd from "./pages/ExchangePurchaseAdd";
import ExchangePurchaseView from "./pages/ExchangePurchaseView";
import ExchangeAgreement from "./pages/ExchangeAgreement";
import ExchangeSell from "./pages/ExchangeSell";
import { ModuleGate } from "@/components/ModuleGate";
import Reports from "./pages/Reports";
import ProfitLossReport from "./pages/reports/ProfitLossReport";
import StockReport from "./pages/reports/StockReport";
import TaxReport from "./pages/reports/TaxReport";
import DailySummaryReport from "./pages/reports/DailySummaryReport";
import DueSaleReport from "./pages/reports/DueSaleReport";
import ProductProfitReport from "./pages/reports/ProductProfitReport";
import PurchaseSaleReport from "./pages/reports/PurchaseSaleReport";
import ContactsReport from "./pages/reports/ContactsReport";
import ItemsReport from "./pages/reports/ItemsReport";
import TrendingProductsReport from "./pages/reports/TrendingProductsReport";
import InstallmentReport from "./pages/reports/InstallmentReport";
import ExpenseReport from "./pages/reports/ExpenseReport";
import RegisterReport from "./pages/reports/RegisterReport";
import InstallmentCustomerAdd from "./pages/InstallmentCustomerAdd";
import InstallmentCustomers from "./pages/InstallmentCustomers";
import InstallmentSaleAdd from "./pages/InstallmentSaleAdd";
import InstallmentSales from "./pages/InstallmentSales";
import InstallmentCollections from "./pages/InstallmentCollections";
import InstallmentSchedule from "./pages/InstallmentSchedule";
import InstallmentAgreement from "./pages/InstallmentAgreement";
import AdminDashboard from "./pages/admin/AdminDashboard";
import TenantManagement from "./pages/admin/TenantManagement";
import PackageManagement from "./pages/admin/PackageManagement";
import LandingCms from "./pages/admin/LandingCms";
import AdminTransactions from "./pages/admin/AdminTransactions";
import AdminSettings from "./pages/admin/AdminSettings";
import NotFound from "./pages/NotFound";

const SaleEditRedirect = () => { const { id } = useParams(); return <Navigate to={`/sales/add?edit=${id}`} replace />; };
const PurchaseEditRedirect = () => { const { id } = useParams(); return <Navigate to={`/purchases/add?edit=${id}`} replace />; };

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            {/* SaaS Admin — separate layout */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute>
                  <SuperadminRoute>
                    <AdminLayout>
                      <Routes>
                        <Route path="/" element={<AdminDashboard />} />
                        <Route path="/tenants" element={<TenantManagement />} />
                        <Route path="/packages" element={<PackageManagement />} />
                        <Route path="/cms" element={<LandingCms />} />
                        <Route path="/transactions" element={<AdminTransactions />} />
                        <Route path="/settings" element={<AdminSettings />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </AdminLayout>
                  </SuperadminRoute>
                </ProtectedRoute>
              }
            />
            {/* Tenant routes */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppLayout>
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
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
