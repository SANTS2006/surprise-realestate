// UX-only hints for which roles typically hold a given permission, derived
// from server/src/constants/permissions.js's DEFAULT_ROLE_TEMPLATES. This
// never grants or denies anything by itself — it only decides whether to
// show a button that would otherwise just 403 immediately. The server's
// requirePermission middleware is the actual authorization boundary, and an
// organization can edit its roles' permissions later, so a mismatch here is
// a UX rough edge, never a security gap.
//
// `agent` is the one assignment-scoped "manages specific properties" role
// (property_manager was removed as redundant with it — see
// docs/security/authorization.md). Every "manage" capability below that
// used to list both now lists only `agent`.
export const CAN_CREATE_PROPERTIES = ['administrator', 'agent'];
export const CAN_UPDATE_PROPERTIES = ['administrator', 'agent'];
export const CAN_DELETE_PROPERTIES = ['administrator'];

export const CAN_MANAGE_BUILDINGS = ['administrator', 'agent'];
export const CAN_MANAGE_UNITS = ['administrator', 'agent'];

export const CAN_MANAGE_TENANTS = ['administrator', 'agent'];
// owner has no owners:* permission at all (they only ever see their own
// record, self-scoped in owner.service.js) — administrator only here.
export const CAN_MANAGE_OWNERS = ['administrator'];

export const CAN_MANAGE_LEASES = ['administrator', 'agent'];

// Every mutation across invoices/payments/expenses (create, update, send,
// void, refund, approve/reject/mark-paid, categories) maps to the same two
// roles in the default templates — agent and owner are both read-only here.
export const CAN_MANAGE_FINANCE = ['administrator', 'accountant'];

// Work orders / vendors / inspections, and updating (review/assign/cancel)
// a maintenance request, are all granted to the same roles.
export const CAN_MANAGE_OPERATIONS = ['administrator', 'agent', 'maintenance_manager'];
// Creating a maintenance request is additionally open to the tenant who's
// reporting the issue (self-scoped to their own unit) — see
// maintenanceRequest.service.js.
export const CAN_CREATE_MAINTENANCE = ['administrator', 'agent', 'maintenance_manager', 'tenant'];

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

// reports:read — agent and owner hold it despite being read-only/scoped
// everywhere else; maintenance_manager and tenant do not have it at all.
export const CAN_VIEW_REPORTS = ['administrator', 'agent', 'accountant', 'owner', 'auditor'];

// documents:create — accountant now has it too (finance readWrite includes
// documents, matching their need to attach receipts to invoices/payments/
// expenses); owner/tenant/auditor remain read-only.
export const CAN_UPLOAD_DOCUMENTS = ['administrator', 'agent', 'maintenance_manager', 'accountant'];
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
