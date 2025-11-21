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

/** Create a notification. Expects { userId, actorId, type, data, link } in body. */
export async function createNotification(req, res) {
  try {
    const { userId, actorId, type, data, link } = req.body || {};
    if (!userId || !type) {
      return res.status(400).json({ ok: false, message: "userId and type are required" });
    }

    const notification = await Notification.create({ userId, actorId, type, data, link });
    return res.json({ ok: true, notification });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: "Failed to create notification" });
  }
}

/**
 * List notifications for the authenticated user.
 * Supports `limit` (default 50, max 100) and `before` (ISO date) query params.
 */
export async function listNotifications(req, res) {
  try {
    const userId = req.auth.userId;
    const requestedLimit = parseInt(req.query?.limit || "50", 10);
    const limit = Number.isNaN(requestedLimit) ? 50 : Math.min(100, requestedLimit);

    const query = { userId };
    if (req.query?.before) {
      const beforeDate = new Date(req.query.before);
      if (!Number.isNaN(beforeDate.getTime())) query.createdAt = { $lt: beforeDate };
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.json({ ok: true, notifications });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: "Failed to list notifications" });
  }
}

/** Mark a single notification as read. */
export async function markRead(req, res) {
  try {
    const userId = req.auth.userId;
    const { id } = req.params;

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
export async function markAllRead(req, res) {
  try {
    const userId = req.auth.userId;
    await Notification.updateMany({ userId, read: false }, { $set: { read: true } });
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: "Failed to mark all read" });
  }
}

/** Delete a notification owned by the authenticated user. */
export async function deleteNotification(req, res) {
  try {
    const userId = req.auth.userId;
    const { id } = req.params;

    const notification = await Notification.findById(id);
    if (!notification) return res.status(404).json({ ok: false, message: "Not found" });
    if (notification.userId?.toString() !== userId) return res.status(403).json({ ok: false, message: "Forbidden" });

    await notification.deleteOne();
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: "Failed to delete notification" });
  }
}
