// server/routes/groups.admin.js
import { Router } from "express";
import { approveGroup, rejectGroup } from "../../controllers/groups.controller.js";
import { requireAuth } from "@clerk/express";
import { requireRole } from "../../middleware/requireRole.js";
import Group from "../models/Groups.js";

const r = Router();

r.get(
  "/",
  requireAuth(),
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const { status = "", page = 1, pageSize = 50, query = "" } = req.query;
      const p = Math.max(1, Number(page) || 1);
      const ps = Math.min(200, Math.max(1, Number(pageSize) || 50));

      const find = {};
      if (status) find.status = status; // pending|approved|rejected
      if (query) find.$text = { $search: String(query) };

      const [items, total] = await Promise.all([
        Group.find(find)
          .sort({ createdAt: -1 })
          .skip((p - 1) * ps)
          .limit(ps)
          .lean(),
        Group.countDocuments(find),
      ]);

      const shaped = items.map((g) => ({
        ...g,
        membersCount: Array.isArray(g.members) ? g.members.length : 0,
      }));

      // Mark request as admin for controller getGroup() if you reuse it elsewhere
      req.isAdmin = true;

      res.json({ items: shaped, total, page: p, pageSize: ps });
    } catch (e) {
      next(e);
    }
  }
);

// Admin moderates
r.post("/:id/approve", requireAuth(), requireRole("admin"), approveGroup);
r.post("/:id/reject", requireAuth(), requireRole("admin"), rejectGroup);

export default r;
