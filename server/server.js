// server/server.js
import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { clerkMiddleware, requireAuth, clerkClient as clerk } from '@clerk/express';
import { Webhook } from 'svix'; // ← ADD THIS IMPORT
import { ensureRoleDefault } from './middleware/ensureRoleDefault.js';

import connectDB from './Backend/config/db.js';
import { inngest } from './Backend/inngest/index.js';
import { inngestRouter } from './Backend/routes/inngest.route.js';
// ... other imports

const app = express();

// 1) DB Connection
await connectDB();

// 2) CORS
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://your-frontend-domain.vercel.app',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 3) Body parsers - BUT NOT for webhook routes!
// We'll parse webhook bodies manually
app.use((req, res, next) => {
  // Skip body parsing for webhook endpoints
  if (req.path === '/api/webhooks/clerk' || req.path.startsWith('/api/inngest')) {
    return next();
  }
  express.json({ limit: '20mb' })(req, res, next);
});

app.use((req, res, next) => {
  if (req.path === '/api/webhooks/clerk' || req.path.startsWith('/api/inngest')) {
    return next();
  }
  express.urlencoded({ extended: true, limit: '20mb' })(req, res, next);
});

// 4) PUBLIC ROUTES (before Clerk middleware)

// Inngest endpoint
app.use('/api/inngest', inngestRouter);

// Clerk webhook with signature verification
app.post(
  '/api/webhooks/clerk',
  express.raw({ type: 'application/json' }), // ← Get raw body for signature verification
  async (req, res) => {
    try {
      const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

      if (!WEBHOOK_SECRET) {
        console.error('❌ CLERK_WEBHOOK_SECRET is not set!');
        return res.status(500).json({
          ok: false,
          message: 'Webhook secret not configured',
        });
      }

      // Get headers for signature verification
      const svix_id = req.headers['svix-id'];
      const svix_timestamp = req.headers['svix-timestamp'];
      const svix_signature = req.headers['svix-signature'];

      // Check if headers exist
      if (!svix_id || !svix_timestamp || !svix_signature) {
        console.error('❌ Missing svix headers');
        return res.status(400).json({
          ok: false,
          message: 'Missing svix headers',
        });
      }

      // Get the raw body as string
      const payload = req.body.toString();

      // Create Svix instance
      const wh = new Webhook(WEBHOOK_SECRET);

      let evt;
      try {
        // Verify the webhook signature
        evt = wh.verify(payload, {
          'svix-id': svix_id,
          'svix-timestamp': svix_timestamp,
          'svix-signature': svix_signature,
        });
      } catch (err) {
        console.error('❌ Webhook signature verification failed:', err.message);
        return res.status(400).json({
          ok: false,
          message: 'Invalid signature',
        });
      }

      // Now we know the webhook is authentic!
      const { type, data } = evt;

      console.log('✅ Verified Clerk webhook:', type, 'User ID:', data?.id || '(no id)');

      // Forward to Inngest
      const inngestEventName = `clerk/${String(type).replace('.', '/')}`;
      await inngest.send({
        name: inngestEventName,
        data: data,
      });

      console.log('✅ Forwarded to Inngest:', inngestEventName);

      return res.json({ ok: true, received: true });
    } catch (e) {
      console.error('❌ Clerk webhook error:', e?.message);
      return res.status(500).json({
        ok: false,
        message: 'Webhook processing failed',
      });
    }
  }
);

// 5) Clerk middleware for all other routes
app.use(clerkMiddleware({
  onError: (err) => {
    console.error('Clerk middleware error:', err.message);
  },
}));

// 6) Ensure role default
app.use(ensureRoleDefault);

// 7) Debug endpoint
app.get('/api/_whoami', (req, res) => {
  console.log('🔍 Whoami called');
  
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

// ... rest of your routes (unchanged)

async function getRole(userId) {
  const user = await clerk.users.getUser(userId);
  return user.publicMetadata?.role || 'user';
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
    res.status(500).json({ ok: false, message: 'Failed to verify role' });
  }
}

app.get('/api/auth/role', requireAuth(), async (req, res) => {
  try {
    const auth = typeof req.auth === 'function' ? req.auth() : req.auth;
    const role = await getRole(auth.userId);
    res.json({ ok: true, role });
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Failed to fetch role' });
  }
});

app.post('/api/admin/organizers/approve', requireAuth(), requireAdmin, async (req, res) => {
  try {
    const { applicantUserId } = req.body;
    if (!applicantUserId) {
      return res.status(400).json({ ok: false, message: 'Missing applicantUserId' });
    }
    await clerk.users.updateUserMetadata(applicantUserId, {
      publicMetadata: { role: 'organizer' },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Failed to update role' });
  }
});

app.post('/api/admin/organizers/demote', requireAuth(), requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ ok: false, message: 'Missing userId' });
    }
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: { role: 'user' },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Failed to update role' });
  }
});

// ... all your other routes
// (keep them exactly as they are)

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(err.status || 500).json({
    ok: false,
    message: err?.message || 'Internal Server Error',
  });
});

app.get('/', (req, res) => res.send('Server is Live!'));

export default app;

if (!process.env.VERCEL) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`🚀 Server at http://localhost:${port}`));
}