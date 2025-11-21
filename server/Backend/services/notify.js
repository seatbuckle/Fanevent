// server/Backend/services/notify.js
import Notification from "../models/Notification.js";

export async function notify({ userId, type, data, link }) {
  try {
    if (!userId || !type) return null;
    return await Notification.create({
      userId: String(userId),
      type,
      data,
      link,
    });
  } catch (e) {
    // keep non-blocking
    console.error("notify() failed:", e?.message || e);
    return null;
  }
}
