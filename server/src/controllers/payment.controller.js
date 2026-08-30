import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { parsePagination } from '../utils/pagination.js';
import * as paymentService from '../services/payment.service.js';

export const list = asyncHandler(async (req, res) => {
  const { page, pageSize, skip, take } = parsePagination(req.query);
  const result = await paymentService.listPayments(req.user.organizationId, req.user, {
    page, pageSize, skip, take, status: req.query.status, tenantId: req.query.tenantId, invoiceId: req.query.invoiceId,
  });
  sendSuccess(res, { data: result.payments, meta: result.meta });
});

export const get = asyncHandler(async (req, res) => {
  const payment = await paymentService.getPayment(req.params.id, req.user.organizationId, req.user);
  sendSuccess(res, { data: payment });
});

export const create = asyncHandler(async (req, res) => {
  const payment = await paymentService.recordPayment(req.user.organizationId, req.body, req.user, req);
  sendSuccess(res, { statusCode: 201, data: payment, message: 'Payment recorded.' });
});

export const refund = asyncHandler(async (req, res) => {
  const payment = await paymentService.refundPayment(req.params.id, req.user.organizationId, req.body, req.user, req);
  sendSuccess(res, { data: payment, message: 'Payment refunded.' });
});
