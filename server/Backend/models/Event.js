import mongoose from "mongoose";
const { Schema, Types } = mongoose; // ✅ add this line

const eventSchema = new Schema(
  {
    title: { type: String, required: true },
    image: String,
    media: [
      {
        type: { type: String, enum: ["image", "video", "youtube"], default: "image" },
        url: String,
        title: String,
        by: String,
      },
    ],
    tags: [String],
    description: String,

    // Group / category (adjust to your data model)
    groupId: { type: Types.ObjectId, ref: "Group", index: true }, // ✅ now works
    group: { type: String, trim: true },
    category: String,

    // Location
    locationName: String,
    address: String,
    city: String,
    state: String,
    zipCode: String,

    // Timing
    startAt: { type: Date, required: true },
    endAt: { type: Date },

    capacity: Number,
    price: Number,

    // Workflow
    status: { type: String, enum: ["pending", "approved", "rejected", "cancelled"], default: "pending" },
    createdBy: { type: String, required: true }, // Clerk user id
    approvedAt: Date,
    approvedBy: String, // Clerk admin id
  },
  { timestamps: true }
);

export default mongoose.model("Event", eventSchema);
