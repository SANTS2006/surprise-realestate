import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { ProtectedRoute } from './components/auth/ProtectedRoute.jsx';
import { DashboardLayout } from './layouts/DashboardLayout.jsx';
import StatusPage from './pages/StatusPage.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import RegisterPage from './pages/auth/RegisterPage.jsx';
import CheckEmailPage from './pages/auth/CheckEmailPage.jsx';
import VerifyEmailPage from './pages/auth/VerifyEmailPage.jsx';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/auth/ResetPasswordPage.jsx';
import HomePage from './pages/HomePage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import PropertiesListPage from './pages/properties/PropertiesListPage.jsx';
import PropertyDetailPage from './pages/properties/PropertyDetailPage.jsx';
import TenantsListPage from './pages/tenants/TenantsListPage.jsx';
import OwnersListPage from './pages/owners/OwnersListPage.jsx';
import LeasesListPage from './pages/leases/LeasesListPage.jsx';
import MyLeasePage from './pages/leases/MyLeasePage.jsx';
import InvoicesListPage from './pages/finance/InvoicesListPage.jsx';
import PaymentsListPage from './pages/finance/PaymentsListPage.jsx';
import ExpensesListPage from './pages/finance/ExpensesListPage.jsx';
import MyPaymentsPage from './pages/finance/MyPaymentsPage.jsx';
import MaintenanceRequestsListPage from './pages/maintenance/MaintenanceRequestsListPage.jsx';
import MaintenanceRequestDetailPage from './pages/maintenance/MaintenanceRequestDetailPage.jsx';
import WorkOrdersListPage from './pages/maintenance/WorkOrdersListPage.jsx';
import VendorsListPage from './pages/vendors/VendorsListPage.jsx';
import InspectionsListPage from './pages/inspections/InspectionsListPage.jsx';
import InspectionDetailPage from './pages/inspections/InspectionDetailPage.jsx';
import UsersRolesPage from './pages/users/UsersRolesPage.jsx';
import RoleDetailPage from './pages/roles/RoleDetailPage.jsx';
import SettingsPage from './pages/settings/SettingsPage.jsx';
import ReportsPage from './pages/reports/ReportsPage.jsx';
import NotificationsPage from './pages/notifications/NotificationsPage.jsx';
import AuditLogsPage from './pages/audit/AuditLogsPage.jsx';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace/>} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/check-email" element={<CheckEmailPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/set-password" element={<ResetPasswordPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/properties" element={<PropertiesListPage />} />
            <Route path="/properties/:id" element={<PropertyDetailPage />} />
            <Route path="/tenants" element={<TenantsListPage />} />
            <Route path="/owners" element={<OwnersListPage />} />
            <Route path="/leases" element={<LeasesListPage />} />
            <Route path="/my-lease" element={<MyLeasePage />} />
            <Route path="/invoices" element={<InvoicesListPage />} />
            <Route path="/payments" element={<PaymentsListPage />} />
            <Route path="/expenses" element={<ExpensesListPage />} />
            <Route path="/my-payments" element={<MyPaymentsPage />} />
            <Route path="/maintenance" element={<MaintenanceRequestsListPage />} />
            <Route path="/maintenance/:id" element={<MaintenanceRequestDetailPage />} />
            <Route path="/work-orders" element={<WorkOrdersListPage />} />
            <Route path="/vendors" element={<VendorsListPage />} />
            <Route path="/inspections" element={<InspectionsListPage />} />
            <Route path="/inspections/:id" element={<InspectionDetailPage />} />
            <Route path="/users" element={<UsersRolesPage />} />
            <Route path="/roles/:id" element={<RoleDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/reports/financial" element={<ReportsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/audit-logs" element={<AuditLogsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </AuthProvider>
  );
}
