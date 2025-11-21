import { Router } from "express";
import mongoose from "mongoose";
import Event from "../models/Event.js";
import RSVP from "../models/RSVP.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { notify } from "../services/notify.js";

const r = Router();

const getReqUserId = (req) =>
  (typeof req.auth === "function" ? req.auth()?.userId : req.auth?.userId) || null;

/**
 * GET /api/admin/events
 * Query:
 *  - status: "", "pending", "approved", "rejected", "cancelled"
 *  - q: free-text over title/group/category
 *  - page: 1-based
 *  - limit: default 50
 *  - includeCounts: "1" to include attendeesCount (RSVPs)
 */
r.get("/", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { status = "", q = "", page = 1, limit = 50, includeCounts = "0" } = req.query;

    const lim = Math.max(1, Math.min(100, Number(limit) || 50));
    const pg = Math.max(1, Number(page) || 1);
    const skip = (pg - 1) * lim;

    const filter = {};
    if (status) filter.status = status;
    if (q) {
      const rx = new RegExp(q, "i");
      filter.$or = [{ title: rx }, { group: rx }, { category: rx }];
    }

    const [total, itemsRaw] = await Promise.all([
      Event.countDocuments(filter),
      Event.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
    ]);

    let items = itemsRaw;
    if (includeCounts === "1" && itemsRaw.length) {
      const ids = itemsRaw.map((e) => e._id);
      const counts = await RSVP.aggregate([
        { $match: { eventId: { $in: ids } } },
        { $group: { _id: "$eventId", n: { $sum: 1 } } },
      ]);
      const map = new Map(counts.map((c) => [String(c._id), c.n]));
      items = itemsRaw.map((e) => ({ ...e, attendeesCount: map.get(String(e._id)) || 0 }));
    }

    res.json({ items, total, page: pg, pageSize: lim });
  } catch (err) {
    next(err);
  }
});

// Approve
r.post("/:id/approve", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const ev = await Event.findById(req.params.id);
    if (!ev) return res.sendStatus(404);

    ev.status = "approved";
    ev.approvedAt = new Date();
    ev.approvedBy = getReqUserId(req) || undefined;
    await ev.save();

    // Notify organizer (non-blocking)
    const organizerId = ev.createdBy || ev.organizerId || ev.ownerId;
    if (organizerId) {
      notify({
        userId: organizerId,
        type: "Event Approved",
        data: { eventId: String(ev._id), title: ev.title || "Event" },
        link: `/events/${ev._id}`,
      });
    }

    res.json(ev);
  } catch (err) {
    next(err);
  }
});

// Reject
r.post("/:id/reject", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const ev = await Event.findById(req.params.id);
    if (!ev) return res.sendStatus(404);

    ev.status = "rejected";
    await ev.save();

    const organizerId = ev.createdBy || ev.organizerId || ev.ownerId;
    if (organizerId) {
      notify({
        userId: organizerId,
        type: "Event Rejected",
        data: { eventId: String(ev._id), title: ev.title || "Event" },
        link: `/events/${ev._id}`,
      });
    }

    res.json(ev);
  } catch (err) {
    next(err);
  }
});

// NEW: Warn organizer about event
r.post("/:id/warn-organizer", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.sendStatus(404);

    const ev = await Event.findById(id).lean();
    if (!ev) return res.sendStatus(404);

    const organizerId = ev.createdBy || ev.organizerId || ev.ownerId;
    if (organizerId) {
      await notify({
        userId: organizerId,
        type: "Event Warning",
        data: {
          eventId: String(ev._id),
          title: ev.title || "Event",
          message: req.body?.message || "Your event has received a warning from an admin.",
        },
        link: `/events/${ev._id}`,
      });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// NEW: Delete event
r.delete("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.sendStatus(404);

    const ev = await Event.findById(id);
    if (!ev) return res.sendStatus(404);

    const organizerId = ev.createdBy || ev.organizerId || ev.ownerId;

    await ev.deleteOne();

    if (organizerId) {
      notify({
        userId: organizerId,
        type: "Event Deleted",
        data: { eventId: String(id), message: "Your event has been removed by an admin." },
      });
    }

    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

export default r;
