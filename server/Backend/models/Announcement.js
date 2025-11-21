import mongoose from "mongoose";

const { Schema } = mongoose;

const AnnouncementSchema = new Schema(
    {
        organizerId: { type: String, required: true, index: true }, // Clerk user id
        eventId: { type: String }, // optional: target a specific event’s attendees
        title: { type: String, required: true },
        content: { type: String, required: true },
        // optionally: target a groupId in future
    },
    { timestamps: true }
);

AnnouncementSchema.index({ organizerId: 1, createdAt: -1 });

export default mongoose.models.Announcement || mongoose.model("Announcement", AnnouncementSchema);