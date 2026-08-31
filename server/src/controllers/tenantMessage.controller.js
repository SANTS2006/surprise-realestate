import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { parsePagination } from '../utils/pagination.js';
import { sendTenantMessage, listInbox } from '../services/tenantMessage.service.js';

export const list = asyncHandler(async (req, res) => {
  const { page, pageSize, skip, take } = parsePagination(req.query);
  const result = await listInbox(req.user.organizationId, req.user, { page, pageSize, skip, take });
  sendSuccess(res, { data: result.messages, meta: result.meta });
});

export const create = asyncHandler(async (req, res) => {
  const result = await sendTenantMessage(req.user, req.body.content);
  sendSuccess(res, { statusCode: 201, data: result, message: 'Message sent.' });
});
