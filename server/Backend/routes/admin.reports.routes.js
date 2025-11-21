// server/Backend/routes/admin.reports.routes.js
import express from "express";
import Report from "../models/Report.js";
import { requireRole } from "../../middleware/requireRole.js";

const router = express.Router();

// Getting all reports 
router.get("/", requireRole("admin"), async (req, res) => {
  try {
    const { status, reportType, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (reportType) query.reportType = reportType;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reports, total] = await Promise.all([
      Report.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Report.countDocuments(query),
    ]);

    res.json({
      success: true,
      reports,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reports",
      error: error.message,
    });
  }
});

// Get a single report by ID
router.get("/:id", requireRole("admin"), async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    res.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("Error fetching report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch report",
      error: error.message,
    });
  }
});

// Update report status
router.patch("/:id/status", requireRole("admin"), async (req, res) => {
  try {
    const { status, adminNotes } = req.body;

    if (!["Open", "Under Review", "Resolved", "Dismissed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const update = {
      status,
      reviewedBy: req.clerkUserId,
      reviewedAt: new Date(),
    };

    if (adminNotes) {
      update.adminNotes = adminNotes;
    }

    const report = await Report.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    res.json({
      success: true,
      message: "Report updated successfully",
      report,
    });
  } catch (error) {
    console.error("Error updating report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update report",
      error: error.message,
    });
  }
});

// Option to add admin notes to a report
router.patch("/:id/notes", requireRole("admin"), async (req, res) => {
  try {
    const { notes } = req.body;

    if (!notes || typeof notes !== "string") {
      return res.status(400).json({
        success: false,
        message: "Valid notes are required",
      });
    }

    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { 
        adminNotes: notes,
        reviewedBy: req.clerkUserId,
        reviewedAt: new Date(),
      },
      { new: true }
    );

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    res.json({
      success: true,
      message: "Notes added successfully",
      report,
    });
  } catch (error) {
    console.error("Error adding notes:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add notes",
      error: error.message,
    });
  }
});

// Delete a report
router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    res.json({
      success: true,
      message: "Report deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete report",
      error: error.message,
    });
  }
});

// Get reports statistics
router.get("/stats/overview", requireRole("admin"), async (req, res) => {
  try {
    const [
      totalReports,
      openReports,
      underReview,
      resolvedReports,
      dismissedReports,
      reportsByType,
    ] = await Promise.all([
      Report.countDocuments(),
      Report.countDocuments({ status: "Open" }),
      Report.countDocuments({ status: "Under Review" }),
      Report.countDocuments({ status: "Resolved" }),
      Report.countDocuments({ status: "Dismissed" }),
      Report.aggregate([
        {
          $group: {
            _id: "$reportType",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      stats: {
        total: totalReports,
        open: openReports,
        underReview,
        resolved: resolvedReports,
        dismissed: dismissedReports,
        byType: reportsByType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    console.error("Error fetching report stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch report statistics",
      error: error.message,
    });
  }
});

export default router;