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
  'notifications', 'reports', 'audit-logs', 'audit-remarks', 'settings',
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
  // Read-only and scoped to properties they own (Property.ownerId) — see
  // resourceAccess.service.js's `getRestrictedScope` for the ownerId->
  // propertyIds resolution, consumed by owner.service.js/tenant.service.js/
  // lease.service.js/etc. to filter every list down to their own portfolio.
  // Deliberately has no `owners:*` beyond their own record (owner.service.js
  // self-scopes that regardless of permission) — they have no reason to
  // browse other owners.
  owner: {
    description: 'Read-only access to their own properties and financial reports.',
    permissions: [...readOnly(['properties', 'buildings', 'units', 'tenants', 'leases', 'invoices', 'payments', 'expenses', 'reports', 'documents', 'maintenance']), 'documents:download'],
  },
  // The one assignment-scoped "manages specific properties" role (formerly
  // split with property_manager, which was removed as redundant — this
  // absorbed its full permission set). Scoped via PropertyAssignment, not
  // ownership — see ASSIGNMENT_SCOPED_ROLES in resourceAccess.service.js.
  agent: {
    description: 'Manages assigned properties, units, tenants, and leases.',
    permissions: [
      ...readWrite(['properties', 'buildings', 'units', 'tenants', 'leases', 'maintenance', 'work-orders', 'inspections', 'vendors', 'documents', 'notifications']),
      ...readOnly(['invoices', 'payments', 'expenses', 'owners', 'reports']),
      'leases:terminate', 'leases:renew', 'documents:download',
    ],
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
    // `documents:download` is a SPECIAL_PERMISSION, not covered by
    // readOnly(RESOURCES) — without it, GET /documents/:id/access-url 403s
    // (it's gated by `documents:download`, not `documents:read`), so an
    // auditor could see a document's metadata in a list but never actually
    // view/download it — including every avatar and property photo in the
    // app, since those render via a signed access-url fetch too.
    //
    // `audit-remarks:create` is the one deliberate write exception to
    // "read-only" — leaving a remark after a review is the auditor's actual
    // job, not a system mutation (see audit-remark.service.js). Nothing else
    // in this role writes anything.
    permissions: [...readOnly(RESOURCES), 'documents:download', 'audit-remarks:create'],
  },
};
