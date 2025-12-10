import express from "express";
import { clerkClient } from "@clerk/express";
import { requireRole } from "../../middleware/requireRole.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { notify } from "../services/notify.js";

const router = express.Router();

// GET /api/admin/users?page=&pageSize=&query=
router.get("/", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { page = 1, pageSize = 50, query = "" } = req.query;
    const p = Math.max(1, Number(page) || 1);
    const ps = Math.min(200, Math.max(1, Number(pageSize) || 50));

    const list = await clerkClient.users.getUserList({
      limit: ps,
      offset: (p - 1) * ps,
      query: query || undefined,
    });

const items = (list?.data || []).map((u) => ({
  _id: u.id,
  name:
    [u.firstName, u.lastName].filter(Boolean).join(" ") ||
    u.username ||
    u.id,
  email:
    u.primaryEmailAddress?.emailAddress ||
    (u.emailAddresses?.[0]?.emailAddress ?? ""),
  username: u.username || null,
  image: u.imageUrl || null,           // 👈 THIS is the key line
  role: u.publicMetadata?.role || "user",
  status: u.banned ? "banned" : "active",
  createdAt: u.createdAt
    ? new Date(u.createdAt).toISOString()
    : null,
}));


    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e?.message || "Failed to fetch users" });
  }
});

// PUT /api/admin/users/:id/role
router.put("/users/:id/role", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!["user", "organizer", "admin"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }
    await clerkClient.users.updateUserMetadata(id, {
      publicMetadata: { role },
    });
    res.json({ success: true, role });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// NEW: POST /api/admin/users/:id/warn
router.post("/users/:id/warn", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params; // Clerk user id
    await notify({
      userId: id,
      type: "Account Warning",
      data: { message: req.body?.message || "Your account has received a warning from an admin." },
      link: "/my-dashboard",
    });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// NEW: POST /api/admin/users/:id/ban
router.post("/users/:id/ban", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    // If you actually ban at Clerk:
    // await clerkClient.users.banUser(id);
    await notify({
      userId: id,
      type: "Account Banned",
      data: { message: "Your account has been banned by an admin." },
    });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
