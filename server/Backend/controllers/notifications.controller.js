import Notification from "../models/Notification.js";

// make a new notification (needs userId + type)
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
    return res.status(500).json({ ok: false, message: "could not create notification" });
  }
}

// get notifications for the logged in user (supports limit + before)
export async function listNotifications(req, res) {
  try {
    const userId = req.auth.userId;
    const requestedLimit = parseInt(req.query?.limit || "50", 10);
    const limit = Number.isNaN(requestedLimit) ? 50 : Math.min(100, requestedLimit);

    const query = { userId };

    // filter older notifications if "before" is passed
    if (req.query?.before) {
      const beforeDate = new Date(req.query.before);
      if (!Number.isNaN(beforeDate.getTime())) query.createdAt = { $lt: beforeDate };
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 }) // newest first
      .limit(limit)
      .lean();

    return res.json({ ok: true, notifications });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: "could not list notifications" });
  }
}

// mark one notification as read
export async function markRead(req, res) {
  try {
    const userId = req.auth.userId;
    const { id } = req.params;

    const notification = await Notification.findById(id);
    if (!notification) return res.status(404).json({ ok: false, message: "not found" });

    // make sure it belongs to this user
    if (notification.userId?.toString() !== userId) {
      return res.status(403).json({ ok: false, message: "forbidden" });
    }

    notification.read = true;
    await notification.save();
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: "could not mark read" });
  }
}

// mark all notifications as read for this user
export async function markAllRead(req, res) {
  try {
    const userId = req.auth.userId;
    await Notification.updateMany({ userId, read: false }, { $set: { read: true } });
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: "could not mark all read" });
  }
}

// delete one notification if you own it
export async function deleteNotification(req, res) {
  try {
    const userId = req.auth.userId;
    const { id } = req.params;

    const notification = await Notification.findById(id);
    if (!notification) return res.status(404).json({ ok: false, message: "not found" });

    if (notification.userId?.toString() !== userId) {
      return res.status(403).json({ ok: false, message: "forbidden" });
    }

    await notification.deleteOne();
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: "could not delete notification" });
  }
}
