import mongoose from "mongoose";

const { Schema } = mongoose;

const ConversationSchema = new Schema(
  {
    // Clerk user ids
    participants: [{ type: String, required: true}],
   
    groupId: { type: Schema.Types.ObjectId, ref: "Group", index: true },
    lastMessage: { type: Schema.Types.ObjectId, ref: "Message" },

    unread: {
      type: Map,
      of: Number,
      default: {},
    },

    title: { type: String },
  },
  { timestamps: true }
);

ConversationSchema.index({ participants: 1 });

const Conversation = mongoose.models.Conversation || mongoose.model("Conversation", ConversationSchema);
export default Conversation;
