// middleware/requireRole.js
import { clerkClient } from '@clerk/express'

export function requireRole(neededRole) {
  return async (req, res, next) => {
    try {
      // Support both new and old Clerk API shapes safely
      const authObj = typeof req.auth === 'function' ? req.auth() : req.auth;
      const userId = authObj?.userId;
      if (!userId) {
        return res.status(401).json({ ok: false, message: 'Please sign in to continue.' })
      }

      // Fetch role from Clerk publicMetadata
      const user = await clerkClient.users.getUser(userId)
      const current = user?.publicMetadata?.role || 'user'

      if (current !== neededRole) {
        return res.status(403).json({ ok: false, message: 'Forbidden' })
      }
      next()
    } catch (e) {
      console.error('requireRole error', e)
      res.status(500).json({ ok: false, message: 'Role check failed' })
    }
  }
}
