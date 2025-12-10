// server/routes/events.public.js
import { Router } from "express";
import Event from "../models/Event.js";
import RSVP from "../models/RSVP.js";


const r = Router();

// GET /api/events  – list approved events
r.get("/", async (req, res) => {
  try {
    const events = await Event.find({ status: "approved" })
      .sort({ startAt: 1 })
      .lean();

    if (!events.length) {
      return res.json([]);
    }

    const eventIds = events.map((e) => e._id);

    // Count RSVPs that are NOT canceled for those events
    const rsvpCounts = await RSVP.aggregate([
      {
        $match: {
          eventId: { $in: eventIds },
          status: { $ne: "canceled" },
        },
      },
      {
        $group: {
          _id: "$eventId",
          count: { $sum: 1 },
        },
      },
    ]);

    const countMap = {};
    for (const row of rsvpCounts) {
      countMap[String(row._id)] = row.count;
    }

    const withCounts = events.map((ev) => ({
      ...ev,
      attendingCount: countMap[String(ev._id)] || 0,
    }));

    res.json(withCounts);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch events" });
  }
});


// 🔥 GET /api/events/:id/recommended
r.get("/:id/recommended", async (req, res) => {
  try {
    const current = await Event.findById(req.params.id).lean();

    if (!current || current.status === "rejected") {
      return res.sendStatus(404);
    }

    // base query: other approved events
    const baseQuery = {
      _id: { $ne: current._id },
      status: "approved",
    };

    // similarity rules:
    // - same groupId
    // - OR overlapping tags
    // - OR same city
    const or = [];

    if (current.groupId) {
      or.push({ groupId: current.groupId });
    }

    if (Array.isArray(current.tags) && current.tags.length > 0) {
      or.push({ tags: { $in: current.tags } });
    }

    if (current.city) {
      or.push({ city: current.city });
    }

    let query = { ...baseQuery };
    if (or.length > 0) {
      query.$or = or;
    }

    let items = await Event.find(query)
      .sort({ startAt: 1 })
      .limit(10)
      .lean();

    // 👉 Fallback: if no "similar" events, just show other approved events
    if (!items.length) {
      items = await Event.find(baseQuery)
        .sort({ startAt: 1 })
        .limit(10)
        .lean();
    }

    return res.json({ items });
  } catch (e) {
    console.error("recommended events error", e);
    return res
      .status(500)
      .json({ message: "Failed to load recommended events" });
  }
});

// GET /api/events/:id – single event
r.get("/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).lean();
    if (!event) return res.status(404).json({ message: "Event not found" });

    const attendingCount = await RSVP.countDocuments({
      eventId: event._id,
      status: { $ne: "canceled" }, // or status: "confirmed"
    });

    res.json({
      ...event,
      attendingCount,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch event" });
  }
});


export default r;
