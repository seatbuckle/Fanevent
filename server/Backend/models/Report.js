// server/Backend/models/Report.js
import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    reporterClerkId: {
      type: String,
      required: true,
      index: true,
    },
    reporterName: {
      type: String,
      required: true,
    },
    reporterEmail: {
      type: String,
      required: true,
    },
    reportType: {
      type: String,
      enum: ["Event", "Group", "User", "Message"],
      required: true,
      index: true,
    },
    targetId: {
      type: String,
      required: true,
      index: true,
    },
    targetName: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      minlength: 10,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ["Open", "Under Review", "Resolved", "Dismissed"],
      default: "Open",
      index: true,
    },
    adminNotes: {
      type: String,
      default: "",
    },
    reviewedBy: {
      type: String,
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for admin queries
reportSchema.index({ status: 1, createdAt: -1 });

const Report = mongoose.model("Report", reportSchema);

export default Report;