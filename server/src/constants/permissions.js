// The full permission catalog (global — permissions themselves are not
// organization-scoped; `role_permissions` links them into a per-organization
// Role). Naming convention: `resource:action`.
//
// This is the Phase 4 bootstrap needed so a newly-registered organization's
// creator has a coherent Administrator role to log in with. Full
// enforcement (a `requirePermission` middleware checked on every resource
// route) lands in Phase 5 alongside the resource modules themselves.

const RESOURCES = [
  'organizations', 'users', 'roles', 'properties', 'buildings', 'units',
  'owners', 'tenants', 'leases', 'invoices', 'payments', 'expenses',
  'vendors', 'maintenance', 'work-orders', 'inspections', 'documents',
  'notifications', 'reports', 'audit-logs', 'settings',
];

const STANDARD_ACTIONS = ['read', 'create', 'update', 'delete'];

const SPECIAL_PERMISSIONS = [
  'leases:terminate',
  'leases:renew',
  'payments:refund',
  'invoices:void',
  'expenses:approve',
  'documents:download',
  'users:invite',
  'users:change-role',
];

export const PERMISSIONS = [
  ...RESOURCES.flatMap((resource) =>
    STANDARD_ACTIONS.map((action) => ({
      name: `${resource}:${action}`,
      description: `${action} ${resource.replace(/-/g, ' ')}`,
    }))
  ),
  ...SPECIAL_PERMISSIONS.map((name) => ({ name, description: name.replace(':', ' — ').replace(/-/g, ' ') })),
];

const ALL = PERMISSIONS.map((p) => p.name);
const readOnly = (resources) => resources.map((r) => `${r}:read`);
const readWrite = (resources) => resources.flatMap((r) => [`${r}:read`, `${r}:create`, `${r}:update`]);

// Default role → permission-name mapping seeded for every new organization.
// Organization admins can edit/create additional roles later (Phase 5 UI);
// these are starting points, not immutable system constraints, except
// `administrator` which always keeps full access (see role.service.js).
export const DEFAULT_ROLE_TEMPLATES = {
  administrator: {
    description: 'Full access within the organization.',
    permissions: ALL,
  },
  property_manager: {
    description: 'Manages assigned properties, units, tenants, and leases.',
    permissions: [
      ...readWrite(['properties', 'buildings', 'units', 'tenants', 'leases', 'maintenance', 'work-orders', 'inspections', 'vendors', 'documents', 'notifications']),
      ...readOnly(['invoices', 'payments', 'expenses', 'owners', 'reports']),
      'leases:terminate', 'leases:renew', 'documents:download',
    ],
  },
  accountant: {
    description: 'Manages invoicing, payments, expenses, and financial reporting.',
    permissions: [
      ...readWrite(['invoices', 'payments', 'expenses', 'documents']),
      ...readOnly(['properties', 'units', 'tenants', 'leases', 'owners', 'vendors']),
      'payments:refund', 'invoices:void', 'expenses:approve', 'documents:download',
      ...readWrite(['reports']),
    ],
  },
  maintenance_manager: {
    description: 'Manages maintenance requests, work orders, and vendors.',
    permissions: [
      ...readWrite(['maintenance', 'work-orders', 'vendors', 'inspections', 'documents']),
      ...readOnly(['properties', 'units', 'tenants']),
      'documents:download',
    ],
  },
  owner: {
    description: 'Read-only access to their own properties and financial reports.',
    permissions: [...readOnly(['owners', 'properties', 'buildings', 'units', 'leases', 'invoices', 'payments', 'expenses', 'reports', 'documents', 'maintenance']), 'documents:download'],
  },
  agent: {
    description: 'Manages assigned properties and listings.',
    permissions: [...readWrite(['properties', 'units', 'tenants', 'documents']), ...readOnly(['leases', 'owners']), 'documents:download'],
  },
  tenant: {
    description: "Access to their own lease, invoices, payments, documents, and maintenance requests.",
    permissions: [
      ...readOnly(['tenants', 'leases', 'invoices', 'payments', 'documents']),
      'maintenance:read', 'maintenance:create', 'documents:download',
    ],
  },
  auditor: {
    description: 'Organization-wide read-only access.',
    permissions: readOnly(RESOURCES),
  },
};
