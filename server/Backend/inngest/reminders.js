// Backend/inngest/reminders.js (for example)
import { Inngest } from "inngest";
import Event from "../models/Event.js";
import EventReminder from "../models/EventReminder.js";
import Notification from "../models/Notification.js";

export const inngest = new Inngest({ id: "fanevent-app" });

export const perMinuteReminderSweep = inngest.createFunction(
  { id: "per-minute-reminder-sweep" },
  { cron: "*/5 * * * *" }, // every 5 minutes; adjust
  async () => {
    const now = new Date();
    const windowMinutes = 5;

    // We compute a small time window and see which reminders fall into it
    const events = await Event.find({ startAt: { $gte: now } })
      .select({ _id: 1, startAt: 1, title: 1 })
      .lean();

    if (!events.length) return { ok: true, events: 0 };

    const notificationsToCreate = [];

    for (const ev of events) {
      const start = new Date(ev.startAt);
      const diffMinutes = (start.getTime() - now.getTime()) / (1000 * 60);

      // Find reminders whose offset is within [diffMinutes, diffMinutes + window]
      const reminders = await EventReminder.find({
        eventId: ev._id,
        offsets: { $elemMatch: { $gte: diffMinutes, $lt: diffMinutes + windowMinutes } },
      }).lean();

      for (const r of reminders) {
        for (const offset of r.offsets) {
          if (offset < diffMinutes || offset >= diffMinutes + windowMinutes) continue;

          // Avoid duplicates: has one already been created?
          const exists = await Notification.exists({
            userId: r.userId,
            type: "EVENT_REMINDER",
            "data.eventId": String(ev._id),
            "data.offsetMinutes": offset,
          });
          if (exists) continue;

          notificationsToCreate.push({
            userId: r.userId,
            type: "EVENT_REMINDER",
            data: {
              eventId: String(ev._id),
              eventTitle: ev.title,
              offsetMinutes: offset,
              message: `Reminder: “${ev.title}” starts in about ${Math.round(offset)} min.`,
            },
            link: `/events/${ev._id}`,
            read: false,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }

    if (notificationsToCreate.length) {
      await Notification.collection.insertMany(notificationsToCreate);
    }

    return {
      ok: true,
      created: notificationsToCreate.length,
      events: events.length,
    };
  }
);
