import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { ProtectedRoute } from './components/auth/ProtectedRoute.jsx';
import { DashboardLayout } from './layouts/DashboardLayout.jsx';
import { LoadingState } from './components/ui/Spinner.jsx';
import StatusPage from './pages/StatusPage.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import RegisterPage from './pages/auth/RegisterPage.jsx';
import CheckEmailPage from './pages/auth/CheckEmailPage.jsx';
import VerifyEmailPage from './pages/auth/VerifyEmailPage.jsx';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/auth/ResetPasswordPage.jsx';

// Every authenticated page is lazy-loaded — the auth screens above stay
// eager since they're on the critical path for every first visit, but
// nothing past the login wall should be in that initial bundle.
const HomePage = lazy(() => import('./pages/HomePage.jsx'));
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));
const PropertiesListPage = lazy(() => import('./pages/properties/PropertiesListPage.jsx'));
const PropertyDetailPage = lazy(() => import('./pages/properties/PropertyDetailPage.jsx'));
const TenantsListPage = lazy(() => import('./pages/tenants/TenantsListPage.jsx'));
const MessageManagerPage = lazy(() => import('./pages/tenants/MessageManagerPage.jsx'));
const TenantMessagesInboxPage = lazy(() => import('./pages/tenants/TenantMessagesInboxPage.jsx'));
const OwnersListPage = lazy(() => import('./pages/owners/OwnersListPage.jsx'));
const LeasesListPage = lazy(() => import('./pages/leases/LeasesListPage.jsx'));
const MyLeasePage = lazy(() => import('./pages/leases/MyLeasePage.jsx'));
const InvoicesListPage = lazy(() => import('./pages/finance/InvoicesListPage.jsx'));
const PaymentsListPage = lazy(() => import('./pages/finance/PaymentsListPage.jsx'));
const ExpensesListPage = lazy(() => import('./pages/finance/ExpensesListPage.jsx'));
const MyPaymentsPage = lazy(() => import('./pages/finance/MyPaymentsPage.jsx'));
const MaintenanceRequestsListPage = lazy(() => import('./pages/maintenance/MaintenanceRequestsListPage.jsx'));
const MaintenanceRequestDetailPage = lazy(() => import('./pages/maintenance/MaintenanceRequestDetailPage.jsx'));
const WorkOrdersListPage = lazy(() => import('./pages/maintenance/WorkOrdersListPage.jsx'));
const VendorsListPage = lazy(() => import('./pages/vendors/VendorsListPage.jsx'));
const InspectionsListPage = lazy(() => import('./pages/inspections/InspectionsListPage.jsx'));
const InspectionDetailPage = lazy(() => import('./pages/inspections/InspectionDetailPage.jsx'));
const UsersRolesPage = lazy(() => import('./pages/users/UsersRolesPage.jsx'));
const RoleDetailPage = lazy(() => import('./pages/roles/RoleDetailPage.jsx'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage.jsx'));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage.jsx'));
const NotificationsPage = lazy(() => import('./pages/notifications/NotificationsPage.jsx'));
const AuditLogsPage = lazy(() => import('./pages/audit/AuditLogsPage.jsx'));

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
            <Route path="/home" element={<Suspense fallback={<LoadingState />}><HomePage /></Suspense>} />
            <Route path="/dashboard" element={<Suspense fallback={<LoadingState />}><DashboardPage /></Suspense>} />
            <Route path="/properties" element={<Suspense fallback={<LoadingState />}><PropertiesListPage /></Suspense>} />
            <Route path="/properties/:id" element={<Suspense fallback={<LoadingState />}><PropertyDetailPage /></Suspense>} />
            <Route path="/tenants" element={<Suspense fallback={<LoadingState />}><TenantsListPage /></Suspense>} />
            <Route path="/message-manager" element={<Suspense fallback={<LoadingState />}><MessageManagerPage /></Suspense>} />
            <Route path="/tenant-messages" element={<Suspense fallback={<LoadingState />}><TenantMessagesInboxPage /></Suspense>} />
            <Route path="/owners" element={<Suspense fallback={<LoadingState />}><OwnersListPage /></Suspense>} />
            <Route path="/leases" element={<Suspense fallback={<LoadingState />}><LeasesListPage /></Suspense>} />
            <Route path="/my-lease" element={<Suspense fallback={<LoadingState />}><MyLeasePage /></Suspense>} />
            <Route path="/invoices" element={<Suspense fallback={<LoadingState />}><InvoicesListPage /></Suspense>} />
            <Route path="/payments" element={<Suspense fallback={<LoadingState />}><PaymentsListPage /></Suspense>} />
            <Route path="/expenses" element={<Suspense fallback={<LoadingState />}><ExpensesListPage /></Suspense>} />
            <Route path="/my-payments" element={<Suspense fallback={<LoadingState />}><MyPaymentsPage /></Suspense>} />
            <Route path="/maintenance" element={<Suspense fallback={<LoadingState />}><MaintenanceRequestsListPage /></Suspense>} />
            <Route path="/maintenance/:id" element={<Suspense fallback={<LoadingState />}><MaintenanceRequestDetailPage /></Suspense>} />
            <Route path="/work-orders" element={<Suspense fallback={<LoadingState />}><WorkOrdersListPage /></Suspense>} />
            <Route path="/vendors" element={<Suspense fallback={<LoadingState />}><VendorsListPage /></Suspense>} />
            <Route path="/inspections" element={<Suspense fallback={<LoadingState />}><InspectionsListPage /></Suspense>} />
            <Route path="/inspections/:id" element={<Suspense fallback={<LoadingState />}><InspectionDetailPage /></Suspense>} />
            <Route path="/users" element={<Suspense fallback={<LoadingState />}><UsersRolesPage /></Suspense>} />
            <Route path="/roles/:id" element={<Suspense fallback={<LoadingState />}><RoleDetailPage /></Suspense>} />
            <Route path="/settings" element={<Suspense fallback={<LoadingState />}><SettingsPage /></Suspense>} />
            <Route path="/reports/financial" element={<Suspense fallback={<LoadingState />}><ReportsPage /></Suspense>} />
            <Route path="/notifications" element={<Suspense fallback={<LoadingState />}><NotificationsPage /></Suspense>} />
            <Route path="/audit-logs" element={<Suspense fallback={<LoadingState />}><AuditLogsPage /></Suspense>} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </AuthProvider>
  );
}
