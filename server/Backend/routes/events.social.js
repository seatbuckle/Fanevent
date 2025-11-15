// server/routes/events.social.js
import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import Event from "../models/Event.js";
import Like from "../models/Like.js";
import RSVP from "../models/RSVP.js";

const r = Router();

/** Validate event exists (404 if not) */
async function ensureEvent(req, res, next) {
  try {
    const ev = await Event.findById(req.params.id).select("_id title startAt endAt");
    if (!ev) return res.status(404).json({ message: "Event not found" });
    req.event = ev;
    next();
  } catch (e) {
    return res.status(400).json({ message: "Invalid event id" });
  }
}

/* ===================== LIKES ===================== */

// POST /api/events/:id/like   (idempotent create)
r.post("/:id/like", requireAuth, ensureEvent, async (req, res) => {
  const userId = req.auth.userId;
  const eventId = req.event._id;

  try {
    await Like.updateOne(
      { userId, eventId },
      { $setOnInsert: { userId, eventId } },
      { upsert: true }
    );
    return res.json({ liked: true });
  } catch (e) {
    console.error("like error", e);
    return res.status(500).json({ message: "Failed to like event" });
  }
});

// DELETE /api/events/:id/like
r.delete("/:id/like", requireAuth, ensureEvent, async (req, res) => {
  const userId = req.auth.userId;
  const eventId = req.event._id;

  try {
    await Like.deleteOne({ userId, eventId });
    return res.json({ liked: false });
  } catch (e) {
    console.error("unlike error", e);
    return res.status(500).json({ message: "Failed to unlike event" });
  }
});

// GET /api/events/:id/like/me   -> { liked: boolean }
r.get("/:id/like/me", requireAuth, ensureEvent, async (req, res) => {
  const userId = req.auth.userId;
  const found = await Like.findOne({ userId, eventId: req.event._id }).lean();
  res.json({ liked: !!found });
});

// GET /api/events/:id/likes/count  -> { count: number }
r.get("/:id/likes/count", ensureEvent, async (req, res) => {
  const count = await Like.countDocuments({ eventId: req.event._id });
  res.json({ count });
});

/* ===================== RSVPs ===================== */

// POST /api/events/:id/rsvp   (idempotent create if missing)
r.post("/:id/rsvp", requireAuth, ensureEvent, async (req, res) => {
  const userId = req.auth.userId;
  const eventId = req.event._id;

  try {
    const doc = await RSVP.findOneAndUpdate(
      { userId, eventId },
      { $setOnInsert: { userId, eventId, rsvpedAt: new Date() } },
      { new: true, upsert: true }
    );
    return res.json({ rsvped: true, rsvp: doc });
  } catch (e) {
    console.error("rsvp error", e);
    return res.status(500).json({ message: "Failed to RSVP" });
  }
});

// DELETE /api/events/:id/rsvp
r.delete("/:id/rsvp", requireAuth, ensureEvent, async (req, res) => {
  const userId = req.auth.userId;
  const eventId = req.event._id;

  try {
    await RSVP.deleteOne({ userId, eventId });
    return res.json({ rsvped: false });
  } catch (e) {
    console.error("cancel rsvp error", e);
    return res.status(500).json({ message: "Failed to cancel RSVP" });
  }
});

// GET /api/events/:id/rsvp/me -> { rsvped, checkInAt, checkOutAt, attended, attendedHours }
r.get("/:id/rsvp/me", requireAuth, ensureEvent, async (req, res) => {
  const userId = req.auth.userId;
  const r = await RSVP.findOne({ userId, eventId: req.event._id }).lean();
  res.json({
    rsvped: !!r,
    checkInAt: r?.checkInAt || null,
    checkOutAt: r?.checkOutAt || null,
    attended: !!r?.attended,
    attendedHours: r?.attendedHours ?? null,
  });
});

// POST /api/events/:id/check-in
r.post("/:id/check-in", requireAuth, ensureEvent, async (req, res) => {
  const userId = req.auth.userId;
  const eventId = req.event._id;

  try {
    const now = new Date();
    const doc = await RSVP.findOneAndUpdate(
      { userId, eventId },
      { $set: { checkInAt: now }, $setOnInsert: { rsvpedAt: now } },
      { new: true, upsert: true }
    );
    res.json({ ok: true, checkInAt: doc.checkInAt });
  } catch (e) {
    console.error("check-in error", e);
    res.status(500).json({ message: "Failed to check in" });
  }
});

// POST /api/events/:id/check-out
r.post("/:id/check-out", requireAuth, ensureEvent, async (req, res) => {
  const userId = req.auth.userId;
  const eventId = req.event._id;

  try {
    const doc = await RSVP.findOne({ userId, eventId });
    if (!doc?.checkInAt) {
      return res.status(400).json({ message: "Must check in first" });
    }
    const now = new Date();
    const hours =
      Math.max(0, (now.getTime() - new Date(doc.checkInAt).getTime())) /
      (1000 * 60 * 60);

    doc.checkOutAt = now;
    doc.attended = true;
    doc.attendedHours = Number(hours.toFixed(2));
    await doc.save();

    res.json({
      ok: true,
      checkOutAt: doc.checkOutAt,
      attended: doc.attended,
      attendedHours: doc.attendedHours,
    });
  } catch (e) {
    console.error("check-out error", e);
    res.status(500).json({ message: "Failed to check out" });
  }
});

// GET /api/events/:id/rsvp/count -> { count }
r.get("/:id/rsvp/count", ensureEvent, async (req, res) => {
  const count = await RSVP.countDocuments({ eventId: req.event._id });
  res.json({ count });
});

export default r;
