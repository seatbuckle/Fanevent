// server/server.js
import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { serve } from 'inngest/express';
import { clerkMiddleware, requireAuth } from '@clerk/express';
import { ensureRoleDefault } from './middleware/ensureRoleDefault.js'; 


// Adjust these import paths to your tree:
import connectDB from './Backend/config/db.js';
import { inngest, functions } from './Backend/inngest/index.js'; 
import organizerApplicationsRouter from "./Backend/routes/organizerApplications.routes.js";
import adminOrganizerAppsRouter from "./Backend/routes/admin.organizerApplications.routes.js";
import adminUsers from "./Backend/routes/admin.users.routes.js";
import adminStats from "./Backend/routes/admin.stats.routes.js";
import eventsPublic from "./Backend/routes/events.public.js";
import eventsOrganizer from "./Backend/routes/events.organizer.js";
import eventsAdmin from "./Backend/routes/events.admin.js";
import engagement from "./Backend/routes/engagement.js";
import socialRouter from "./Backend/routes/events.social.js";
import groupsPublic from "./Backend/routes/groups.public.js";
import groupsOrganizer from "./Backend/routes/groups.organizer.js";
import groupsAdmin from "./Backend/routes/groups.admin.js";
import messagesRouter from "./Backend/routes/messages.routes.js";


// Clerk server SDK instance
import { clerk } from './api/clerk.js'; 

const app = express();

// DB first
await connectDB();

/**
 * Inngest FIRST, with RAW body.
 * Do NOT put express.json() or Clerk before this.
 */
app.use(
  '/api/inngest',
  express.raw({ type: '*/*' }),
  serve({ client: inngest, functions })
);

// Now your usual middleware/routes
app.use(cors());
app.use(express.json({ limit: "20mb" })); 
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// If Clerk is global, skip it for /api/inngest
app.use((req, res, next) => {
  if (req.path.startsWith('/api/inngest')) return next();
  return clerkMiddleware()(req, res, next);
});

// Ensure default role exists for newly seen users
app.use(ensureRoleDefault);

app.get('/api/_whoami', requireAuth(), (req, res) => {
  const a = typeof req.auth === 'function' ? req.auth() : req.auth
  res.json({
    ok: true,
    userId: a?.userId || null,
  })
})

// -----------------------------
// Role utilities & auth routes
// -----------------------------

// Helper: read role from Clerk
async function getRole(userId) {
  const user = await clerk.users.getUser(userId);
  return user.publicMetadata?.role || 'user';
}

// GET role for current signed-in user
app.get('/api/auth/role', requireAuth(), async (req, res) => {
  try {
    const role = await getRole(req.auth.userId);
    res.json({ ok: true, role });
  } catch (e) {
    res.status(500).json({ ok: false, message: 'Failed to fetch role' });
  }
});

// Admin-only guard (server-side)
async function requireAdmin(req, res, next) {
  try {
    const role = await getRole(req.auth.userId);
    if (role !== 'admin') {
      return res.status(403).json({ ok: false, message: 'Admin only' });
    }
    next();
  } catch (e) {
    res.status(500).json({ ok: false, message: 'Failed to verify role' });
  }
}

// Admin approves organizer application → promote to organizer
app.post('/api/admin/organizers/approve', requireAuth(), requireAdmin, async (req, res) => {
  try {
    const { applicantUserId } = req.body; // Clerk user ID
    if (!applicantUserId) {
      return res.status(400).json({ ok: false, message: 'Missing applicantUserId' });
    }
    // Single-role rule: set role exactly to "organizer"
    await clerk.users.updateUserMetadata(applicantUserId, {
      publicMetadata: { role: 'organizer' }
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: 'Failed to update role' });
  }
});

// (Optional) Admin demote back to user
app.post('/api/admin/organizers/demote', requireAuth(), requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body; // Clerk user ID
    if (!userId) {
      return res.status(400).json({ ok: false, message: 'Missing userId' });
    }
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: { role: 'user' }
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: 'Failed to update role' });
  }
});


// -----------------------------
// Existing admin/users routes
// -----------------------------
app.use("/api/admin/users", adminUsers);

// Existing routes
app.use('/api/organizer-applications', organizerApplicationsRouter);
app.use('/api/admin/organizer-applications', adminOrganizerAppsRouter);


app.use("/api/events", eventsPublic);
app.use("/api/organizer/groups", (req, _res, next) => {
  // You should see "Bearer ..." and then, after Clerk runs in the route, req.auth should exist.
  console.log("REQ AUTH HDR:", req.headers.authorization ? "present" : "missing");
  next();
});
app.use("/api/admin/events", eventsAdmin);
app.use("/api/admin/stats", adminStats);
app.use("/api", engagement);
app.use("/api/events", socialRouter);
app.use("/api/groups", groupsPublic);
app.use("/api/organizer/groups", groupsOrganizer);
app.use("/api/admin/groups", groupsAdmin);
app.use("/api/organizer/events", eventsOrganizer);
app.use('/api/messages', messagesRouter);

// --- Global error handler: keep at the end ---
app.use((err, req, res, next) => {
  // Log full error to server console
  console.error("❌ Server error:", err);

  // Try to surface helpful message to client during dev
  const status = err.status || 500;
  const message =
    err?.message ||
    err?.toString?.() ||
    "Internal Server Error";
  res.status(status).json({ ok: false, message });
});


// Health check
app.get('/', (req, res) => res.send('Server is Live!'));

// ✅ Export the app for Vercel
export default app;

// ✅ Local-only listener for dev:
if (!process.env.VERCEL) {
  const port = process.env.PORT || 3000;
  app.listen(port, () =>
    console.log(`Server listening at http://localhost:${port}`)
  );
}