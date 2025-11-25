// server/api/routes/health.routes.js
import express from "express";
import mongoose from "mongoose";

const router = express.Router();

/**
 * GET /api/health/web
 * Very simple "frontend can talk to backend" check.
 */
router.get("/health/web", (req, res) => {
  res.json({
    healthy: true,
    status: "operational",
    uptime: process.uptime(),
  });
});

/**
 * GET /api/health
 * Overall API health: you can add more checks here if you want.
 */
router.get("/health", (req, res) => {
  res.json({
    healthy: true,
    status: "operational",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/admin/health/db
 * Check database connectivity.
 * For Mongoose: readyState 1 = connected.
 */
router.get("/admin/health/db", async (req, res) => {
  try {
    const state = mongoose.connection.readyState;
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const healthy = state === 1;

    // Optionally, do a quick ping (no-op query)
    // await mongoose.connection.db.admin().ping();

    res.json({
      healthy,
      status: healthy ? "operational" : "down",
      readyState: state,
    });
  } catch (err) {
    console.error("DB health check failed:", err);
    res.status(500).json({
      healthy: false,
      status: "error",
      error: err.message,
    });
  }
});

/**
 * GET /api/admin/health/notifications
 * If you have a mail/push provider, you can ping it here.
 * For now, we can return a simple "assumed OK" response.
 */
router.get("/admin/health/notifications", async (req, res) => {
  try {
    // TODO: add a real check (e.g., list templates, or verify API key)
    // For now, just report that configuration exists.
    const hasMailKey = !!process.env.EMAIL_API_KEY; // adapt to your setup

    const healthy = hasMailKey; // or always true if you prefer

    res.json({
      healthy,
      status: healthy ? "operational" : "degraded",
      hasMailKey,
    });
  } catch (err) {
    console.error("Notifications health check failed:", err);
    res.status(500).json({
      healthy: false,
      status: "error",
      error: err.message,
    });
  }
});

/**
 * GET /api/admin/inngest/status
 *
 * Basic status for Inngest workers.
 * Start simple, then make it smarter once you have error logging.
 */
router.get("/admin/inngest/status", async (req, res) => {
  try {
    // TODO: if you log failed Inngest functions somewhere (DB / logs),
    // query them here and compute failingFunctions / failingCount.
    //
    // Example shape:
    const failingFunctions = []; // e.g., [{ name: 'sendWelcomeEmail', lastErrorAt: '...' }]

    const healthy = failingFunctions.length === 0;

    res.json({
      healthy,
      status: healthy ? "operational" : "degraded",
      failingFunctions,
      failingCount: failingFunctions.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Inngest status check failed:", err);
    res.status(500).json({
      healthy: false,
      status: "error",
      error: err.message,
    });
  }
});


export default router;
