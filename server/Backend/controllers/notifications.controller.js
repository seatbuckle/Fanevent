// Delete all read notifications for the logged-in user
export async function deleteReadNotifications(req, res) {
  try {
    const userId = req.auth.userId;
    if (!userId) return res.status(401).json({ ok: false, message: 'Unauthorized' });
    await Notification.deleteMany({ userId, read: true });
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: 'Could not delete read notifications' });
  }
}
// Get total notification count for the logged-in user
export async function getNotificationCount(req, res) {
  try {
    const userId = req.auth.userId;
    if (!userId) return res.status(401).json({ ok: false, message: 'Unauthorized' });
    const count = await Notification.countDocuments({ userId });
    return res.json({ ok: true, count });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: 'Could not get notification count' });
  }
}
import Notification from "../models/Notification.js";

<<<<<<< HEAD
/** Create a notification. Expects { userId, actorId, type, data, link } in body. */
=======
/* ---------- Helpers ---------- */
const getReqUserId = (req) => {
  try {
    if (typeof req.auth === "function") return req.auth()?.userId || null;
    return req.auth?.userId || null;
  } catch {
    return null;
  }
};

const jsonOK = (res, payload = {}) => res.json({ ok: true, success: true, ...payload });
const jsonErr = (res, code, message) =>
  res.status(code).json({ ok: false, success: false, message });

/**
 * POST /api/notifications
 * Body: { userId?, actorId?, type, data, link }
 * - If userId omitted, defaults to the caller.
 * - If userId provided and !== caller, only allowed when req.allowActOnBehalf === true
 *   (e.g., set this in an admin-only route/middleware).
 */
>>>>>>> KaydenLe
export async function createNotification(req, res) {
  try {
    const callerId = getReqUserId(req);
    if (!callerId) return jsonErr(res, 401, "Unauthorized");

    const { userId: targetIdRaw, actorId, type, data, link } = req.body || {};
    if (!type) return jsonErr(res, 400, "type is required");

    const targetId = targetIdRaw || callerId;

    // Only allow creating for someone else if explicitly permitted by upstream middleware
    if (targetId !== callerId && !req.allowActOnBehalf) {
      return jsonErr(res, 403, "Forbidden");
    }

    const doc = await Notification.create({
      userId: String(targetId),
      actorId: actorId || callerId,
      type: String(type),
      data: data ?? null,
      link: link || undefined,
    });

    return jsonOK(res, { notification: doc });
  } catch (err) {
<<<<<<< HEAD
    console.error(err);
    return res.status(500).json({ ok: false, message: "Failed to create notification" });
=======
    console.error("createNotification error:", err);
    return jsonErr(res, 500, "Failed to create notification");
>>>>>>> KaydenLe
  }
}

/**
<<<<<<< HEAD
 * List notifications for the authenticated user.
 * Supports `limit` (default 50, max 100) and `before` (ISO date) query params.
=======
 * GET /api/notifications?limit=50&before=ISO_DATE
 * Lists notifications for the authenticated user.
>>>>>>> KaydenLe
 */
export async function listNotifications(req, res) {
  try {
    const userId = getReqUserId(req);
    if (!userId) return jsonErr(res, 401, "Unauthorized");

    const requestedLimit = parseInt(req.query?.limit || "50", 10);
    const limit = Number.isNaN(requestedLimit) ? 50 : Math.min(100, Math.max(1, requestedLimit));

<<<<<<< HEAD
    const query = { userId };
=======
    const query = { userId: String(userId) };
>>>>>>> KaydenLe
    if (req.query?.before) {
      const beforeDate = new Date(req.query.before);
      if (!Number.isNaN(beforeDate.getTime())) query.createdAt = { $lt: beforeDate };
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return jsonOK(res, { notifications });
  } catch (err) {
<<<<<<< HEAD
    console.error(err);
    return res.status(500).json({ ok: false, message: "Failed to list notifications" });
  }
}

/** Mark a single notification as read. */
=======
    console.error("listNotifications error:", err);
    return jsonErr(res, 500, "Failed to list notifications");
  }
}

/**
 * GET /api/notifications/count?unread=1
 * Returns count. Default unread=1 (unread only). Pass unread=0 to count all.
 */
export async function getNotificationCount(req, res) {
  try {
    const userId = getReqUserId(req);
    if (!userId) return jsonErr(res, 401, "Unauthorized");

    const unreadOnly = req.query?.unread !== "0"; // default true
    const filter = { userId: String(userId) };
    if (unreadOnly) filter.read = false;

    const count = await Notification.countDocuments(filter);
    return jsonOK(res, { count });
  } catch (err) {
    console.error("getNotificationCount error:", err);
    return jsonErr(res, 500, "Could not get notification count");
  }
}

/**
 * PATCH /api/notifications/:id/read
 * Marks a single notification as read (if owned by the caller).
 */
>>>>>>> KaydenLe
export async function markRead(req, res) {
  try {
    const userId = getReqUserId(req);
    if (!userId) return jsonErr(res, 401, "Unauthorized");

    const { id } = req.params;
    const doc = await Notification.findOneAndUpdate(
      { _id: id, userId: String(userId) },
      { $set: { read: true } },
      { new: true }
    );
    if (!doc) return jsonErr(res, 404, "Not found");

<<<<<<< HEAD
    const notification = await Notification.findById(id);
    if (!notification) return res.status(404).json({ ok: false, message: "Not found" });

    // Compare string forms to avoid ObjectId mismatch
    if (notification.userId?.toString() !== userId) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }

    notification.read = true;
    await notification.save();
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: "Failed to mark read" });
  }
}

/** Mark all unread notifications for the authenticated user as read. */
=======
    return jsonOK(res, { notification: doc });
  } catch (err) {
    console.error("markRead error:", err);
    return jsonErr(res, 500, "Failed to mark read");
  }
}

/**
 * POST /api/notifications/mark-all-read
 * Marks all unread as read for the caller.
 */
>>>>>>> KaydenLe
export async function markAllRead(req, res) {
  try {
    const userId = getReqUserId(req);
    if (!userId) return jsonErr(res, 401, "Unauthorized");

    const result = await Notification.updateMany(
      { userId: String(userId), read: false },
      { $set: { read: true } }
    );

    return jsonOK(res, { modifiedCount: result?.modifiedCount ?? 0 });
  } catch (err) {
<<<<<<< HEAD
    console.error(err);
    return res.status(500).json({ ok: false, message: "Failed to mark all read" });
  }
}

/** Delete a notification owned by the authenticated user. */
=======
    console.error("markAllRead error:", err);
    return jsonErr(res, 500, "Failed to mark all read");
  }
}

/**
 * DELETE /api/notifications/read
 * Deletes all read notifications for the caller.
 */
export async function deleteReadNotifications(req, res) {
  try {
    const userId = getReqUserId(req);
    if (!userId) return jsonErr(res, 401, "Unauthorized");

    const result = await Notification.deleteMany({ userId: String(userId), read: true });
    return jsonOK(res, { deletedCount: result?.deletedCount ?? 0 });
  } catch (err) {
    console.error("deleteReadNotifications error:", err);
    return jsonErr(res, 500, "Could not delete read notifications");
  }
}

/**
 * DELETE /api/notifications/:id
 * Deletes a single notification if owned by the caller.
 */
>>>>>>> KaydenLe
export async function deleteNotification(req, res) {
  try {
    const userId = getReqUserId(req);
    if (!userId) return jsonErr(res, 401, "Unauthorized");

    const { id } = req.params;
    const result = await Notification.deleteOne({ _id: id, userId: String(userId) });
    if (!result?.deletedCount) return jsonErr(res, 404, "Not found");

<<<<<<< HEAD
    const notification = await Notification.findById(id);
    if (!notification) return res.status(404).json({ ok: false, message: "Not found" });
    if (notification.userId?.toString() !== userId) return res.status(403).json({ ok: false, message: "Forbidden" });

    await notification.deleteOne();
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: "Failed to delete notification" });
=======
    return jsonOK(res);
  } catch (err) {
    console.error("deleteNotification error:", err);
    return jsonErr(res, 500, "Failed to delete notification");
>>>>>>> KaydenLe
  }
}
