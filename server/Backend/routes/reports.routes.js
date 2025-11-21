// server/Backend/routes/reports.routes.js
import express from "express";
import Report from "../models/Report.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { clerk } from "../../api/clerk.js";

const router = express.Router();

/* ========== Helpers (match your organizer route style) ========== */

const getReqUserId = (req) => {
  try {
    if (typeof req.auth === "function") return req.auth()?.userId || null;
    return req.auth?.userId || null;
  } catch {
    return null;
  }
};

async function safeGetUserProfile(userId) {
  try {
    const u = await clerk.users.getUser(userId);
    const email =
      u?.emailAddresses?.[0]?.emailAddress ||
      u?.primaryEmailAddress?.emailAddress ||
      "";
    const name =
      [u?.firstName, u?.lastName].filter(Boolean).join(" ") ||
      u?.username ||
      email ||
      "User";
    return { name, email };
  } catch {
    return { name: "User", email: "" };
  }
}

/* ========== Routes ========== */

// POST /api/reports  → Submit a new report
router.post("/", requireAuth, async (req, res) => {
  try {
    const { reportType, targetId, targetName, reason, reportCategory } = req.body;

    // Validate type
    if (!reportType || !["Event", "Group", "User", "Message"].includes(reportType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report type. Must be Event, Group, User, or Message.",
      });
    }

    // Validate category
    const CATEGORY_ENUM = [
      "Harassment",
      "Spam",
      "Misinformation",
      "Hate",
      "Scam/Fraud",
      "Sexual Content",
      "Violence",
      "Other",
    ];
    if (!reportCategory || !CATEGORY_ENUM.includes(reportCategory)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid report category. Must be one of Harassment, Spam, Misinformation, Hate, Scam/Fraud, Sexual Content, Violence, Other.",
      });
    }

    // Validate target
    if (!targetId || !targetName) {
      return res.status(400).json({
        success: false,
        message: "Target ID and name are required.",
      });
    }

    // Validate reason
    const trimmed = (reason || "").trim();
    if (trimmed.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Reason must be at least 10 characters long.",
      });
    }
    if (trimmed.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Reason must not exceed 1000 characters.",
      });
    }

    // Auth / reporter info
    const userId = getReqUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const { name, email } = await safeGetUserProfile(userId);

    // Create report
    const report = await Report.create({
      reportCategory,
      reporterClerkId: userId,
      reporterName: name || "Anonymous",
      reporterEmail: email || "unknown",
      reportType,
      targetId,
      targetName,
      reason: trimmed,
      status: "Open",
    });

    return res.status(201).json({
      success: true,
      message: "Report submitted successfully",
      report: {
        _id: report._id,
        reportType: report.reportType,
        reportCategory: report.reportCategory,
        status: report.status,
        createdAt: report.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating report:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit report",
      error: error.message,
    });
  }
});

// GET /api/reports/my-reports  → Current user's submitted reports
router.get("/my-reports", requireAuth, async (req, res) => {
  try {
    const userId = getReqUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const reports = await Report.find({ reporterClerkId: userId })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.json({
      success: true,
      reports,
    });
  } catch (error) {
    console.error("Error fetching user reports:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reports",
      error: error.message,
    });
  }
});

export default router;
