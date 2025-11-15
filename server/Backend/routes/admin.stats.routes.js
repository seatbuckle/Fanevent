// server/Backend/routes/admin.stats.routes.js
import express from "express";
import OrganizerApplication from "../models/OrganizerApplication.js";
import User from "../models/User.js"; // if you have one
import Group from "../models/Groups.js";
import Event from "../models/Event.js";
import { requireRole } from "../../middleware/roles.js";

const router = express.Router();

router.get("/", requireRole("admin"), async (req, res) => {
  const [totalUsers, fandomGroups, activeEvents, pendingReports] = await Promise.all([
    User.countDocuments({}), // or Clerk count if you sync users
    Group.countDocuments({}),
    Event.countDocuments({ status: "active" }),
    Promise.resolve(0), // replace with your reports store
  ]);

  const pendingApps = await OrganizerApplication.countDocuments({ status: "pending" });

  res.json({
    success: true,
    stats: { totalUsers, fandomGroups, activeEvents, reports: pendingReports, pendingApps },
  });
});

export default router;
