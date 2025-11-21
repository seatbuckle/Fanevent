import express from "express";
import cors from "cors";
import "dotenv/config";
import { serve } from "inngest/express";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import { ensureRoleDefault } from "./middleware/ensureRoleDefault.js";

import connectDB from "./Backend/config/db.js";
import { inngest, functions } from "./Backend/inngest/index.js";
import organizerApplicationsRouter from "./Backend/routes/organizerApplications.routes.js";
import adminOrganizerAppsRouter from "./Backend/routes/admin.organizerApplications.routes.js";
import adminUsers from "./Backend/routes/admin.users.routes.js";
import adminStats from "./Backend/routes/admin.stats.routes.js";
import adminReportsRouter from "./Backend/routes/admin.reports.routes.js";
import reportsRouter from "./Backend/routes/reports.routes.js";
import eventsPublic from "./Backend/routes/events.public.js";
import eventsOrganizer from "./Backend/routes/events.organizer.js";
import eventsAdmin from "./Backend/routes/events.admin.js";
import engagement from "./Backend/routes/engagement.js";
import socialRouter from "./Backend/routes/events.social.js";
import groupsPublic from "./Backend/routes/groups.public.js";
import groupsOrganizer from "./Backend/routes/groups.organizer.js";
import groupsAdmin from "./Backend/routes/groups.admin.js";
import organizerAnnouncements from "./Backend/routes/announcements.organizer.js";
import notificationsRoutes from "./Backend/routes/notifications.routes.js";
import { clerk } from "./api/clerk.js";

const app = express();

// (optional) quick request log
app.use((req, res, next) => { console.log("→", req.method, req.path); next(); });

// 1) DB FIRST
await connectDB();

/**
 * 2) Inngest FIRST with RAW body — must come
 *    BEFORE express.json() and Clerk middleware.
 */
app.use(
  "/api/inngest",
  express.raw({ type: "*/*" }),
  serve({ client: inngest, functions })
);

// 3) Standard middleware
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

/**
 * 4) Clerk webhook (no Svix) → forwards to Inngest
 *    Keep this BEFORE applying clerkMiddleware,
 *    or explicitly skip it below.
 */
app.post("/api/webhooks/clerk", async (req, res) => {
  try {
    const { type, data } = req.body || {};
    if (!type || !data) {
      return res.status(400).json({ ok: false, message: "Bad Clerk payload" });
    }
    const name = `clerk/${String(type).replace(".", "/")}`;
    await inngest.send({ name, data });
    console.log("✅ Forwarded Clerk event to Inngest:", name, "id:", data?.id || "(no id)");
    res.json({ ok: true });
  } catch (e) {
    console.error("❌ Forward Clerk → Inngest failed:", e?.message);
    res.status(500).json({ ok: false, message: "Forward failed" });
  }
});

/**
 * 5) Clerk middleware — skip it for /api/inngest and /api/webhooks/clerk
 *    so those never 401 due to auth.
 */
app.use((req, res, next) => {
  const p = req.path || req.url || "";
  if (p.startsWith("/api/inngest")) return next();
  if (p.startsWith("/api/webhooks/clerk")) return next();
  return clerkMiddleware()(req, res, next);
});

// Ensure default role exists for newly seen users
app.use(ensureRoleDefault);

// Whoami
app.get("/api/_whoami", requireAuth(), (req, res) => {
  const a = typeof req.auth === "function" ? req.auth() : req.auth;
  res.json({ ok: true, userId: a?.userId || null });
});

// Role helpers
async function getRole(userId) {
  const user = await clerk.users.getUser(userId);
  return user.publicMetadata?.role || "user";
}

app.get("/api/auth/role", requireAuth(), async (req, res) => {
  try {
    const role = await getRole(req.auth.userId);
    res.json({ ok: true, role });
  } catch {
    res.status(500).json({ ok: false, message: "Failed to fetch role" });
  }
});

async function requireAdmin(req, res, next) {
  try {
    const role = await getRole(req.auth.userId);
    if (role !== "admin") return res.status(403).json({ ok: false, message: "Admin only" });
    next();
  } catch {
    res.status(500).json({ ok: false, message: "Failed to verify role" });
  }
}

app.post("/api/admin/organizers/approve", requireAuth(), requireAdmin, async (req, res) => {
  try {
    const { applicantUserId } = req.body;
    if (!applicantUserId) return res.status(400).json({ ok: false, message: "Missing applicantUserId" });
    await clerk.users.updateUserMetadata(applicantUserId, { publicMetadata: { role: "organizer" } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false, message: "Failed to update role" });
  }
});

app.post("/api/admin/organizers/demote", requireAuth(), requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ ok: false, message: "Missing userId" });
    await clerk.users.updateUserMetadata(userId, { publicMetadata: { role: "user" } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false, message: "Failed to update role" });
  }
});

// Routes
app.use("/api/reports", reportsRouter);
app.use("/api/admin/reports", adminReportsRouter);
app.use("/api/admin/users", adminUsers);
app.use("/api/organizer-applications", organizerApplicationsRouter);
app.use("/api/admin/organizer-applications", adminOrganizerAppsRouter);
app.use("/api/events", eventsPublic);
app.use("/api/organizer/groups", (req, _res, next) => { console.log("REQ AUTH HDR:", req.headers.authorization ? "present" : "missing"); next(); });
app.use("/api/admin/events", eventsAdmin);
app.use("/api/admin/stats", adminStats);
app.use("/api", engagement);
app.use("/api/events", socialRouter);
app.use("/api/groups", groupsPublic);
app.use("/api/organizer/groups", groupsOrganizer);
app.use("/api/admin/groups", groupsAdmin);
app.use("/api/organizer/events", eventsOrganizer);
app.use("/api/organizer/announcements", organizerAnnouncements);
app.use("/api/notifications", notificationsRoutes);

// Error & health
app.use((err, req, res, next) => {
  console.error("❌ Server error:", err);
  res.status(err.status || 500).json({ ok: false, message: err?.message || "Internal Server Error" });
});

app.get("/", (_req, res) => res.send("Server is Live!"));

export default app;

if (!process.env.VERCEL) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Server listening at http://localhost:${port}`));
}
