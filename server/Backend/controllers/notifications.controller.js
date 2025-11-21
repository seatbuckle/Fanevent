import Notification from "../models/Notification.js";

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
    console.error("createNotification error:", err);
    return jsonErr(res, 500, "Failed to create notification");
  }
}

/**
 * GET /api/notifications?limit=50&before=ISO_DATE
 * Lists notifications for the authenticated user.
 */
export async function listNotifications(req, res) {
  try {
    const userId = getReqUserId(req);
    if (!userId) return jsonErr(res, 401, "Unauthorized");

    const requestedLimit = parseInt(req.query?.limit || "50", 10);
    const limit = Number.isNaN(requestedLimit) ? 50 : Math.min(100, Math.max(1, requestedLimit));

    const query = { userId: String(userId) };
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
export async function deleteNotification(req, res) {
  try {
    const userId = getReqUserId(req);
    if (!userId) return jsonErr(res, 401, "Unauthorized");

    const { id } = req.params;
    const result = await Notification.deleteOne({ _id: id, userId: String(userId) });
    if (!result?.deletedCount) return jsonErr(res, 404, "Not found");

    return jsonOK(res);
  } catch (err) {
    console.error("deleteNotification error:", err);
    return jsonErr(res, 500, "Failed to delete notification");
  }
}