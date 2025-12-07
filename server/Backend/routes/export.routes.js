// Backend/routes/export.routes.js
import express from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";
import {
  exportUsers,
  exportGroups,
  exportEvents,
  exportReports,
  exportOrganizerEvents,
  exportOrganizerAttendees,
} from "../controllers/export.controller.js";

const router = express.Router();

// Admin export routes
router.get("/users", requireAuth, requireRole("admin"), exportUsers);
router.get("/groups", requireAuth, requireRole("admin"), exportGroups);
router.get("/events", requireAuth, requireRole("admin"), exportEvents);
router.get("/reports", requireAuth, requireRole("admin"), exportReports);

// Organizer export routes
router.get("/organizer/events", requireAuth, requireRole("organizer"), exportOrganizerEvents);
router.get("/organizer/attendees", requireAuth, requireRole("organizer"), exportOrganizerAttendees);

export default router;
