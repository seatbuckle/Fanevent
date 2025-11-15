// server/models/RSVP.js
import mongoose from "mongoose";

const RsvpSchema = new mongoose.Schema(
  {
    userId:  { type: String, index: true, required: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", index: true, required: true },

    rsvpedAt:   { type: Date, default: Date.now },
    checkInAt:  Date,
    checkOutAt: Date,
    attended:   { type: Boolean, default: false },
    attendedHours: Number,
  },
  { timestamps: true }
);

RsvpSchema.index({ userId: 1, eventId: 1 }, { unique: true });

const RSVP = mongoose.model("RSVP", RsvpSchema);
export default RSVP;

