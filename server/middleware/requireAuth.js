// middleware/requireAuth.js
import { requireAuth as clerkRequireAuth } from '@clerk/express'
// Export the Clerk middleware directly (no changes)
export const requireAuth = clerkRequireAuth()
