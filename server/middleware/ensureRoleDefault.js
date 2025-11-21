// server/Backend/middleware/ensureRoleDefault.js
import { clerkClient } from "@clerk/express";

/**
 * If a signed-in user has no role yet in Clerk, set it to "user".
 * Non-blocking: if anything fails we just continue.
 */
export const ensureRoleDefault = async (req, res, next) => {
  try {
    const uid = req.auth?.userId;
    if (!uid) return next();

    let u = await clerkClient.users.getUser(uid);
    if (!u.publicMetadata?.role) {
      await clerkClient.users.updateUserMetadata(uid, {
        publicMetadata: { role: "user" },
      });
      // Send welcome notification immediately after setting role
      try {
        const Notification = (await import('../models/Notification.js')).default;
        await Notification.findOneAndUpdate(
          { userId: uid, type: 'Welcome' },
          {
            $setOnInsert: {
              userId: uid,
              type: 'Welcome',
              data: 'Welcome to Fanevent!',
              read: false,
            }
          },
          { upsert: true, new: true }
        );
      } catch (err) {
        if (err.code !== 11000) {
          console.error('Failed to send welcome notification:', err.message);
        }
      }
    }
  } catch (e) {
    console.error("ensureRoleDefault error:", e.message);
  }
  next();
};