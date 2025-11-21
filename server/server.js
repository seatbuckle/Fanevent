// server/server.js
import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { clerkMiddleware, requireAuth, clerkClient as clerk } from '@clerk/express';
import { ensureRoleDefault } from './middleware/ensureRoleDefault.js';

import connectDB from './Backend/config/db.js';
import { inngest, functions } from './Backend/inngest/index.js';
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
import organizerAnnouncements from './Backend/routes/announcements.organizer.js';
import notificationsRoutes from "./Backend/routes/notifications.routes.js";
import { inngestRouter } from './Backend/routes/inngest.route.js';

const app = express();

// 1) DB FIRST
await connectDB();

// 2) Basic middleware (BEFORE Clerk)
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// 3) Routes that should be PUBLIC (no Clerk middleware)
// Inngest endpoint - must be public for Inngest to call
app.use('/api/inngest', inngestRouter);

// Clerk webhook - must be public for Clerk to call
app.post('/api/webhooks/clerk', async (req, res) => {
  try {
    const { type, data } = req.body || {};
    if (!type || !data) return res.status(400).json({ ok: false, message: 'Bad Clerk payload' });

    const name = `clerk/${String(type).replace('.', '/')}`;
    await inngest.send({ name, data });
    console.log('✅ Forwarded Clerk event to Inngest:', name, 'id:', data?.id || '(no id)');
    return res.json({ ok: true });
  } catch (e) {
    console.error('❌ Forward Clerk → Inngest failed:', e?.message);
    return res.status(500).json({ ok: false, message: 'Forward failed' });
  }
});

// 4) Apply Clerk middleware to ALL other routes
app.use(clerkMiddleware());

// 5) Apply role default middleware AFTER Clerk
app.use(ensureRoleDefault);

// 6) Whoami endpoint - NOW it has access to req.auth
app.get('/api/_whoami', (req, res) => {
  const auth = typeof req.auth === 'function' ? req.auth() : req.auth;
  if (!auth?.userId) {
    return res.status(401).json({
      ok: false,
      userId: null,
      sessionId: null,
      reason: 'No session on request',
    });
  }
  return res.json({
    ok: true,
    userId: auth.userId,
    sessionId: auth.sessionId ?? null,
    orgId: auth.orgId ?? null,
  });
});

// Role helpers
async function getRole(userId) {
  const user = await clerk.users.getUser(userId);
  return user.publicMetadata?.role || 'user';
}

async function requireAdmin(req, res, next) {
  try {
    const role = await getRole(req.auth.userId);
    if (role !== 'admin') return res.status(403).json({ ok: false, message: 'Admin only' });
    next();
  } catch {
    res.status(500).json({ ok: false, message: 'Failed to verify role' });
  }
}

// Auth routes
app.get('/api/auth/role', requireAuth(), async (req, res) => {
  try {
    const role = await getRole(req.auth.userId);
    res.json({ ok: true, role });
  } catch {
    res.status(500).json({ ok: false, message: 'Failed to fetch role' });
  }
});

app.post('/api/admin/organizers/approve', requireAuth(), requireAdmin, async (req, res) => {
  try {
    const { applicantUserId } = req.body;
    if (!applicantUserId) return res.status(400).json({ ok: false, message: 'Missing applicantUserId' });
    await clerk.users.updateUserMetadata(applicantUserId, { publicMetadata: { role: 'organizer' } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false, message: 'Failed to update role' });
  }
});

app.post('/api/admin/organizers/demote', requireAuth(), requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ ok: false, message: 'Missing userId' });
    await clerk.users.updateUserMetadata(userId, { publicMetadata: { role: 'user' } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false, message: 'Failed to update role' });
  }
});

// All other routes
app.use('/api/reports', reportsRouter);
app.use('/api/admin/reports', adminReportsRouter);
app.use('/api/admin/users', adminUsers);
app.use('/api/organizer-applications', organizerApplicationsRouter);
app.use('/api/admin/organizer-applications', adminOrganizerAppsRouter);
app.use('/api/events', eventsPublic);
app.use('/api/admin/events', eventsAdmin);
app.use('/api/admin/stats', adminStats);
app.use('/api', engagement);
app.use('/api/events', socialRouter);
app.use('/api/groups', groupsPublic);
app.use('/api/organizer/groups', groupsOrganizer);
app.use('/api/admin/groups', groupsAdmin);
app.use('/api/organizer/events', eventsOrganizer);
app.use('/api/organizer/announcements', organizerAnnouncements);
app.use('/api/notifications', notificationsRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(err.status || 500).json({ ok: false, message: err?.message || 'Internal Server Error' });
});

// Health check
app.get('/', (req, res) => res.send('Server is Live!'));

export default app;

if (!process.env.VERCEL) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Server listening at http://localhost:${port}`));
}