import express from 'express';
import { parseAuthUser, requireAuth } from '../middleware/auth.js';
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from '../services/notificationService.js';

const router = express.Router();

// 1. Get recent notifications (authenticated student or empty for visitors)
router.get('/', (req, res) => {
  try {
    const user = req.user || parseAuthUser(req);
    if (!user) {
      return res.json({ notifications: [], unreadCount: 0 });
    }
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100);
    const result = getUserNotifications(user.id, limit);
    res.json(result || { notifications: [], unreadCount: 0 });
  } catch (err) {
    console.warn('⚠️ Notifications fetch non-critical error:', err.message);
    res.json({ notifications: [], unreadCount: 0 });
  }
});

// 2. Mark a specific notification as read
router.patch('/:id/read', requireAuth, (req, res) => {
  const { id } = req.params;
  markNotificationRead(id, req.user.id);
  res.json({ success: true, id });
});

// 3. Mark all notifications as read
router.post('/mark-all-read', requireAuth, (req, res) => {
  markAllNotificationsRead(req.user.id);
  res.json({ success: true });
});

export default router;
