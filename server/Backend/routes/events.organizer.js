// server/Backend/routes/events.organizer.js
import { Router } from "express";
import mongoose from "mongoose";
import Event from "../models/Event.js";
import RSVP from "../models/RSVP.js";
import Like from "../models/Like.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { clerkClient as clerk } from '@clerk/express'

const r = Router();

/* ========== Helpers ========== */

const getReqUserId = (req) => {
  try {
    // Clerk new shape prefers req.auth() as a function
    if (typeof req.auth === "function") return req.auth()?.userId || null;
    return req.auth?.userId || null;
  } catch {
    return null;
  }
};

async function getRole(userId) {
  try {
    const u = await clerk.users.getUser(userId);
    return u?.publicMetadata?.role || "user";
  } catch {
    return "user";
  }
}

async function requireOrganizer(req, res, next) {
  const uid = getReqUserId(req);
  if (!uid) return res.status(401).json({ message: "Unauthorized" });

  const role = await getRole(uid);
  if (role !== "organizer" && role !== "admin") {
    return res.status(403).json({ message: "Organizer only" });
  }
  next();
}

async function safeGetUserProfile(userId) {
  try {
    const u = await clerk.users.getUser(userId);
    const email =
      u?.emailAddresses?.[0]?.emailAddress ||
      u?.primaryEmailAddress?.emailAddress ||
      "";
    const name =
      [u?.firstName, u?.lastName].filter(Boolean).join(" ") ||
      u?.username ||
      email ||
      "User";
    return { name, email };
  } catch {
    return { name: "User", email: "" };
  }
}

const ALLOWED_FIELDS = new Set([
  "title",
  "image",
  "media",
  "tags",
  "description",
  "groupId",
  "group",
  "category",
  "locationName",
  "address",
  "city",
  "state",
  "zipCode",
  "startAt",
  "endAt",
  "capacity",
  "price",
]);

function pickEventFields(body) {
  const b = { ...(body || {}) };

  // 🧹 Legacy → current
  if (!b.group && b.groupName) b.group = b.groupName;
  if (!b.category && b.group) b.category = b.group;

  const out = {};
  for (const k of Object.keys(b)) {
    if (ALLOWED_FIELDS.has(k)) out[k] = b[k];
  }

  // Media: keep only known keys and preserve title/by
  if (out.media && Array.isArray(out.media)) {
    out.media = out.media.slice(0, 6).map((m = {}) => {
      const rawUrl = typeof m.url === "string" ? m.url : "";
      let type = m.type;
      if (!type) {
        if (rawUrl.startsWith("data:video") || /\.(mp4|mov|webm)(\?|$)/i.test(rawUrl)) type = "video";
        else if (/youtube\.com|youtu\.be/.test(rawUrl)) type = "youtube";
        else type = "image";
      }
      return {
        type: ["image", "video", "youtube"].includes(type) ? type : "image",
        url: rawUrl,
        title: typeof m.title === "string" ? m.title.trim() : "",
        by: typeof m.by === "string" ? m.by.trim() : "",
      };
    });
  }

  // Dates
  if (out.startAt) out.startAt = new Date(out.startAt);
  if (out.endAt) out.endAt = new Date(out.endAt);

  // Tags
  if (out.tags && !Array.isArray(out.tags)) out.tags = [];

  // Hosted by: keep category mirrored unless client explicitly sent category
  if (out.group && !("category" in b)) out.category = out.group;

  return out;
}

/* ========== Routes ========== */

// GET /api/organizer/events/mine
r.get("/mine", requireAuth, requireRole("organizer"), async (req, res, next) => {
  try {
    const uid = getReqUserId(req);
    if (!uid) return res.status(401).json({ message: "Unauthorized" });

    const items = await Event.find({ createdBy: uid }).sort({ startAt: 1 }).lean();
    res.json(items || []);
  } catch (err) {
    next(err);
  }
});

// POST /api/organizer/events
r.post("/", requireAuth, requireOrganizer, async (req, res, next) => {
  try {
    const createdBy = getReqUserId(req);
    if (!createdBy) return res.status(401).json({ message: "Unauthorized" });

    const fields = pickEventFields(req.body);
    const ev = await Event.create({
      ...fields,
      createdBy,          // Clerk user id string
      status: "pending",  // organizer-created events should be reviewed
    });

    res.status(201).json(ev);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/organizer/events/:id
r.patch("/:id", requireAuth, requireOrganizer, async (req, res, next) => {
  try {
    const uid = getReqUserId(req);
    if (!uid) return res.status(401).json({ message: "Unauthorized" });

    const ev = await Event.findById(req.params.id);
    if (!ev) return res.sendStatus(404);

    const role = await getRole(uid);
    const isOwner = String(ev.createdBy) === String(uid);
    if (role !== "admin" && !isOwner) return res.sendStatus(403);

    if (ev.status === "cancelled") {
      return res.status(400).json({ message: "Event not editable" });
    }

    Object.assign(ev, pickEventFields(req.body));
    ev.status = "pending";
    await ev.save();

    res.json(ev);
  } catch (err) {
    next(err);
  }
});

// GET /api/organizer/events/:id/attendees
r.get("/:id/attendees", requireAuth, requireOrganizer, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.json([]);

  const ev = await Event.findById(id).select("_id title createdBy").lean();
  if (!ev) return res.json([]);

  const requester = getReqUserId(req);
  const role = await getRole(requester);
  const isOwner = String(ev.createdBy) === String(requester);
  if (role !== "admin" && !isOwner) return res.sendStatus(403);

  const rsvps = await RSVP.find({ eventId: ev._id }).lean();
  if (!rsvps.length) return res.json([]);

  const userIds = [...new Set(rsvps.map((r) => r.userId))];
  const likes =
    (await Like.find({ eventId: ev._id, userId: { $in: userIds } }).lean().catch(() => [])) ||
    [];
  const likedSet = new Set(likes.map((l) => l.userId));

  const userMap = {};
  await Promise.allSettled(
    userIds.map(async (uid) => {
      userMap[uid] = await safeGetUserProfile(uid);
    })
  );

  const payload = rsvps.map((r) => ({
    _id: r._id,
    userId: r.userId,
    name: userMap[r.userId]?.name || "User",
    email: userMap[r.userId]?.email || "",
    eventId: String(ev._id),
    eventTitle: ev.title,
    rsvpAt: r.rsvpedAt,
    checkInAt: r.checkInAt || null,
    checkOutAt: r.checkOutAt || null,
    attended: !!r.attended,
    attendedHours: r.attendedHours ?? null,
    status: r.attended ? "confirmed" : "pending",
    liked: likedSet.has(r.userId),
  }));

  res.json(payload);
});

// DELETE /api/organizer/events/:id
r.delete("/:id", requireAuth, requireOrganizer, async (req, res, next) => {
  try {
    const uid = getReqUserId(req);
    if (!uid) return res.status(401).json({ message: "Unauthorized" });

    const ev = await Event.findById(req.params.id);
    if (!ev) return res.sendStatus(404);

    const role = await getRole(uid);
    const isOwner = String(ev.createdBy) === String(uid);
    if (role !== "admin" && !isOwner) return res.sendStatus(403);

    await ev.deleteOne();
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

export default r;
