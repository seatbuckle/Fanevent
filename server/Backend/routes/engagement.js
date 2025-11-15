// server/routes/engagement.js
import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import RSVP from "../models/RSVP.js";
import Like from "../models/Like.js";
import Event from "../models/Event.js";
import { canCheckIn, computeHours } from "../../lib/attendance.js";
const r = Router();

// RSVP
r.post("/events/:id/rsvp", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const event = await Event.findById(req.params.id);
  if (!event || event.status !== "approved") return res.sendStatus(404);
  const rsvp = await RSVP.findOneAndUpdate(
    { userId, eventId: event._id },
    { $setOnInsert: { userId, eventId: event._id, rsvpedAt: new Date() } },
    { new: true, upsert: true }
  );
  res.json(rsvp);
});

r.delete("/events/:id/rsvp", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  await RSVP.findOneAndDelete({ userId, eventId: req.params.id });
  res.sendStatus(204);
});

// Check-in / out / skip
r.post("/events/:id/checkin", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const ev = await Event.findById(req.params.id);
  if (!ev) return res.sendStatus(404);
  if (!canCheckIn(ev.startAt)) return res.status(400).json({ message: "Check-in not open yet" });
  const rsvp = await RSVP.findOneAndUpdate(
    { userId, eventId: ev._id },
    { $set: { checkInAt: new Date() } },
    { new: true, upsert: true }
  );
  res.json(rsvp);
});

r.post("/events/:id/checkout", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const ev = await Event.findById(req.params.id);
  if (!ev) return res.sendStatus(404);
  const rsvp = await RSVP.findOne({ userId, eventId: ev._id });
  if (!rsvp?.checkInAt) return res.status(400).json({ message: "Must check-in first" });
  rsvp.checkOutAt = new Date();
  rsvp.attended = true;
  rsvp.attendedHours = computeHours(rsvp.checkInAt, rsvp.checkOutAt);
  await rsvp.save();
  res.json(rsvp);
});

r.post("/events/:id/attend-without-logging", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const ev = await Event.findById(req.params.id);
  if (!ev) return res.sendStatus(404);
  const hours = computeHours(ev.startAt, ev.endAt);
  const rsvp = await RSVP.findOneAndUpdate(
    { userId, eventId: ev._id },
    { $set: { attended: true, attendedHours: hours }, $setOnInsert: { rsvpedAt: new Date() } },
    { new: true, upsert: true }
  );
  res.json(rsvp);
});

// Likes
r.post("/events/:id/like", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const like = await Like.findOneAndUpdate(
    { userId, eventId: req.params.id },
    { $setOnInsert: { userId, eventId: req.params.id } },
    { upsert: true, new: true }
  );
  res.json(like);
});

r.delete("/events/:id/like", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  await Like.findOneAndDelete({ userId, eventId: req.params.id });
  res.sendStatus(204);
});

// Me
r.get("/me/rsvps", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const list = await RSVP.find({ userId }).populate("eventId").sort({ createdAt: -1 });
  res.json(list);
});

r.get("/me/likes", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const list = await Like.find({ userId }).populate("eventId").sort({ createdAt: -1 });
  res.json(list);
});

r.get("/me/history", requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const list = await RSVP.find({ userId, attended: true }).populate("eventId").sort({ checkOutAt: -1, updatedAt: -1 });
  res.json(list);
});

export default r;
