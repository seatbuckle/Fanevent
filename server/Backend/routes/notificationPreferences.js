// routes/notificationPreferences.js
import express from "express";
const router = express.Router();
import { requireAuth } from '../../middleware/requireAuth.js';
const User = "../models/User";

// Get current user's notification preferences
router.get("/", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id).select("notificationPreferences");
  res.json({ notificationPreferences: user.notificationPreferences });
});

// Update current user's notification preferences
router.patch("/", requireAuth, async (req, res) => {
  const updates = req.body.notificationPreferences || {};
  const user = await User.findById(req.user.id);
  user.notificationPreferences = {
    ...user.notificationPreferences.toObject?.() || user.notificationPreferences || {},
    ...updates,
  };
  await user.save();
  res.json({ notificationPreferences: user.notificationPreferences });
});

export default router;
