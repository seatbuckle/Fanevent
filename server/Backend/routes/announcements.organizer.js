import express from 'express';
import { requireAuth } from '@clerk/express';
import { clerk } from '../../api/clerk.js';
import { createAnnouncement, listMyAnnouncements } from '../controllers/announcements.controller.js';


const r = express.Router();


async function requireOrganizer(req, res, next) {
    try {
        const user = await clerk.users.getUser(req.auth.userId);
        const role = user?.publicMetadata?.role || 'user';
        if (role !== 'organizer' && role !== 'admin') {
        return res.status(403).json({ ok: false, message: 'Organizer only' });
    }
    next();
    } catch (e) {
        res.status(500).json({ ok: false, message: 'Failed to verify role' });
    }
}

// POST new announcement
r.post('/', requireAuth(), requireOrganizer, createAnnouncement);


// GET my announcements (for dashboard list, if needed)
r.get('/mine', requireAuth(), requireOrganizer, listMyAnnouncements);


export default r;