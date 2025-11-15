// server/routes/groups.public.js
import { Router } from "express";
import {
  listGroups,
  getGroup,
  myGroups,
  groupEvents,
  joinGroup,
  leaveGroup,
} from "../../controllers/groups.controller.js"; 
import { requireAuth } from "../../middleware/requireAuth.js";

const r = Router();

// Optional auth helper (exactly as you wrote)
const requireAuthOptional = async (req, res, next) => {
  try {
    if (req.headers.authorization || req.cookies?.token) {
      return requireAuth(req, res, next);
    }
    next();
  } catch {
    next();
  }
};

// Public routes
r.get("/", requireAuthOptional, listGroups);
r.get("/:id", requireAuthOptional, getGroup);

// “My groups” (two aliases to match your dashboard)
r.get("/me/mine", requireAuth, myGroups);
r.get("/../me/groups".replace("../", ""), requireAuth, myGroups);

// Events (optional)
r.get("/:id/events", requireAuthOptional, groupEvents);

// Join/Leave
r.post("/:id/join", requireAuth, joinGroup);
r.delete("/:id/join", requireAuth, leaveGroup);

export default r;
