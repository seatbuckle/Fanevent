// server/models/Groups.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const GroupSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 4000,
      default: "",
    },
    image: {
      type: String,
      trim: true,
      default: "",
    },
    category: {
      type: String,
      trim: true,
      default: "General",
    },

    // Store Clerk user id (e.g., "user_35V..."), not ObjectId
    createdBy: {
      type: String,
      required: true,
      index: true,
    },

    // Admin moderation
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    // Real membership: Clerk user IDs who joined
    members: [
      {
        type: String, // Clerk user id
      },
    ],

    // Optional: additional organizers/moderators by Clerk id
    moderators: [
      {
        type: String, // Clerk user id
      },
    ],

    // Optional: simple tags/search helpers
    tags: [{ type: String, trim: true }],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Computed count based on actual array length
GroupSchema.virtual("membersCount").get(function () {
  return Array.isArray(this.members) ? this.members.length : 0;
});

// Unique name per creator (still useful)
GroupSchema.index({ name: 1, createdBy: 1 }, { unique: true });

// Lightweight text search
GroupSchema.index({ name: "text", description: "text", category: "text", tags: "text" });

// Helpers stay essentially the same, but operate on string IDs
GroupSchema.methods.join = async function (clerkUserId) {
  if (!clerkUserId) return this;
  await this.updateOne({ $addToSet: { members: clerkUserId } });
  return await this.constructor.findById(this._id);
};

GroupSchema.methods.leave = async function (clerkUserId) {
  if (!clerkUserId) return this;
  await this.updateOne({ $pull: { members: clerkUserId } });
  return await this.constructor.findById(this._id);
};

GroupSchema.methods.toPublicJSON = function () {
  const obj = this.toJSON();
  delete obj.__v;
  return obj;
};

const Group = mongoose.models.Group || mongoose.model("Group", GroupSchema);
export default Group;
