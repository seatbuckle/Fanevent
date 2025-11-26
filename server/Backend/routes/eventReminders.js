// routes/eventReminders.js
import express from "express";
import mongoose from "mongoose";
import { EventReminder } from "../models/EventReminder.js";
// import your auth middleware here if you have one

const router = express.Router();

// helper to get user id (adjust to your auth)
function getUserId(req) {
  // If you already attach user on req.user, use that
  // e.g. return req.user.id;
  // For Clerk + Express with @clerk/express, you may have req.auth.userId
  return req.user?.id || req.auth?.userId;
}

// GET /api/event-reminders/:eventId
router.get("/:eventId", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { eventId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ error: "Invalid event id" });
    }

    const doc = await EventReminder.findOne({ userId, eventId }).lean();

    res.json({
      offsets: doc?.offsets || [],
    });
  } catch (err) {
    console.error("[Reminders] GET failed:", err);
    res.status(500).json({ error: "Failed to load reminders" });
  }
});

// POST /api/event-reminders/:eventId
router.post("/:eventId", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { eventId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ error: "Invalid event id" });
    }

    const rawOffsets = Array.isArray(req.body?.offsets) ? req.body.offsets : [];

    // clean + validate minutes
    const cleanOffsets = Array.from(
      new Set(
        rawOffsets
          .map((n) => Number(n))
          .filter((n) => Number.isFinite(n) && n > 0)
      )
    ).sort((a, b) => a - b);

    const doc = await EventReminder.findOneAndUpdate(
      { userId, eventId },
      { $set: { offsets: cleanOffsets } },
      { new: true, upsert: true }
    ).lean();

    // IMPORTANT: always send a response so the frontend doesn’t hang
    res.json({
      ok: true,
      offsets: doc.offsets,
    });
  } catch (err) {
    console.error("[Reminders] POST failed:", err);
    res.status(500).json({ error: "Failed to save reminders" });
  }
});

export default router;
