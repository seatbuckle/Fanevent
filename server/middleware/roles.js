import { clerkClient } from "@clerk/express";

export const requireAuthStrict = (req, res, next) => {
  if (!req.auth?.userId) return res.status(401).json({ success:false, message:"Unauthorized" });
  next();
};

export const requireRole = (...allowed) => {
  return async (req, res, next) => {
    try {
      const uid = req.auth?.userId;
      if (!uid) return res.status(401).json({ success:false, message:"Unauthorized" });
      const user = await clerkClient.users.getUser(uid);
      const role = user.publicMetadata?.role || "user";
      if (!allowed.includes(role)) return res.status(403).json({ success:false, message:"Forbidden" });
      req.user = { id: uid, role };
      next();
    } catch (e) {
      console.error("requireRole", e.message);
      res.status(500).json({ success:false, message:"Role check failed" });
    }
  };
};
