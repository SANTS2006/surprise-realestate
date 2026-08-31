import {
  Home, LayoutDashboard, Building2, Users, UserCircle, FileText, Wallet, Wrench, Bell, ShieldCheck, History, Settings, MessageSquare,
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
    roles: ['administrator', 'agent', 'owner', 'accountant', 'maintenance_manager', 'auditor'],
  },
  // owner now included — owner.service.js/tenant.service.js scope the list
  // to tenants/owners tied to their own properties (see
  // docs/security/authorization.md).
  { label: 'Tenants', icon: Users, to: '/tenants', roles: ['administrator', 'agent', 'owner', 'accountant', 'auditor'] },
  { label: 'Owners', icon: UserCircle, to: '/owners', roles: ['administrator', 'agent', 'accountant', 'auditor'] },
  { label: 'Leases', icon: FileText, to: '/leases', roles: ['administrator', 'agent', 'owner', 'accountant', 'auditor'] },
  { label: 'My Lease', icon: FileText, to: '/my-lease', roles: ['tenant'] },
  {
    label: 'Finance', icon: Wallet,
    roles: ['administrator', 'accountant', 'agent', 'owner', 'auditor'],
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
    roles: ['administrator', 'agent', 'maintenance_manager', 'auditor'],
    children: [
      { label: 'Requests', to: '/maintenance' },
      { label: 'Work Orders', to: '/work-orders' },
      { label: 'Vendors', to: '/vendors' },
      { label: 'Inspections', to: '/inspections' },
    ],
  },
  { label: 'Maintenance', icon: Wrench, to: '/maintenance', roles: ['tenant'] },
  { label: 'Message Manager', icon: MessageSquare, to: '/message-manager', roles: ['tenant'] },
  { label: 'Tenant Messages', icon: MessageSquare, to: '/tenant-messages', roles: ['administrator', 'agent'] },
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
