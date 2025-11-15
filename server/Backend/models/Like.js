// server/models/Like.js
import mongoose from "mongoose";

const LikeSchema = new mongoose.Schema(
  {
    userId:  { type: String, index: true, required: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", index: true, required: true },
  },
  { timestamps: true }
);

LikeSchema.index({ userId: 1, eventId: 1 }, { unique: true });

const Like = mongoose.model("Like", LikeSchema);
export default Like;
