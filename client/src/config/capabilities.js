// UX-only hints for which roles typically hold a given permission, derived
// from server/src/constants/permissions.js's DEFAULT_ROLE_TEMPLATES. This
// never grants or denies anything by itself — it only decides whether to
// show a button that would otherwise just 403 immediately. The server's
// requirePermission middleware is the actual authorization boundary, and an
// organization can edit its roles' permissions later, so a mismatch here is
// a UX rough edge, never a security gap.
export const CAN_CREATE_PROPERTIES = ['administrator', 'property_manager', 'agent'];
export const CAN_UPDATE_PROPERTIES = ['administrator', 'property_manager', 'agent'];
export const CAN_DELETE_PROPERTIES = ['administrator'];

export const CAN_MANAGE_BUILDINGS = ['administrator', 'property_manager'];
export const CAN_MANAGE_UNITS = ['administrator', 'property_manager', 'agent'];

export const CAN_MANAGE_TENANTS = ['administrator', 'property_manager', 'agent'];
export const CAN_MANAGE_OWNERS = ['administrator'];

// leases:create/update/terminate/renew are all granted to the same two
// roles in the default templates (agent has leases:read only, despite
// managing tenants/units) — see server/src/constants/permissions.js.
export const CAN_MANAGE_LEASES = ['administrator', 'property_manager'];

// Every mutation across invoices/payments/expenses (create, update, send,
// void, refund, approve/reject/mark-paid, categories) maps to the same two
// roles in the default templates — even property_manager is read-only on
// all three. See server/src/constants/permissions.js's accountant/
// property_manager templates.
export const CAN_MANAGE_FINANCE = ['administrator', 'accountant'];

// Work orders / vendors / inspections, and updating (review/assign/cancel)
// a maintenance request, are all granted to the same two roles.
export const CAN_MANAGE_OPERATIONS = ['administrator', 'property_manager', 'maintenance_manager'];
// Creating a maintenance request is additionally open to the tenant who's
// reporting the issue (self-scoped to their own unit) — see
// maintenanceRequest.service.js.
export const CAN_CREATE_MAINTENANCE = ['administrator', 'property_manager', 'maintenance_manager', 'tenant'];

// users:invite/update/change-role and roles are administrator-only in the
// default templates — 'users'/'roles' resources appear in no other role's
// readWrite/readOnly list except via administrator's ALL. auditor can read
// (readOnly(RESOURCES) includes both), but never mutate.
export const CAN_MANAGE_USERS = ['administrator'];
export const CAN_VIEW_USERS = ['administrator', 'auditor'];

// roles:create/update/delete — same story as CAN_MANAGE_USERS, only
// administrator holds these in the default templates. Kept as its own named
// export (rather than reusing CAN_MANAGE_USERS) so the Roles/Permissions UI
// reads as gated by its own concern, even though the role list is identical
// today.
export const CAN_MANAGE_ROLES = ['administrator'];

// organizations:update is administrator-only; organizations:read also
// includes auditor (readOnly(RESOURCES)) — the Settings page's
// Organization tab is therefore visible to both but only editable by
// administrator.
export const CAN_MANAGE_ORGANIZATION = ['administrator'];
export const CAN_VIEW_ORGANIZATION = ['administrator', 'auditor'];

// reports:read — property_manager and owner hold it despite being
// read-only/scoped everywhere else; maintenance_manager, agent, and tenant
// do not have it at all.
export const CAN_VIEW_REPORTS = ['administrator', 'property_manager', 'accountant', 'owner', 'auditor'];

// documents:create — accountant now has it too (finance readWrite includes
// documents, matching their need to attach receipts to invoices/payments/
// expenses); owner/tenant/auditor remain read-only.
export const CAN_UPLOAD_DOCUMENTS = ['administrator', 'property_manager', 'agent', 'maintenance_manager', 'accountant'];
// documents:delete — the readWrite() helper only grants read/create/update,
// never delete, so only administrator (ALL permissions) can delete a file.
export const CAN_DELETE_DOCUMENTS = ['administrator'];

// audit-logs:read — administrator and auditor only, per RESOURCES-wide
// readOnly() for auditor and ALL for administrator; no other role's
// template mentions 'audit-logs' at all.
export const CAN_VIEW_AUDIT_LOGS = ['administrator', 'auditor'];

export function canAny(roles, allowedRoles) {
  return roles.some((r) => allowedRoles.includes(r));
}
