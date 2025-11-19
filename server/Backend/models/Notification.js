import mongoose from "mongoose";

const { Schema } = mongoose;

const NotificationSchema = new Schema(
  {
    userId: { type: String, required: true, index: true }, // who the notif is for
    actorId: { type: String }, // who triggered it (optional)
    type: { type: String, required: true }, // what kind of notif it is
    data: { type: Schema.Types.Mixed }, // extra info for the client
    read: { type: Boolean, default: false, index: true }, // if user has seen it
    link: { type: String }, // optional link to open
  },
  { timestamps: true }
);

// sort notifs by newest for this user
NotificationSchema.index({ userId: 1, createdAt: -1 });

const Notification =
  mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);

export default Notification;
