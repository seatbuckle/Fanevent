// server/server.js
import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { clerkMiddleware, requireAuth, clerkClient } from '@clerk/express';
import { Webhook } from 'svix';

import connectDB from './Backend/config/db.js';
import { inngest } from './Backend/inngest/index.js';
import { inngestRouter } from './Backend/routes/inngest.route.js';

// Import all your route files
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
import healthRouter from "./Backend/routes/health.js";
import notificationPreferences from "./Backend/routes/notificationPreferences.js"
import eventReminderRoutes from './Backend/routes/eventReminders.js';

const app = express();

// Connect to DB
await connectDB();

// ==================================================================
// CRITICAL: Define raw body routes BEFORE any body parser
// ==================================================================

// Clerk webhook - needs raw body for signature verification
app.post(
  '/api/webhooks/clerk',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
      
      if (!WEBHOOK_SECRET) {
        console.error('❌ Missing CLERK_WEBHOOK_SECRET');
        return res.status(500).json({ ok: false, message: 'Webhook secret not configured' });
      }

      const svix_id = req.headers['svix-id'];
      const svix_timestamp = req.headers['svix-timestamp'];
      const svix_signature = req.headers['svix-signature'];

      if (!svix_id || !svix_timestamp || !svix_signature) {
        console.error('❌ Missing svix headers');
        return res.status(400).json({ ok: false, message: 'Missing svix headers' });
      }

      const payload = req.body.toString();
      const wh = new Webhook(WEBHOOK_SECRET);

      let evt;
      try {
        evt = wh.verify(payload, {
          'svix-id': svix_id,
          'svix-timestamp': svix_timestamp,
          'svix-signature': svix_signature,
        });
      } catch (err) {
        console.error('❌ Webhook verification failed:', err.message);
        return res.status(400).json({ ok: false, message: 'Invalid signature' });
      }

      const { type, data } = evt;
      console.log('✅ Verified Clerk webhook:', type, 'ID:', data?.id);

      // Forward to Inngest
      const inngestEventName = `clerk/${String(type).replace('.', '/')}`;
      await inngest.send({ name: inngestEventName, data });
      console.log('✅ Forwarded to Inngest:', inngestEventName);

      return res.json({ ok: true });
    } catch (e) {
      console.error('❌ Webhook error:', e);
      return res.status(500).json({ ok: false, message: e.message });
    }
  }
);

// ==================================================================
// Now apply general middleware
// ==================================================================

// CORS - adjust origins to match your setup
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Body parsers for non-webhook routes
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ==================================================================
// Public routes (no auth required)
// ==================================================================

// Health check
app.get('/', (req, res) => res.json({ ok: true, message: 'Server is Live!' }));
app.get('/health', (req, res) => res.json({ ok: true, timestamp: new Date() }));

// Inngest endpoint (public - Inngest needs to reach it)
app.use('/api/inngest', inngestRouter);

// ==================================================================
// Apply Clerk middleware to ALL remaining routes
// ==================================================================

app.use(clerkMiddleware());

// ==================================================================
// Debug endpoint - Test if Clerk auth is working
// ==================================================================

app.get('/api/_whoami', (req, res) => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 WHOAMI DEBUG');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Request headers:');
  console.log('  authorization:', req.headers.authorization || '(missing)');
  console.log('  cookie:', req.headers.cookie || '(missing)');
  console.log('  origin:', req.headers.origin || '(missing)');
  
  const auth = typeof req.auth === 'function' ? req.auth() : req.auth;
  console.log('Auth object:', JSON.stringify(auth, null, 2));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (!auth?.userId) {
    return res.status(401).json({
      ok: false,
      userId: null,
      sessionId: null,
      reason: 'No session on request',
      debug: {
        hasAuthHeader: !!req.headers.authorization,
        hasCookie: !!req.headers.cookie,
        authObject: auth,
      }
    });
  }
  
  return res.json({
    ok: true,
    userId: auth.userId,
    sessionId: auth.sessionId ?? null,
    orgId: auth.orgId ?? null,
  });
});

// ==================================================================
// Role management helpers
// ==================================================================

async function getRole(userId) {
  try {
    const user = await clerkClient.users.getUser(userId);
    return user.publicMetadata?.role || 'user';
  } catch (err) {
    console.error('getRole error:', err.message);
    return 'user';
  }
}

async function requireAdmin(req, res, next) {
  try {
    const auth = typeof req.auth === 'function' ? req.auth() : req.auth;
    if (!auth?.userId) {
      return res.status(401).json({ ok: false, message: 'Unauthorized' });
    }
    const role = await getRole(auth.userId);
    if (role !== 'admin') {
      return res.status(403).json({ ok: false, message: 'Admin only' });
    }
    next();
  } catch (err) {
    console.error('requireAdmin error:', err);
    res.status(500).json({ ok: false, message: 'Role check failed' });
  }
}

// ==================================================================
// Auth & admin routes
// ==================================================================

app.get('/api/auth/role', requireAuth(), async (req, res) => {
  try {
    const auth = typeof req.auth === 'function' ? req.auth() : req.auth;
    const role = await getRole(auth.userId);
    res.json({ ok: true, role });
  } catch (err) {
    console.error('Role fetch error:', err);
    res.status(500).json({ ok: false, message: 'Failed to fetch role' });
  }
});

app.post('/api/admin/organizers/approve', requireAuth(), requireAdmin, async (req, res) => {
  try {
    const { applicantUserId } = req.body;
    if (!applicantUserId) {
      return res.status(400).json({ ok: false, message: 'Missing applicantUserId' });
    }
    await clerkClient.users.updateUserMetadata(applicantUserId, {
      publicMetadata: { role: 'organizer' },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('Approve error:', err);
    res.status(500).json({ ok: false, message: 'Failed to update role' });
  }
});

app.post('/api/admin/organizers/demote', requireAuth(), requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ ok: false, message: 'Missing userId' });
    }
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: { role: 'user' },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('Demote error:', err);
    res.status(500).json({ ok: false, message: 'Failed to update role' });
  }
});

// ==================================================================
// All other API routes
// ==================================================================

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
app.use("/api", healthRouter);
app.use("/api/notification-preferences", notificationPreferences);
app.use("/api/event-reminders", eventReminderRoutes);


// ==================================================================
// Error handler
// ==================================================================

app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(err.status || 500).json({
    ok: false,
    message: err?.message || 'Internal Server Error',
  });
});

// ==================================================================
// Export for Vercel
// ==================================================================

export default app;

// Local development
if (!process.env.VERCEL) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🚀 Server running on http://localhost:${port}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  });
}