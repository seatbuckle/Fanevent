import express from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import {
  createNotification,
  listNotifications,
  markRead,
  markAllRead,
  deleteNotification,
  getNotificationCount,
  deleteReadNotifications,
} from '../controllers/notifications.controller.js';

const router = express.Router();

// get notifs for logged-in user
router.get('/', requireAuth, listNotifications);

// Get total notification count for logged-in user
router.get('/count', requireAuth, getNotificationCount);

// make a new notif
router.post('/', requireAuth, createNotification);

// mark one as read
router.patch('/:id/read', requireAuth, markRead);

// mark everything read
router.post('/mark-all-read', requireAuth, markAllRead);

// Delete all read notifications for logged-in user
router.delete('/read', requireAuth, deleteReadNotifications);

// delete one notif
router.delete('/:id', requireAuth, deleteNotification);

export default router;