// server/Backend/routes/admin.organizerApplications.routes.js
import express from "express";
import OrganizerApplication from "../models/OrganizerApplication.js";
import { requireRole } from "../../middleware/roles.js";
// Prefer the same Clerk instance you use elsewhere:
import { clerk } from "../../api/clerk.js"; // ✅ keep consistent with server.js

const router = express.Router();

/** Normalize action/status coming from clients */
function normalizeAction(body = {}) {
  let { action, status } = body || {};
  if (status && !action) {
    if (status === "approved") action = "approve";
    if (status === "rejected") action = "reject";
  }
  if (action) action = String(action).toLowerCase().trim();
  return action;
}

// List (?status=pending|approved|rejected)
router.get("/", requireRole("admin"), async (req, res) => {
  const { status } = req.query;
  const q = status ? { status } : {};
  const apps = await OrganizerApplication.find(q).sort({ createdAt: -1 }).lean();
  return res.json({ success: true, apps });
});

// Approve/Reject
router.put("/:id", requireRole("admin"), async (req, res) => {
  try {
    // Helpful debug (safe—no secrets):
    if (process.env.NODE_ENV !== "production") {
      console.log("[admin.apps PUT] body:", req.body);
    }

    const appDoc = await OrganizerApplication.findById(req.params.id);
    if (!appDoc) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    const action = normalizeAction(req.body);
    if (action !== "approve" && action !== "reject") {
      return res.status(400).json({
        success: false,
        message:
          "Invalid action. Send { action: 'approve'|'reject' } or { status: 'approved'|'rejected' }",
        received: req.body,
      });
    }

    if (action === "approve") {
      // Single-role rule: set Clerk role exactly to "organizer"
      await clerk.users.updateUserMetadata(appDoc.userId, {
        publicMetadata: { role: "organizer" },
      });
      appDoc.status = "approved";
    } else {
      appDoc.status = "rejected";
    }

    if (typeof req.body?.notes === "string") {
      appDoc.notes = req.body.notes;
    }
    appDoc.reviewedBy = req.auth?.userId || appDoc.reviewedBy;

    await appDoc.save();

    return res.json({ success: true, status: appDoc.status, id: appDoc._id });
  } catch (err) {
    console.error("[admin.apps PUT] error:", err);
    return res.status(500).json({ success: false, message: "Server error updating application" });
  }
});

export default router;
