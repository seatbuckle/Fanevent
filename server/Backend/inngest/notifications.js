// import { inngest } from '../index.js';
// import Notification from '../../models/Notification.js';


// async function sendEmail({ to, subject, html }) {
// // TODO: wire to your email provider
// console.log('EMAIL →', to, subject);
// }


// // 24h reminder for events – schedule this when a user RSVPs
// export const eventReminder = inngest.createFunction(
// { id: 'event-reminder-24h' },
// { cron: '0 * * * *' }, // hourly sweep; or use scheduled events per RSVP
// async ({ step }) => {
// // Pseudo: find events in next 24-25h and notify their attendees
// // You likely already track RSVPs – iterate and create Notification docs here
// return 'ok';
// }
// );


// // Weekly digest every Monday 8am PT
// export const weeklyDigest = inngest.createFunction(
// { id: 'weekly-digest' },
// { cron: '0 16 * * MON' }, // 08:00 PT = 16:00 UTC (adjust as needed)
// async () => {
// // Build a digest per user; create Notification of type DIGEST and optionally sendEmail
// return 'ok';
// }
// );


// // On announcement, send optional emails
// export const onAnnouncement = inngest.createFunction(
// { id: 'on-announcement-email' },
// { event: 'announcement/created' },
// async ({ event }) => {
// const { data } = event;
// // Load audience again if needed and send emails respecting user prefs
// // Example only:
// // await sendEmail({ to: 'user@example.com', subject: 'New Announcement', html: '<p>…</p>' });
// return { ok: true };
// }
// );