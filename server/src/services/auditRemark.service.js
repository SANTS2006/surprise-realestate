import { buildPaginationMeta } from '../utils/pagination.js';
import { createAuditRemark, findAuditRemarksByOrganization, countAuditRemarksByOrganization } from '../repositories/auditRemark.repository.js';

function serializeAuditRemark(remark) {
  return {
    id: remark.id,
    content: remark.content,
    createdAt: remark.createdAt,
    author: remark.author
      ? { id: remark.author.id, firstName: remark.author.firstName, lastName: remark.author.lastName, email: remark.author.email }
      : null,
  };
}

export async function createRemark(organizationId, actingUser, content) {
  const remark = await createAuditRemark({ organizationId, authorId: actingUser.id, content });
  return serializeAuditRemark(remark);
}

export async function listRemarks(organizationId, { page, pageSize, skip, take }) {
  const [remarks, total] = await Promise.all([
    findAuditRemarksByOrganization(organizationId, { skip, take }),
    countAuditRemarksByOrganization(organizationId),
  ]);
  return { remarks: remarks.map(serializeAuditRemark), meta: buildPaginationMeta({ page, pageSize, total }) };
}
