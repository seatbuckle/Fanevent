import Announcement from '../models/Announcement.js';
import Notification from '../models/Notification.js';
import mongoose from 'mongoose';
import { inngest } from '../inngest/index.js';

// new imports
import RSVP from '../models/RSVP.js';
import Event from '../models/Event.js';
import { clerkClient as clerk } from '@clerk/express';

// helper: collect audience ids (RSVP'd users for eventId)
async function getAudienceForAnnouncement({ eventId }) {
  try {
    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return { userIds: [], eventTitle: null };
    }

    const ev = await Event.findById(eventId).lean();
    if (!ev) return { userIds: [], eventTitle: null };

    // RSVP.eventId is an ObjectId ref to Event
    const rsvps = await RSVP.find({ eventId: ev._id }).select('userId').lean();
    const userIds = [...new Set(rsvps.map((r) => r.userId).filter(Boolean))];

    return {
      userIds,
      eventTitle: ev.title || 'Event',
    };
  } catch (e) {
    console.error('getAudienceForAnnouncement failed', e);
    return { userIds: [], eventTitle: null };
  }
}

export async function createAnnouncement(req, res) {
  try {
    const organizerId = req.auth.userId; // always current Clerk user
    const { eventId, title, content } = req.body || {};

    if (!eventId) {
    return res.status(400).json({ ok: false, message: "eventId is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return res.status(400).json({ ok: false, message: "Invalid eventId" });
    }

    if (!title || !title.trim()) {
    return res.status(400).json({ ok: false, message: "Announcement title is required" });
    }

    if (!content || !content.trim()) {
    return res.status(400).json({ ok: false, message: "Announcement content is required" });
    }

    const doc = await Announcement.create({ organizerId, eventId, title, content });

    // Load RSVP audience + event title
    const { userIds, eventTitle } = await getAudienceForAnnouncement({ eventId });

    // Organizer display name
    let organizerName = null;
    try {
      const user = await clerk.users.getUser(organizerId);
      organizerName =
        user?.fullName ||
        user?.username ||
        user?.primaryEmailAddress?.emailAddress ||
        null;
    } catch (err) {
      console.error('Failed to fetch organizer name', err);
    }

    if (userIds.length) {
      const now = new Date();
      const bulk = userIds.map((uid) => ({
        insertOne: {
          document: {
            userId: uid,
            actorId: organizerId,
            type: 'ANNOUNCEMENT',
            data: {
              title,
              message: content,
              eventId,
              eventTitle,
              organizerId,
              organizerName,
            },
            link: eventId ? `/events/${eventId}` : undefined,
            read: false,
            createdAt: now,
            updatedAt: now,
          },
        },
      }));

      await Notification.bulkWrite(bulk);
    }

    // Optional: trigger email/SMS via Inngest worker
    await inngest.send({
      name: 'announcement/created',
      data: { id: String(doc._id), organizerId, eventId, title },
    });

    return res.json({ ok: true, announcement: doc, notified: userIds.length });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: 'could not create announcement' });
  }
}

export async function listMyAnnouncements(req, res) {
  try {
    const organizerId = req.auth.userId;
    const rows = await Announcement.find({ organizerId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return res.json({ ok: true, items: rows });
  } catch (e) {
    return res.status(500).json({ ok: false, message: 'could not list announcements' });
  }
}
