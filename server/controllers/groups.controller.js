// server/controllers/groups.controller.js
import Group from "../Backend/models/Groups.js";
import Conversation from "../Backend/models/Conversation.js";


const isAdminReq = (req) => Boolean(req.isAdmin === true || req.userRole === "admin");


/** Safe way to read Clerk's userId from req.auth (function or object) */
const getReqUserId = (req) => {
  try {
    const a = typeof req.auth === "function" ? req.auth() : req.auth;
    return a?.userId || null;
  } catch {
    return null;
  }
};

/** Public: GET /api/groups?query=&limit= */
export async function listGroups(req, res, next) {
  try {
    const userId = getReqUserId(req);
    const { query = "", limit = 24 } = req.query;

    // Public route should NOT leak pending/rejected groups.
    // Default: only approved.
    const find = { status: "approved" };

    // Optional text search
    if (query) find.$text = { $search: String(query) };

    // If you *want* creators to see their own pending groups in public list,
    // uncomment the $or below (kept strict by default):
    // if (userId) {
    //   find.$or = [{ status: "approved" }, { createdBy: userId }];
    // } else {
    //   find.status = "approved";
    // }

    const docs = await Group.find(find)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 24, 100))
      .lean();

    const items = docs.map((g) => ({
      ...g,
      membersCount: Array.isArray(g.members) ? g.members.length : 0,
      ...(userId ? { isMember: Array.isArray(g.members) && g.members.includes(userId) } : {}),
    }));

    res.json({ items });
  } catch (err) {
    next(err);
  }
}

export async function getGroup(req, res, next) {
  try {
    const userId = getReqUserId(req);
    const g = await Group.findById(req.params.id).lean();
    if (!g) return res.status(404).json({ ok: false, message: "Group not found" });

    // Only allow fetching non-approved if you're the creator or an admin.
    const allowed =
      g.status === "approved" ||
      g.createdBy === userId ||
      isAdminReq(req);

    if (!allowed) {
      // Hide existence of unapproved group to the public
      return res.status(404).json({ ok: false, message: "Group not found" });
    }

    const json = {
      ...g,
      membersCount: Array.isArray(g.members) ? g.members.length : 0,
      ...(userId ? { isMember: Array.isArray(g.members) && g.members.includes(userId) } : {}),
    };

    res.json(json);
  } catch (err) {
    next(err);
  }
}

/** Authed: GET /api/groups/me/mine  (alias /api/me/groups) */
export async function myGroups(req, res, next) {
  try {
    const userId = getReqUserId(req);
    if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

    const docs = await Group.find({ members: userId }).sort({ createdAt: -1 }).lean();

    const items = docs.map((g) => ({
      ...g,
      membersCount: Array.isArray(g.members) ? g.members.length : 0,
      isMember: true,
    }));

    // Shape that your <MyDashboard/> accepts
    res.json({ items });
  } catch (err) {
    next(err);
  }
}

/** Optional: GET /api/groups/:id/events (return empty array if you don't have Events yet) */
export async function groupEvents(_req, res, _next) {
  res.json([]); // hook this up to your Events model when ready
}

/** Authed: POST /api/groups/:id/join */
export async function joinGroup(req, res, next) {
  try {
    const userId = getReqUserId(req);
    if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

    const g = await Group.findById(req.params.id);
    if (!g) return res.status(404).json({ ok: false, message: "Group not found" });

    // optional moderation gate, matches your UI
    if (g.status && g.status !== "approved") {
      return res.status(403).json({ ok: false, message: "Group is not approved yet" });
    }

    await g.updateOne({ $addToSet: { members: userId } });
    const updated = await Group.findById(g._id).lean();

    // If there's a conversation for this group, add the user to it
    try {
      const conv = await Conversation.findOne({ groupId: g._id });
      if (conv) {
        // add participant if not already present
        if (!conv.participants.includes(userId)) {
          conv.participants.push(userId);
          await conv.save();
        }
      }
    } catch (err) {
      // don't block the join if conversation update fails
      console.error('Failed to sync group join to conversation:', err.message || err);
    }

    return res.json({
      ...updated,
      membersCount: Array.isArray(updated.members) ? updated.members.length : 0,
      isMember: true,
    });
  } catch (err) {
    next(err);
  }
}

/** Authed: DELETE /api/groups/:id/join  (Leave group) */
export async function leaveGroup(req, res, next) {
  try {
    const userId = getReqUserId(req);
    if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });

    const g = await Group.findById(req.params.id);
    if (!g) return res.status(404).json({ ok: false, message: "Group not found" });

    await g.updateOne({ $pull: { members: userId } });
    const updated = await Group.findById(g._id).lean();

    // If there's a conversation for this group, remove the user from it
    try {
      const conv = await Conversation.findOne({ groupId: g._id });
      if (conv) {
        const idx = conv.participants.indexOf(userId);
        if (idx !== -1) {
          conv.participants.splice(idx, 1);
          await conv.save();
        }
      }
    } catch (err) {
      console.error('Failed to sync group leave to conversation:', err.message || err);
    }

    return res.json({
      ...updated,
      membersCount: Array.isArray(updated.members) ? updated.members.length : 0,
      isMember: false,
    });
  } catch (err) {
    next(err);
  }
}

/** Admin: POST /api/admin/groups/:id/approve */
export async function approveGroup(req, res, next) {
  try {
    const g = await Group.findByIdAndUpdate(
      req.params.id,
      { $set: { status: "approved" } },
      { new: true, lean: true }
    );
    if (!g) return res.status(404).json({ ok: false, message: "Group not found" });
    res.json(g);
  } catch (err) {
    next(err);
  }
}

/** Admin: POST /api/admin/groups/:id/reject */
export async function rejectGroup(req, res, next) {
  try {
    const g = await Group.findByIdAndUpdate(
      req.params.id,
      { $set: { status: "rejected" } },
      { new: true, lean: true }
    );
    if (!g) return res.status(404).json({ ok: false, message: "Group not found" });
    res.json(g);
  } catch (err) {
    next(err);
  }
}
