import mongoose from "mongoose";

const { Schema } = mongoose;

const AttachmentSchema = new Schema(
  {
    type: { type: String },
    url: { type: String },
    filename: { type: String },
  },
  { _id: false }
);

const MessageSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    from: { type: String, required: true },

    to: { type: String },
    body: { type: String, default: "" },
    attachments: [AttachmentSchema],

    // List of people who have read this message
    readBy: [{ type: String }],
  },
  { timestamps: true }
);

MessageSchema.index({ conversationId: 1, createdAt: -1 });

const Message = mongoose.models.Message || mongoose.model("Message", MessageSchema);
export default Message;
