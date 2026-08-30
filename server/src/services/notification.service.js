import { AppError } from '../utils/AppError.js';
import { buildPaginationMeta } from '../utils/pagination.js';
import {
  createNotification, findNotificationsForUser, countNotificationsForUser,
  countUnreadForUser, markNotificationRead, markAllNotificationsRead,
} from '../repositories/notification.repository.js';
import { logger } from '../config/logger.js';

function serializeNotification(notification) {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
  };
}

// Called from other services at the point an event actually happens (see
// maintenance/work-order/payment services for the current hooks) — never
// from a controller. Failure here must never fail the operation that
// triggered it (a maintenance assignment succeeding shouldn't roll back
// because a notification row failed to insert), so errors are logged and
// swallowed, mirroring audit.service.js's own failure posture.
export async function notify({ organizationId, userId, type, title, message }) {
  if (!userId) return; // e.g. a tenant with no linked user account yet
  try {
    await createNotification({ organizationId, userId, type, title, message });
  } catch (err) {
    logger.error({ err, userId, type }, 'failed to create notification');
  }
}

export async function listNotifications(userId, organizationId, { page, pageSize, skip, take, unreadOnly }) {
  const [notifications, total, unreadCount] = await Promise.all([
    findNotificationsForUser(userId, organizationId, { skip, take, unreadOnly }),
    countNotificationsForUser(userId, organizationId, { unreadOnly }),
    countUnreadForUser(userId, organizationId),
  ]);
  return {
    notifications: notifications.map(serializeNotification),
    meta: { ...buildPaginationMeta({ page, pageSize, total }), unreadCount },
  };
}

export async function markAsRead(id, userId) {
  const result = await markNotificationRead(id, userId);
  if (result.count === 0) throw AppError.notFound('Notification not found.');
  return { read: true };
}

export async function markAllAsRead(userId, organizationId) {
  const result = await markAllNotificationsRead(userId, organizationId);
  return { markedRead: result.count };
}
