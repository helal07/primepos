import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import Sales from "./pages/Sales";
import Customers from "./pages/Customers";
import SettingsPage from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            {/* Products */}
            <Route path="/products" element={<Products />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/brands" element={<PlaceholderPage title="Brands" />} />
            <Route path="/units" element={<PlaceholderPage title="Units" />} />
            <Route path="/variations" element={<PlaceholderPage title="Variations" />} />
            <Route path="/warranties" element={<PlaceholderPage title="Warranties" />} />
            <Route path="/products/import" element={<PlaceholderPage title="Bulk Import" />} />
            <Route path="/products/export" element={<PlaceholderPage title="Export" />} />
            <Route path="/products/labels" element={<PlaceholderPage title="Print Labels" />} />
            {/* Sales */}
            <Route path="/pos" element={<PlaceholderPage title="Point of Sale" description="Full-screen POS terminal" />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/invoices" element={<PlaceholderPage title="Invoices" />} />
            <Route path="/sales/drafts" element={<PlaceholderPage title="Drafts" />} />
            <Route path="/quotations" element={<PlaceholderPage title="Quotations" />} />
            <Route path="/sales/returns" element={<PlaceholderPage title="Sale Returns" />} />
            <Route path="/shipments" element={<PlaceholderPage title="Shipments" />} />
            {/* Purchase */}
            <Route path="/purchases/add" element={<PlaceholderPage title="Add Purchase" />} />
            <Route path="/purchases" element={<PlaceholderPage title="Purchase List" />} />
            <Route path="/purchase-orders" element={<PlaceholderPage title="Purchase Orders" />} />
            <Route path="/purchases/returns" element={<PlaceholderPage title="Purchase Returns" />} />
            {/* People */}
            <Route path="/customers" element={<Customers />} />
            <Route path="/suppliers" element={<PlaceholderPage title="Suppliers" />} />
            {/* Finance */}
            <Route path="/accounts" element={<PlaceholderPage title="Chart of Accounts" />} />
            <Route path="/transactions" element={<PlaceholderPage title="Transactions" />} />
            <Route path="/journal" element={<PlaceholderPage title="Journal Entries" />} />
            <Route path="/trial-balance" element={<PlaceholderPage title="Trial Balance" />} />
            <Route path="/cash-flow" element={<PlaceholderPage title="Cash Flow" />} />
            <Route path="/account-list" element={<PlaceholderPage title="Account List" />} />
            {/* HRM */}
            <Route path="/employees" element={<PlaceholderPage title="Employees" />} />
            <Route path="/attendance" element={<PlaceholderPage title="Attendance" />} />
            <Route path="/leave" element={<PlaceholderPage title="Leave Management" />} />
            <Route path="/payroll" element={<PlaceholderPage title="Payroll" />} />
            {/* Warranty */}
            <Route path="/warranty-claims" element={<PlaceholderPage title="Warranty Claims" />} />
            {/* CMS */}
            <Route path="/cms/pages" element={<PlaceholderPage title="CMS Pages" />} />
            {/* Admin */}
            <Route path="/users" element={<PlaceholderPage title="Users & Roles" />} />
            <Route path="/activity-log" element={<PlaceholderPage title="Activity Log" />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
