// models/EventReminder.js
import mongoose from "mongoose";

const EventReminderSchema = new mongoose.Schema(
  {
    userId: {
      type: String,           // Clerk user id as a string
      required: true,
      index: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    offsets: {
      type: [Number],         // minutes before the event
      default: [],
    },
  },
  { timestamps: true }
);

EventReminderSchema.index({ userId: 1, eventId: 1 }, { unique: true });

export const EventReminder =
  mongoose.models.EventReminder ||
  mongoose.model("EventReminder", EventReminderSchema);


export default EventReminder;
