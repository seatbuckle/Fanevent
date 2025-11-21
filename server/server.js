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


// Clerk server SDK instance
import { clerk } from './api/clerk.js';

const app = express();

// -----------------------------
// DB first
// -----------------------------
await connectDB();

// Inngest FIRST, with RAW body (unchanged)
app.use(
  '/api/inngest',
  express.raw({ type: '*/*' }),

  // NEW debug middleware
  (req, _res, next) => {
    const sig = req.headers['x-inngest-signature'];
    const hasKey = !!process.env.INNGEST_SIGNING_KEY;
    console.log('[/api/inngest] resync debug → sig:', sig ? 'present' : 'missing', '| signing key present:', hasKey);
    next();
  },

  // Inngest handler
  serve({ client: inngest, functions })
);


// -----------------------------
// Standard middleware
// -----------------------------
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// -----------------------------
// NEW: Clerk webhook (NO Svix verification)
// Receives Clerk events and forwards them into Inngest.
// Point Clerk Dashboard → Webhooks to POST /api/webhooks/clerk
// -----------------------------
app.post('/api/webhooks/clerk', async (req, res) => {
  try {
    const { type, data } = req.body || {};
    if (!type || !data) {
      return res.status(400).json({ ok: false, message: 'Bad Clerk payload' });
    }

    const name = `clerk/${String(type).replace('.', '/')}`; // e.g. "user.created" -> "clerk/user/created"
    await inngest.send({ name, data });

    // Helpful logs while wiring things up
    console.log('✅ Forwarded Clerk event to Inngest:', name, 'id:', data?.id || '(no id)');
    return res.json({ ok: true });
  } catch (e) {
    console.error('❌ Forward Clerk → Inngest failed:', e?.message);
    return res.status(500).json({ ok: false, message: 'Forward failed' });
  }
});

// -----------------------------
// Clerk middleware
// Skip it for /api/inngest and /api/webhooks/clerk
// -----------------------------
app.use((req, res, next) => {
  if (req.path.startsWith('/api/inngest')) return next();
  if (req.path.startsWith('/api/webhooks/clerk')) return next();
  return clerkMiddleware()(req, res, next);
});

// Ensure default role exists for newly seen users
app.use(ensureRoleDefault);

// -----------------------------
// Simple whoami
// -----------------------------
app.get('/api/_whoami', requireAuth(), (req, res) => {
  const a = typeof req.auth === 'function' ? req.auth() : req.auth;
  res.json({
    ok: true,
    userId: a?.userId || null,
  });
});

// -----------------------------
// Role utilities & auth routes
// -----------------------------
async function getRole(userId) {
  const user = await clerk.users.getUser(userId);
  return user.publicMetadata?.role || 'user';
}

app.get('/api/auth/role', requireAuth(), async (req, res) => {
  try {
    const role = await getRole(req.auth.userId);
    res.json({ ok: true, role });
  } catch (e) {
    res.status(500).json({ ok: false, message: 'Failed to fetch role' });
  }
});

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

app.post('/api/admin/organizers/approve', requireAuth(), requireAdmin, async (req, res) => {
  try {
    const { applicantUserId } = req.body; // Clerk user ID
    if (!applicantUserId) {
      return res.status(400).json({ ok: false, message: 'Missing applicantUserId' });
    }
    await clerk.users.updateUserMetadata(applicantUserId, {
      publicMetadata: { role: 'organizer' }
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: 'Failed to update role' });
  }
});

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
// Routes
// -----------------------------
app.use('/api/reports', reportsRouter);
app.use('/api/admin/reports', adminReportsRouter);

app.use('/api/admin/users', adminUsers);

app.use('/api/organizer-applications', organizerApplicationsRouter);
app.use('/api/admin/organizer-applications', adminOrganizerAppsRouter);

app.use('/api/events', eventsPublic);
app.use('/api/organizer/groups', (req, _res, next) => {
  console.log('REQ AUTH HDR:', req.headers.authorization ? 'present' : 'missing');
  next();
});
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

// -----------------------------
// Global error handler
// -----------------------------
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  const status = err.status || 500;
  const message = err?.message || err?.toString?.() || 'Internal Server Error';
  res.status(status).json({ ok: false, message });
});

// -----------------------------
// Health check
// -----------------------------
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
