import { Router } from "express";
import mongoose from "mongoose";
import { approveGroup, rejectGroup } from "../../controllers/groups.controller.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";
import Group from "../models/Groups.js";
import { notify } from "../services/notify.js";

const r = Router();

const getReqUserId = (req) =>
  (typeof req.auth === "function" ? req.auth()?.userId : req.auth?.userId) || null;

// List groups (unchanged except using custom requireAuth)
r.get("/", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { status = "", page = 1, pageSize = 50, query = "" } = req.query;
    const p = Math.max(1, Number(page) || 1);
    const ps = Math.min(200, Math.max(1, Number(pageSize) || 50));

    const find = {};
    if (status) find.status = status;
    if (query) find.$text = { $search: String(query) };

    const [items, total] = await Promise.all([
      Group.find(find).sort({ createdAt: -1 }).skip((p - 1) * ps).limit(ps).lean(),
      Group.countDocuments(find),
    ]);

    const shaped = items.map((g) => ({
      ...g,
      membersCount: Array.isArray(g.members) ? g.members.length : 0,
    }));

    req.isAdmin = true;

    res.json({ items: shaped, total, page: p, pageSize: ps });
  } catch (e) {
    next(e);
  }
});

// Moderate (existing)
r.post("/:id/approve", requireAuth, requireRole("admin"), approveGroup);
r.post("/:id/reject", requireAuth, requireRole("admin"), rejectGroup);

// NEW: Warn group owner
r.post("/:id/warn", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.sendStatus(404);

    const g = await Group.findById(id).lean();
    if (!g) return res.sendStatus(404);

    const ownerId = g.createdBy || g.ownerId || g.organizerId;
    if (ownerId) {
      await notify({
        userId: ownerId,
        type: "Group Warning",
        data: {
          groupId: String(g._id),
          groupName: g.name || "Group",
          message: req.body?.message || "Your group has received a warning from an admin.",
        },
        link: `/groups/${g._id}`,
      });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// NEW: Delete group
r.delete("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.sendStatus(404);

    const g = await Group.findById(id);
    if (!g) return res.sendStatus(404);

    const ownerId = g.createdBy || g.ownerId || g.organizerId;

    await g.deleteOne();

    if (ownerId) {
      notify({
        userId: ownerId,
        type: "Group Deleted",
        data: { groupId: String(id), message: "Your group has been removed by an admin." },
      });
    }

    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

export default r;
