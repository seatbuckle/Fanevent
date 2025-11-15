import express from "express";
import { clerkClient } from "@clerk/express";
import { requireRole } from "../../middleware/requireRole.js";
import { requireAuth } from "../../middleware/requireAuth.js";

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
      name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || u.id,
      email: u.primaryEmailAddress?.emailAddress || (u.emailAddresses?.[0]?.emailAddress ?? ""),
      role: u.publicMetadata?.role || "user",
      status: u.banned ? "banned" : "active",
      createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : null,
    }));

    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e?.message || "Failed to fetch users" });
  }
});

// PUT /api/admin/users/:id/role  body: { role: "user" | "organizer" | "admin" }
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

export default router;
