import React, { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isAdminRole } from '@/lib/permissions';
import AppLayout from '@/layouts/AppLayout';
import AuthLayout from '@/layouts/AuthLayout';
import LoadingSpinner from '@/components/ui/loading-spinner';
import UnitsListPage from '@/modules/units/UnitsListPage';

const LoginPage = React.lazy(() => import('@/pages/LoginPage'));
const SignupPage = React.lazy(() => import('@/pages/SignupPage'));
const ForgotPasswordPage = React.lazy(() => import('@/pages/ForgotPasswordPage'));
const DashboardPage = React.lazy(() => import('@/modules/dashboard/DashboardPage'));
const ProductWorkspacePage = React.lazy(() => import('@/modules/products/ProductWorkspacePage'));
const ProductListPage = React.lazy(() => import('@/modules/products/ProductListPage'));
const ProductFormPage = React.lazy(() => import('@/modules/products/ProductFormPage'));
const ProductDetailPage = React.lazy(() => import('@/modules/products/ProductDetailPage'));
const CategoryListPage = React.lazy(() => import('@/modules/categories/CategoryListPage'));
const BrandListPage = React.lazy(() => import('@/modules/categories/BrandListPage'));
const CustomerListPage = React.lazy(() => import('@/modules/customers/CustomerListPage'));
const CustomerFormPage = React.lazy(() => import('@/modules/customers/CustomerFormPage'));
const CustomerDetailPage = React.lazy(() => import('@/modules/customers/CustomerDetailPage'));
const CustomerLedgerPage = React.lazy(() => import('@/modules/customers/CustomerLedgerPage'));
const SupplierListPage = React.lazy(() => import('@/modules/suppliers/SupplierListPage'));
const SupplierFormPage = React.lazy(() => import('@/modules/suppliers/SupplierFormPage'));
const SupplierDetailPage = React.lazy(() => import('@/modules/suppliers/SupplierDetailPage'));
const SupplierLedgerPage = React.lazy(() => import('@/modules/suppliers/SupplierLedgerPage'));
const SalesListPage = React.lazy(() => import('@/modules/sales/SalesListPage'));
const SalesFormPage = React.lazy(() => import('@/modules/sales/SalesFormPage'));
const QuotationListPage = React.lazy(() => import('@/modules/quotations/QuotationListPage'));
const QuotationFormPage = React.lazy(() => import('@/modules/quotations/QuotationFormPage'));
const PurchaseOrderListPage = React.lazy(() => import('@/modules/purchase-orders/PurchaseOrderListPage'));
const PurchaseOrderFormPage = React.lazy(() => import('@/modules/purchase-orders/PurchaseOrderFormPage'));
const PurchaseListPage = React.lazy(() => import('@/modules/purchase/PurchaseListPage'));
const PurchaseFormPage = React.lazy(() => import('@/modules/purchase/PurchaseFormPage'));
const ProformaInvoiceListPage = React.lazy(() => import('@/modules/proforma-invoices/ProformaInvoiceListPage'));
const ProformaInvoiceFormPage = React.lazy(() => import('@/modules/proforma-invoices/ProformaInvoiceFormPage'));
const StockOverviewPage = React.lazy(() => import('@/modules/stock/StockOverviewPage'));
const StockMovementPage = React.lazy(() => import('@/modules/stock/StockMovementPage'));
const StockAdjustmentPage = React.lazy(() => import('@/modules/stock/StockAdjustmentPage'));
const StockTransferPage = React.lazy(() => import('@/modules/stock/StockTransferPage'));
const LowStockPage = React.lazy(() => import('@/modules/stock/LowStockPage'));
const ReorderPage = React.lazy(() => import('@/modules/stock/ReorderPage'));
const PaymentsReceivedPage = React.lazy(() => import('@/modules/payments/PaymentsReceivedPage'));
const PaymentsMadePage = React.lazy(() => import('@/modules/payments/PaymentsMadePage'));
const CustomerLedgerReport = React.lazy(() => import('@/modules/ledgers/CustomerLedgerPage'));
const SupplierLedgerReport = React.lazy(() => import('@/modules/ledgers/SupplierLedgerPage'));
const ReportsListPage = React.lazy(() => import('@/modules/reports/ReportsListPage'));
const SalesReportPage = React.lazy(() => import('@/modules/reports/SalesReportPage'));
const PurchaseReportPage = React.lazy(() => import('@/modules/reports/PurchaseReportPage'));
const StockReportPage = React.lazy(() => import('@/modules/reports/StockReportPage'));
const CustomerReportPage = React.lazy(() => import('@/modules/reports/CustomerReportPage'));
const SupplierReportPage = React.lazy(() => import('@/modules/reports/SupplierReportPage'));
const GSTReportPage = React.lazy(() => import('@/modules/reports/GSTReportPage'));
const UserListPage = React.lazy(() => import('@/modules/users/UserListPage'));
const SettingsPage = React.lazy(() => import('@/modules/settings/SettingsPage'));
const CompanySettingsPage = React.lazy(() => import('@/modules/settings/CompanySettingsPage'));
const ThemesPage = React.lazy(() => import('@/modules/themes/ThemesPage'));
const BackupPage = React.lazy(() => import('@/modules/backup/BackupPage'));
const NotFoundPage = React.lazy(() => import('@/pages/NotFoundPage'));
const UnauthorizedPage = React.lazy(() => import('@/pages/UnauthorizedPage'));

function Loader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <LoadingSpinner size="lg" text="Loading..." />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  if (loading) return <Loader />;
  if (!isAdminRole(profile?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return <>{children}</>;
}


export default function AppRoutes() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/login" element={<AuthLayout><LoginPage /></AuthLayout>} />
        <Route path="/signup" element={<AuthLayout><SignupPage /></AuthLayout>} />
        <Route path="/forgot-password" element={<AuthLayout><ForgotPasswordPage /></AuthLayout>} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />

          {/* Product Management workspace: the single catalog entry point.
              `?tab=products|categories|brands|units` selects the active tab. */}
          <Route path="products" element={<ProductWorkspacePage />} />
          <Route path="products/new" element={<ProductFormPage />} />
          <Route path="products/:id" element={<ProductDetailPage />} />
          <Route path="products/:id/edit" element={<ProductFormPage />} />
          {/* Standalone master-data pages, kept so existing deep links keep
              working. They render the same panels embedded in the workspace. */}
          <Route path="products/list" element={<ProductListPage />} />
          <Route path="categories" element={<CategoryListPage />} />
          <Route path="brands" element={<BrandListPage />} />
          <Route path="units" element={<UnitsListPage />} />

          <Route path="customers" element={<CustomerListPage />} />
          <Route path="customers/new" element={<CustomerFormPage />} />
          <Route path="customers/:id" element={<CustomerDetailPage />} />
          <Route path="customers/:id/edit" element={<CustomerFormPage />} />
          <Route path="customers/:id/ledger" element={<CustomerLedgerPage />} />

          <Route path="suppliers" element={<SupplierListPage />} />
          <Route path="suppliers/new" element={<SupplierFormPage />} />
          <Route path="suppliers/:id" element={<SupplierDetailPage />} />
          <Route path="suppliers/:id/edit" element={<SupplierFormPage />} />
          <Route path="suppliers/:id/ledger" element={<SupplierLedgerPage />} />

          <Route path="transactions/sales" element={<SalesListPage />} />
          <Route path="transactions/sales/new" element={<SalesFormPage />} />
          <Route path="transactions/sales/:id/edit" element={<SalesFormPage />} />
          {/* Legacy sales paths used by the sales list and older bookmarks.
              Row clicks open the shared billing form (there is no separate
              detail page for a document). */}
          <Route path="sales" element={<SalesListPage />} />
          <Route path="sales/new" element={<SalesFormPage />} />
          <Route path="sales/:id" element={<SalesFormPage />} />
          <Route path="sales/:id/edit" element={<SalesFormPage />} />
          <Route path="quotations" element={<QuotationListPage />} />
          <Route path="quotations/new" element={<QuotationFormPage />} />
          <Route path="quotations/:id" element={<QuotationFormPage />} />
          <Route path="quotations/:id/edit" element={<QuotationFormPage />} />
          <Route path="purchase-orders" element={<PurchaseOrderListPage />} />
          <Route path="purchase-orders/new" element={<PurchaseOrderFormPage />} />
          <Route path="purchase-orders/:id/edit" element={<PurchaseOrderFormPage />} />
          <Route path="purchase" element={<PurchaseListPage />} />
          <Route path="purchase/new" element={<PurchaseFormPage />} />
          <Route path="purchase/:id" element={<PurchaseFormPage />} />
          <Route path="purchase/:id/edit" element={<PurchaseFormPage />} />
          <Route path="proforma-invoices" element={<ProformaInvoiceListPage />} />
          <Route path="proforma-invoices/new" element={<ProformaInvoiceFormPage />} />
          <Route path="proforma-invoices/:id" element={<ProformaInvoiceFormPage />} />
          <Route path="proforma-invoices/:id/edit" element={<ProformaInvoiceFormPage />} />

          <Route path="stock" element={<StockOverviewPage />} />
          <Route path="stock/movements" element={<StockMovementPage />} />
          <Route path="stock/adjustment" element={<StockAdjustmentPage />} />
          <Route path="stock/transfer" element={<StockTransferPage />} />
          <Route path="stock/low-stock" element={<LowStockPage />} />
          <Route path="stock/reorder" element={<ReorderPage />} />

          <Route path="payments/received" element={<PaymentsReceivedPage />} />
          <Route path="payments/made" element={<PaymentsMadePage />} />
          <Route path="ledgers/customer" element={<CustomerLedgerReport />} />
          <Route path="ledgers/supplier" element={<SupplierLedgerReport />} />

          <Route path="reports" element={<ReportsListPage />} />
          <Route path="reports/sales" element={<SalesReportPage />} />
          <Route path="reports/purchases" element={<PurchaseReportPage />} />
          <Route path="reports/stock" element={<StockReportPage />} />
          <Route path="reports/customers" element={<CustomerReportPage />} />
          <Route path="reports/suppliers" element={<SupplierReportPage />} />
          <Route path="reports/gst" element={<GSTReportPage />} />

          <Route path="users" element={<AdminRoute><UserListPage /></AdminRoute>} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="settings/company" element={<CompanySettingsPage />} />
          <Route path="themes" element={<ThemesPage />} />
          <Route path="backup" element={<BackupPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
