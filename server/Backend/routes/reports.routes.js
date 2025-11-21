// server/Backend/routes/reports.routes.js
import express from "express";
import Report from "../models/Report.js";
import { requireAuth } from "../../middleware/requireAuth.js";

const router = express.Router();

// Submit a new report
router.post("/", requireAuth, async (req, res) => {
  try {
    const { reportType, targetId, targetName, reason } = req.body;

    // Validating
    if (!reportType || !["Event", "Group", "User", "Message"].includes(reportType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report type. Must be Event, Group, User, or Message.",
      });
    }

    if (!targetId || !targetName) {
      return res.status(400).json({
        success: false,
        message: "Target ID and name are required.",
      });
    }

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "Reason must be at least 10 characters long.",
      });
    }

    if (reason.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Reason must not exceed 1000 characters.",
      });
    }

    // Creating report
    const report = await Report.create({
      reporterClerkId: req.clerkUserId,
      reporterName: req.clerkUser?.fullName || req.clerkUser?.firstName || "Anonymous",
      reporterEmail: req.clerkUser?.emailAddresses?.[0]?.emailAddress || "unknown",
      reportType,
      targetId,
      targetName,
      reason: reason.trim(),
      status: "Open",
    });

    res.status(201).json({
      success: true,
      message: "Report submitted successfully",
      report: {
        _id: report._id,
        reportType: report.reportType,
        status: report.status,
        createdAt: report.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit report",
      error: error.message,
    });
  }
});

// Getting user's reports
router.get("/my-reports", requireAuth, async (req, res) => {
  try {
    const reports = await Report.find({
      reporterClerkId: req.clerkUserId,
    })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      reports,
    });
  } catch (error) {
    console.error("Error fetching user reports:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reports",
    });
  }
});

export default router;