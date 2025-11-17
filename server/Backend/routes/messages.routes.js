import express from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import {
  getOrCreateConversation,
  listConversations,
  getMessages,
  sendMessage,
  markRead,
} from '../controllers/messages.controller.js';

const router = express.Router();

router.post('/conversations', requireAuth, getOrCreateConversation);

router.get('/conversations', requireAuth, listConversations);

router.get('/conversations/:id/messages', requireAuth, getMessages);

router.post('/conversations/:id/messages', requireAuth, sendMessage);

router.patch('/conversations/:id/read', requireAuth, markRead);

export default router;
