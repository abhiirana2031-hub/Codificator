import { queryAll, queryOne, runQuery } from '../db/db.js';

/**
 * Creates an in-app notification for a student or instructor.
 */
export function createNotification({ userId, title, message, type = 'SYSTEM', linkUrl = null }) {
  if (!userId || !title || !message) return null;

  try {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    runQuery(
      `INSERT INTO notifications (id, user_id, title, message, type, link_url, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
      [id, userId, title, message, type, linkUrl]
    );
    return id;
  } catch (err) {
    console.error('Failed to create notification:', err.message);
    return null;
  }
}

/**
 * Retrieves notifications for a specific user with unread counter.
 */
export function getUserNotifications(userId, limit = 20) {
  if (!userId) return { notifications: [], unreadCount: 0 };

  const notifications = queryAll(
    `SELECT id, user_id, title, message, type, link_url, is_read, created_at
     FROM notifications
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [userId, limit]
  ).map(n => ({
    ...n,
    isRead: Boolean(n.is_read)
  }));

  const unreadRow = queryOne(
    `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0`,
    [userId]
  );

  return {
    notifications,
    unreadCount: unreadRow ? unreadRow.count : 0
  };
}

/**
 * Marks a single notification as read.
 */
export function markNotificationRead(id, userId) {
  runQuery(
    `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  return true;
}

/**
 * Marks all notifications as read for a user.
 */
export function markAllNotificationsRead(userId) {
  runQuery(
    `UPDATE notifications SET is_read = 1 WHERE user_id = ?`,
    [userId]
  );
  return true;
}
