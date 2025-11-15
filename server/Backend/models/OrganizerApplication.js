import mongoose from "mongoose";

const organizerApplicationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true }, // Clerk user ID
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    group: { type: String, required: true },
    experience: { type: String, required: true },
    reason: { type: String, required: true },
    links: { type: String },
    status: { type: String, enum: ["pending","approved","rejected"], default: "pending", index: true },
    notes: { type: String },
    reviewedBy: { type: String }, // admin Clerk user ID
  },
  { timestamps: true }
);

export default mongoose.model("OrganizerApplication", organizerApplicationSchema);
