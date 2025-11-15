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

    const u = await clerkClient.users.getUser(uid);
    if (!u.publicMetadata?.role) {
      await clerkClient.users.updateUserMetadata(uid, {
        publicMetadata: { role: "user" },
      });
    }
  } catch (e) {
    console.error("ensureRoleDefault error:", e.message);
  }
  next();
};
