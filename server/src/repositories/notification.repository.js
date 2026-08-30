import { prisma } from '../config/database.js';

export function createNotification(data) {
  return prisma.notification.create({ data });
}

export function findNotificationsForUser(userId, organizationId, { skip, take, unreadOnly }) {
  return prisma.notification.findMany({
    where: { userId, organizationId, ...(unreadOnly ? { readAt: null } : {}) },
    orderBy: { createdAt: 'desc' },
    skip,
    take,
  });
}

export function countNotificationsForUser(userId, organizationId, { unreadOnly }) {
  return prisma.notification.count({ where: { userId, organizationId, ...(unreadOnly ? { readAt: null } : {}) } });
}

export function countUnreadForUser(userId, organizationId) {
  return prisma.notification.count({ where: { userId, organizationId, readAt: null } });
}

export function markNotificationRead(id, userId) {
  return prisma.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } });
}

export function markAllNotificationsRead(userId, organizationId) {
  return prisma.notification.updateMany({ where: { userId, organizationId, readAt: null }, data: { readAt: new Date() } });
}
