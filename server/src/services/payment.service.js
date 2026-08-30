import { prisma } from '../config/database.js';
import { AppError } from '../utils/AppError.js';
import { buildPaginationMeta } from '../utils/pagination.js';
import {
  createPayment, findPaymentById, findPaymentByIdempotencyKey, findPaymentsByOrganization,
  countPaymentsByOrganization, setPaymentStatus,
} from '../repositories/payment.repository.js';
import { findTenantById } from '../repositories/tenant.repository.js';
import { findInvoiceById, applyPaymentDelta } from '../repositories/invoice.repository.js';
import { findLeaseById } from '../repositories/lease.repository.js';
import { assertPropertyAccess, getRestrictedScope } from './resourceAccess.service.js';
import { audit } from './audit.service.js';
import { notify } from './notification.service.js';

function serializePayment(payment) {
  return {
    id: payment.id,
    tenantId: payment.tenantId,
    leaseId: payment.leaseId,
    invoiceId: payment.invoiceId,
    amount: payment.amount,
    currency: payment.currency,
    paymentDate: payment.paymentDate,
    paymentMethod: payment.paymentMethod,
    reference: payment.reference,
    status: payment.status,
    notes: payment.notes,
    createdAt: payment.createdAt,
    ...(payment.tenant ? { tenant: { id: payment.tenant.id, firstName: payment.tenant.firstName, lastName: payment.tenant.lastName } } : {}),
  };
}

async function loadPaymentWithAccess(id, organizationId, actingUser) {
  const payment = await findPaymentById(id, organizationId);
  if (!payment) throw AppError.notFound('Payment not found.');

  if (actingUser.roles.includes('tenant')) {
    const scope = await getRestrictedScope(actingUser, organizationId);
    if (scope.tenantId !== payment.tenantId) throw AppError.notFound('Payment not found.');
    return payment;
  }
  if (payment.leaseId) {
    const lease = await findLeaseById(payment.leaseId, organizationId);
    if (lease) await assertPropertyAccess(lease.unit.building.property, actingUser);
  }
  return payment;
}

export async function listPayments(organizationId, actingUser, { page, pageSize, skip, take, status, tenantId, invoiceId }) {
  const scope = await getRestrictedScope(actingUser, organizationId);
  const effectiveTenantId = scope.tenantId ?? tenantId;
  const propertyIds = scope.propertyIds;

  const [payments, total] = await Promise.all([
    findPaymentsByOrganization(organizationId, { skip, take, status, tenantId: effectiveTenantId, invoiceId, propertyIds }),
    countPaymentsByOrganization(organizationId, { status, tenantId: effectiveTenantId, invoiceId, propertyIds }),
  ]);
  return { payments: payments.map(serializePayment), meta: buildPaginationMeta({ page, pageSize, total }) };
}

export async function getPayment(id, organizationId, actingUser) {
  const payment = await loadPaymentWithAccess(id, organizationId, actingUser);
  return serializePayment(payment);
}

// Records a payment and, if it's tied to an invoice, applies it to that
// invoice's running balance — both inside one transaction, so a payment can
// never exist without its invoice reflecting it (or vice versa).
//
// Idempotency: a client-supplied `idempotencyKey` (recommended for any
// payment-recording UI/integration prone to retries — double-clicks, flaky
// networks) is checked BEFORE any writes; a repeat of the same key returns
// the original payment instead of creating a second one. This is the
// concrete implementation of "prevent duplicate payment processing" from
// docs/security/security-architecture.md.
export async function recordPayment(organizationId, body, actingUser, req) {
  if (body.idempotencyKey) {
    const existing = await findPaymentByIdempotencyKey(body.idempotencyKey);
    if (existing && existing.organizationId === organizationId) {
      return getPayment(existing.id, organizationId, actingUser);
    }
  }

  const tenant = await findTenantById(body.tenantId, organizationId);
  if (!tenant) throw AppError.badRequest('The specified tenant does not exist in this organization.');

  let invoice = null;
  if (body.invoiceId) {
    invoice = await findInvoiceById(body.invoiceId, organizationId);
    if (!invoice) throw AppError.badRequest('The specified invoice does not exist in this organization.');
    if (invoice.tenantId !== body.tenantId) throw AppError.badRequest('This invoice does not belong to the specified tenant.');
    if (invoice.status === 'void') throw AppError.conflict('Cannot record a payment against a void invoice.');
    if (invoice.lease) await assertPropertyAccess(invoice.lease.unit.building.property, actingUser);

    const amount = Number(body.amount);
    if (amount > Number(invoice.balance)) {
      throw AppError.badRequest(`Payment amount (${amount}) exceeds the invoice's outstanding balance (${invoice.balance}).`);
    }
  } else if (body.leaseId) {
    const lease = await findLeaseById(body.leaseId, organizationId);
    if (!lease) throw AppError.badRequest('The specified lease does not exist in this organization.');
    await assertPropertyAccess(lease.unit.building.property, actingUser);
  }

  const payment = await prisma.$transaction(async (tx) => {
    const created = await createPayment({
      organizationId,
      tenantId: body.tenantId,
      leaseId: body.leaseId ?? invoice?.leaseId ?? null,
      invoiceId: body.invoiceId ?? null,
      amount: body.amount,
      currency: body.currency ?? 'USD',
      paymentDate: body.paymentDate ?? new Date(),
      paymentMethod: body.paymentMethod,
      reference: body.reference ?? null,
      idempotencyKey: body.idempotencyKey ?? null,
      notes: body.notes ?? null,
      status: 'completed',
    }, tx);

    if (body.invoiceId) {
      await applyPaymentDelta(body.invoiceId, Number(body.amount), tx);
    }

    return created;
  });

  await audit({ organizationId, userId: actingUser.id, action: 'payment.recorded', entityType: 'payment', entityId: payment.id, newValues: { amount: payment.amount, invoiceId: payment.invoiceId }, req });
  await notify({
    organizationId, userId: tenant.userId, type: 'payment_received',
    title: 'Payment received', message: `A payment of ${payment.currency} ${payment.amount} was recorded on your account.`,
  });
  return getPayment(payment.id, organizationId, actingUser);
}

// A refund never deletes or overwrites the original payment row — it flips
// its status to `refunded` (permanent history of what happened) and
// reverses the effect on the linked invoice's balance in the same
// transaction. See docs/security/security-architecture.md's
// financial-integrity section.
export async function refundPayment(id, organizationId, body, actingUser, req) {
  const payment = await loadPaymentWithAccess(id, organizationId, actingUser);
  if (payment.status !== 'completed') {
    throw AppError.conflict(`Only a completed payment can be refunded (current status: ${payment.status}).`);
  }

  await prisma.$transaction(async (tx) => {
    await setPaymentStatus(id, 'refunded', { notes: body?.reason ? `${payment.notes ?? ''}\nRefund reason: ${body.reason}`.trim() : payment.notes }, tx);
    if (payment.invoiceId) {
      await applyPaymentDelta(payment.invoiceId, -Number(payment.amount), tx);
    }
  });

  await audit({ organizationId, userId: actingUser.id, action: 'payment.refunded', entityType: 'payment', entityId: id, oldValues: { status: 'completed' }, newValues: { status: 'refunded', reason: body?.reason }, req });
  return getPayment(id, organizationId, actingUser);
}
