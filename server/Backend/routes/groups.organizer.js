// server/Backend/routes/groups.organizer.js
import { Router } from "express";
import Group from "../models/Groups.js";             // <-- plural, matches your file
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";

const r = Router();

const getReqUserId = (req) => {
  try { return typeof req.auth === "function" ? req.auth()?.userId || null : req.auth?.userId || null; }
  catch { return null; }
};

const MAX_DOC_BYTES = 8 * 1024 * 1024;

function approxSizeBytes(obj) {
  try { return Buffer.byteLength(JSON.stringify(obj), "utf8"); }
  catch { return Number.MAX_SAFE_INTEGER; }
}

function sanitizeGroupPayload(body) {
  const out = {};
  out.name = String(body?.name || "").trim();
  out.category = String(body?.category || "General").trim();
  out.description = String(body?.description || "").trim();
  out.image = typeof body?.image === "string" ? body.image : "";
  out.tags = Array.isArray(body?.tags) ? body.tags.slice(0, 12).map((t) => String(t)) : [];
  return out;
}

// POST /api/organizer/groups
r.post("/", requireAuth, requireRole("organizer"), async (req, res, next) => {
  try {
    const userId = getReqUserId(req); // Clerk id (string)
    if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

    const payload = sanitizeGroupPayload(req.body);
    if (!payload.name) {
      return res.status(400).json({ ok: false, message: "Group name required" });
    }

    const docCandidate = { ...payload, createdBy: userId, status: "pending", members: [] };
    const size = approxSizeBytes(docCandidate);
    if (size > MAX_DOC_BYTES) {
      return res.status(413).json({ ok: false, message: "Payload too large" });
    }

    const doc = await Group.create(docCandidate);
    res.status(201).json(doc);
  } catch (err) {
    console.error("❌ Create group failed:", err);
    next(err);
  }
});

export default r;
