// server/Backend/models/RSVP.js
import mongoose from "mongoose";

const RsvpSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      index: true,
      required: true,
    },

    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      index: true,
      required: true,
    },

    // Core timestamps for RSVP + attendance
    rsvpedAt: {
      type: Date,
      default: Date.now,
    },
    checkInAt: Date,
    checkOutAt: Date,

    // Legacy "did they attend?" flag + hours
    attended: {
      type: Boolean,
      default: false,
    },
    attendedHours: {
      type: Number,
    },

    // ✅ New: status / organizer confirmation fields
    status: {
      type: String,
      enum: ["pending", "confirmed", "canceled"],
      default: "pending",
      index: true,
    },

    // More specific attendance status (can be used for finer-grain states later)
    attendanceStatus: {
      type: String,
      default: "pending", // e.g. "pending", "confirmed", "confirmed-by-organizer"
    },

    // Simple boolean flags for confirmation
    confirmed: {
      type: Boolean,
      default: false,
    },

    confirmedByOrganizer: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// One RSVP per user/event
RsvpSchema.index({ userId: 1, eventId: 1 }, { unique: true });

const RSVP = mongoose.model("RSVP", RsvpSchema);
export default RSVP;
