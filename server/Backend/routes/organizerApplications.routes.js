// server/Backend/routes/organizerApplications.routes.js
import express from "express";
import { requireAuth } from "@clerk/express";
import mongoose from "mongoose";
import OrganizerApplication from "../models/OrganizerApplication.js";

const router = express.Router();

// Create or return existing
router.post("/", requireAuth(), async (req, res) => {
  const { userId } = req.auth;
  const data = req.body || {};

  let doc = await OrganizerApplication.findOne({ userId });
  if (!doc) {
    doc = await OrganizerApplication.create({ userId, status: "pending", ...data });
  }

  res.json({ ok: true, status: doc.status });
});

// My status
router.get("/me", requireAuth(), async (req, res) => {
  const { userId } = req.auth;
  const doc = await OrganizerApplication.findOne({ userId }).lean();
  res.json({ ok: true, status: doc?.status ?? null });
});

export default router;
