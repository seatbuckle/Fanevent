import mongoose from "mongoose";
import { usersDb } from "../config/db.js";

const userSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    username: { type: String, required: true },
    image: { type: String, required: true },

    notificationPreferences: {
    eventUpdates: { type: Boolean, default: true },
    eventReminders: { type: Boolean, default: true },
    groupAnnouncements: { type: Boolean, default: true },
    adminWarnings: { type: Boolean, default: true }, // maybe always true in logic
    marketing: { type: Boolean, default: false },
  },
});
const User = usersDb.model("User", userSchema);
export default User;
