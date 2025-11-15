// server/routes/events.admin.js
import { Router } from "express";
import Event from "../models/Event.js";
import RSVP from "../models/RSVP.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";

const r = Router();

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

    // Optional RSVP counts
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
r.post("/:id/approve", requireAuth, requireRole("admin"), async (req, res) => {
  const ev = await Event.findById(req.params.id);
  if (!ev) return res.sendStatus(404);
  ev.status = "approved";
  ev.approvedAt = new Date();
  ev.approvedBy = (typeof req.auth === "function" ? req.auth()?.userId : req.auth?.userId) || undefined;
  await ev.save();
  res.json(ev);
});

// Reject
r.post("/:id/reject", requireAuth, requireRole("admin"), async (req, res) => {
  const ev = await Event.findById(req.params.id);
  if (!ev) return res.sendStatus(404);
  ev.status = "rejected";
  await ev.save();
  res.json(ev);
});

export default r;
