// Backend/inngest/index.js
import { Inngest } from "inngest";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
// If you have an Event model with attendees, import it:
import Event from "../models/Event.js"; // adjust if your path/name differs
import EventReminder from "../models/EventReminder.js";
// 🔹 Clerk server SDK
import { clerkClient as clerk } from "@clerk/express";

// ------------------------------------------------------------------
// Inngest client
// ------------------------------------------------------------------
export const inngest = new Inngest({ id: "fanevent-app" });


// 🔔 Per-user event reminder sweep
export const eventReminderOffsets = inngest.createFunction(
  { id: "event-reminder-offsets" },
  { cron: "0 * * * *" }, // run hourly
  async () => {
    const now = new Date();
    const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // 1) Events starting in the next 2 hours
    const events = await Event.find({
      startAt: { $gte: now, $lte: in2h },
    })
      .select({ _id: 1, title: 1, startAt: 1 })
      .lean();

    if (!events.length) return { ok: true, events: 0, notifications: 0 };

    const eventIds = events.map((e) => e._id);
    const byId = Object.fromEntries(
      events.map((e) => [String(e._id), e])
    );

    // 2) All EventReminder docs for those events
    const reminders = await EventReminder.find({
      eventId: { $in: eventIds },
      offsets: { $exists: true, $ne: [] },
    }).lean();

    if (!reminders.length) {
      return { ok: true, events: events.length, notifications: 0 };
    }

    const docs = [];

    for (const r of reminders) {
      const ev = byId[String(r.eventId)];
      if (!ev) continue;

      const minutesUntil = Math.round(
        (new Date(ev.startAt).getTime() - now.getTime()) / 60000
      );
      if (minutesUntil <= 0) continue;

      const offsets = Array.isArray(r.offsets) ? r.offsets : [];

      // 3) Fire if we’re within this hour of one of the offsets
      const shouldFire = offsets.some(
        (off) => minutesUntil <= off && minutesUntil > off - 60
      );
      if (!shouldFire) continue;

      docs.push({
        userId: r.userId,
        type: "EVENT_REMINDER",
        data: {
          eventId: ev._id,
          eventTitle: ev.title,
          message: `Reminder: “${ev.title}” starts in about ${minutesUntil} minutes.`,
        },
        link: `/events/${ev._id}`,
        read: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (docs.length) {
      await Notification.collection.insertMany(docs);
    }

    return {
      ok: true,
      events: events.length,
      reminders: reminders.length,
      notifications: docs.length,
    };
  }
);

export const perMinuteReminderSweep = inngest.createFunction(
  { id: "per-minute-reminder-sweep" },
  { cron: "*/5 * * * *" }, // every 5 minutes
  async () => {
    const now = new Date();
    const windowMinutes = 5;

    const events = await Event.find({ startAt: { $gte: now } })
      .select({ _id: 1, startAt: 1, title: 1 })
      .lean();

    const notificationsToCreate = [];

    for (const ev of events) {
      const start = new Date(ev.startAt);
      const diffMinutes = (start.getTime() - now.getTime()) / (1000 * 60);

      const reminders = await EventReminder.find({
        eventId: ev._id,
        offsets: {
          $elemMatch: {
            $gte: diffMinutes,
            $lt: diffMinutes + windowMinutes,
          },
        },
      }).lean();

      for (const r of reminders) {
        for (const offset of r.offsets) {
          if (offset < diffMinutes || offset >= diffMinutes + windowMinutes) continue;

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
              message: `Reminder: “${ev.title}” starts soon.`,
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

// ------------------------------------------------------------------
// Helpers (stub email – wire to Resend/Postmark/SES later)
// ------------------------------------------------------------------
async function sendEmail({ to, subject, html }) {
  // TODO: Connect to your provider; keep as a no-op for now.
  console.log("EMAIL →", to, subject);
}

// ------------------------------------------------------------------
// Clerk sync functions (yours, unchanged)
// ------------------------------------------------------------------
// Backend/inngest/index.js
// Backend/inngest/index.js
// Backend/inngest/index.js
const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url, username } = event.data;

    const userData = {
      _id: id,
      email: email_addresses?.[0]?.email_address ?? "",
      name: `${first_name ?? ""} ${last_name ?? ""}`.trim() || username || id,
      username: username || id,             // ← ensure it exists
      image: image_url ?? "",
    };

    await User.create(userData);
    try {
      await clerk.users.updateUserMetadata(id, { publicMetadata: { role: "user" } });
    } catch (err) {
      console.error("Default role set failed:", err?.message);
    }
  }
);

const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url, username } = event.data;

    const userData = {
      email: email_addresses?.[0]?.email_address ?? "",
      name: `${first_name ?? ""} ${last_name ?? ""}`.trim() || username || id,
      ...(username ? { username } : {}),    // only overwrite if provided
      image: image_url ?? "",
    };

    await User.findByIdAndUpdate(id, userData, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });
  }
);


const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-with-clerk" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    const { id } = event.data;
    await User.findByIdAndDelete(id);
  }
);


// ------------------------------------------------------------------
// Notification jobs
// ------------------------------------------------------------------

/**
 * 1) On announcement: optional fan-out email (in-app notifs are done in controller)
 * Triggered by:  await inngest.send({ name: "announcement/created", data: { id, organizerId, eventId, title } })
 */
const onAnnouncement = inngest.createFunction(
  { id: "on-announcement-email" },
  { event: "announcement/created" },
  async ({ event }) => {
    const { eventId, title } = event.data || {};

    // If you want to email attendees for event-specific announcements:
    if (eventId) {
      const ev = await Event.findById(eventId).lean();
      const attendees = Array.isArray(ev?.attendees) ? ev.attendees : [];
      // Expect { userId, email } or similar; fall back to loading from User collection
      for (const a of attendees) {
        const uid = typeof a === "string" ? a : a.userId;
        if (!uid) continue;
        let to = a?.email;
        if (!to) {
          const u = await User.findById(uid).lean();
          to = u?.email;
        }
        if (to) {
          await sendEmail({
            to,
            subject: `📣 New announcement: ${title}`,
            html: `<p>There’s a new announcement for your event.</p>`,
          });
        }
      }
    }

    return { ok: true };
  }
);

/**
 * 2) Event reminders sweep (24h before start)
 * You can also schedule per-RSVP, but a sweep is simpler to start.
 * NOTE: Cron is in UTC. 16:00 UTC ≈ 8am PT (standard time). Adjust to your preference.
 */
const eventReminder = inngest.createFunction(
  { id: "event-reminder-24h" },
  { cron: "0 * * * *" }, // hourly sweep; change cadence if you want
  async () => {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    // Find events starting ~24–25h from now; adjust to your Event schema
    const upcoming = await Event.find({
      startAt: { $gte: in24h, $lt: in25h },
    })
      .select({ _id: 1, title: 1, attendees: 1 })
      .lean();

    for (const ev of upcoming) {
      const attendees = Array.isArray(ev.attendees) ? ev.attendees : [];
      const docs = [];

      for (const a of attendees) {
        const uid = typeof a === "string" ? a : a.userId;
        if (!uid) continue;
        docs.push({
          userId: uid,
          type: "EVENT_REMINDER",
          data: { title: ev.title, message: "Your event starts in ~24 hours." },
          link: `/events/${ev._id}`,
          read: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Optional email
        let to = a?.email;
        if (!to) {
          const u = await User.findById(uid).lean();
          to = u?.email;
        }
        if (to) {
          await sendEmail({
            to,
            subject: `⏰ Reminder: ${ev.title} is tomorrow`,
            html: `<p>See details: <a href="${process.env.APP_URL || ""}/events/${ev._id}">${ev.title}</a></p>`,
          });
        }
      }

      if (docs.length) await Notification.collection.insertMany(docs);
    }

    return { ok: true, checked: upcoming.length };
  }
);

/**
 * 3) Weekly digest (every Monday 8am PT ≈ 16:00 UTC, be mindful of DST)
 * This creates an in-app DIGEST; email is optional.
 */
const weeklyDigest = inngest.createFunction(
  { id: "weekly-digest" },
  { cron: "0 16 * * MON" }, // 08:00 PT ≈ 16:00 UTC (standard time)
  async () => {
    // Simple example: send everyone a generic digest.
    // Replace with a per-user query of upcoming events they RSVP’d to or groups they joined.
    const users = await User.find({}).select({ _id: 1, email: 1 }).lean();
    if (!users.length) return { ok: true, users: 0 };

    const now = new Date();
    const docs = users.map((u) => ({
      userId: String(u._id),
      type: "DIGEST",
      data: {
        title: "Weekly Digest",
        message: "Here’s what’s coming up this week in your fandoms.",
        weekOf: now.toISOString(),
      },
      read: false,
      createdAt: now,
      updatedAt: now,
    }));

    await Notification.collection.insertMany(docs);

    // Optional: email digests
    // for (const u of users) {
    //   if (u.email) {
    //     await sendEmail({ to: u.email, subject: "Your weekly Fanevent digest", html: "<p>…</p>" });
    //   }
    // }

    return { ok: true, users: users.length };
  }
);

// ------------------------------------------------------------------
// Export all functions
// ------------------------------------------------------------------
export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  // notifications
  onAnnouncement,
  eventReminder,
  weeklyDigest,
  perMinuteReminderSweep,
  eventReminderOffsets,
];