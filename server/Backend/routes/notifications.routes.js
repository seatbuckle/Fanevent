import express from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import {
  createNotification,
  listNotifications,
  markRead,
  markAllRead,
  deleteNotification,
} from '../controllers/notifications.controller.js';

const router = express.Router();

// get notifs for logged-in user
router.get('/', requireAuth, listNotifications);

// make a new notif
router.post('/', requireAuth, createNotification);

// mark one as read
router.patch('/:id/read', requireAuth, markRead);

// mark everything read
router.post('/mark-all-read', requireAuth, markAllRead);

// delete one notif
router.delete('/:id', requireAuth, deleteNotification);

export default router;
