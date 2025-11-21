import Announcement from '../models/Announcement.js';
import Notification from '../models/Notification.js';
import mongoose from 'mongoose';
import { inngest } from '../inngest/index.js';


// helper: collect audience ids (attendees for eventId). Replace with your actual Event model logic
async function getAudienceForAnnouncement({ organizerId, eventId }) {
// If you have Event model: load attendees’ clerk userIds.
    try {
        if (!eventId) return []; // broadcast later (followers feature) – not yet implemented
        const { default: Event } = await import('../models/Event.js');
        const ev = await Event.findById(eventId).lean();
        const attendees = Array.isArray(ev?.attendees) ? ev.attendees : [];
        // attendees can be array of { userId } or strings
        return attendees.map((a) => (typeof a === 'string' ? a : a.userId)).filter(Boolean);
    } catch {
        return [];
    }
}


export async function createAnnouncement(req, res) {
    try {
        const organizerId = req.auth.userId;
        const { eventId, title, content } = req.body || {};
        if (!title || !content) {
        return res.status(400).json({ ok: false, message: 'title and content are required' });
        }


        const doc = await Announcement.create({ organizerId, eventId, title, content });


        // Fan out notifications to attendees (if eventId provided)
        const userIds = await getAudienceForAnnouncement({ organizerId, eventId });
        if (userIds.length) {
            const bulk = userIds.map((uid) => ({
        insertOne: {
        document: {
        userId: uid,
        actorId: organizerId,
        type: 'ANNOUNCEMENT',
        data: { title, message: content, eventId },
        link: eventId ? `/events/${eventId}` : undefined,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
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
        const rows = await Announcement.find({ organizerId }).sort({ createdAt: -1 }).limit(100).lean();
        return res.json({ ok: true, items: rows });
    } catch (e) {
        return res.status(500).json({ ok: false, message: 'could not list announcements' });
    }
}