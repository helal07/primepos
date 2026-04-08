import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import Login from "./pages/Login";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import Brands from "./pages/Brands";
import Units from "./pages/Units";
import Variations from "./pages/Variations";
import StockAdjustments from "./pages/StockAdjustments";
import StockTransfers from "./pages/StockTransfers";
import Sales from "./pages/Sales";
import SaleAdd from "./pages/SaleAdd";
import POS from "./pages/POS";
import Customers from "./pages/Customers";
import Suppliers from "./pages/Suppliers";
import SettingsPage from "./pages/Settings";
import UsersPage from "./pages/Users";
import RolesPage from "./pages/Roles";
import ActivityLogPage from "./pages/ActivityLog";
import Purchases from "./pages/Purchases";
import PurchaseAdd from "./pages/PurchaseAdd";
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
import NotFound from "./pages/NotFound";

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
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Routes>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/products" element={<Products />} />
                      <Route path="/categories" element={<Categories />} />
                      <Route path="/brands" element={<Brands />} />
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
                      <Route path="/invoices" element={<PlaceholderPage title="Invoices" />} />
                      <Route path="/sales/drafts" element={<PlaceholderPage title="Drafts" />} />
                      <Route path="/quotations" element={<PlaceholderPage title="Quotations" />} />
                      <Route path="/sales/returns" element={<PlaceholderPage title="Sale Returns" />} />
                      <Route path="/shipments" element={<PlaceholderPage title="Shipments" />} />
                      <Route path="/purchases/add" element={<PurchaseAdd />} />
                      <Route path="/purchases" element={<Purchases />} />
                      <Route path="/purchase-orders" element={<PurchaseOrders />} />
                      <Route path="/purchases/returns" element={<PlaceholderPage title="Purchase Returns" />} />
                      <Route path="/customers" element={<Customers />} />
                      <Route path="/suppliers" element={<Suppliers />} />
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
                      <Route path="/warranty-claims" element={<PlaceholderPage title="Warranty Claims" />} />
                      <Route path="/cms/pages" element={<PlaceholderPage title="CMS Pages" />} />
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
