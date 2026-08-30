import {
  Home, LayoutDashboard, Building2, Users, UserCircle, FileText, Wallet, Wrench, Bell, ShieldCheck, History, Settings,
} from 'lucide-react';

// Permission-aware navigation (§77 of the requirements): `roles` narrows
// which roles see a nav item at all. This is a UX convenience ONLY —
// hiding a link here is never the security boundary; every route it points
// to is independently authorized server-side regardless of what's shown
// here. `undefined` roles means "visible to every authenticated user."
export const NAV_SECTIONS = [
  { label: 'Home', icon: Home, to: '/home' },
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
  {
    label: 'Properties', icon: Building2, to: '/properties',
    roles: ['administrator', 'property_manager', 'agent', 'owner', 'accountant', 'maintenance_manager', 'auditor'],
  },
  { label: 'Tenants', icon: Users, to: '/tenants', roles: ['administrator', 'property_manager', 'agent', 'accountant', 'auditor'] },
  { label: 'Owners', icon: UserCircle, to: '/owners', roles: ['administrator', 'property_manager', 'agent', 'accountant', 'auditor'] },
  { label: 'Leases', icon: FileText, to: '/leases', roles: ['administrator', 'property_manager', 'agent', 'owner', 'accountant', 'auditor'] },
  { label: 'My Lease', icon: FileText, to: '/my-lease', roles: ['tenant'] },
  {
    label: 'Finance', icon: Wallet,
    roles: ['administrator', 'accountant', 'property_manager', 'owner', 'auditor'],
    children: [
      { label: 'Invoices', to: '/invoices' },
      { label: 'Payments', to: '/payments' },
      { label: 'Expenses', to: '/expenses' },
      { label: 'Financial Reports', to: '/reports/financial' },
    ],
  },
  { label: 'My Payments', icon: Wallet, to: '/my-payments', roles: ['tenant'] },
  {
    label: 'Maintenance', icon: Wrench,
    roles: ['administrator', 'property_manager', 'maintenance_manager', 'auditor'],
    children: [
      { label: 'Requests', to: '/maintenance' },
      { label: 'Work Orders', to: '/work-orders' },
      { label: 'Vendors', to: '/vendors' },
      { label: 'Inspections', to: '/inspections' },
    ],
  },
  { label: 'Maintenance', icon: Wrench, to: '/maintenance', roles: ['tenant'] },
  { label: 'Notifications', icon: Bell, to: '/notifications' },
  { label: 'Users & Roles', icon: ShieldCheck, to: '/users', roles: ['administrator', 'auditor'] },
  { label: 'Audit Logs', icon: History, to: '/audit-logs', roles: ['administrator', 'auditor'] },
  // No `roles` restriction — every authenticated user gets an Account tab
  // (change password, MFA); the Organization tab self-gates inside the page.
  { label: 'Settings', icon: Settings, to: '/settings' },
];

export function isNavItemVisible(item, roles) {
  return !item.roles || item.roles.some((r) => roles.includes(r));
}
