// Backend/controllers/export.controller.js
import { clerkClient } from "@clerk/express";
import Groups from "../models/Groups.js";
import Event from "../models/Event.js";
import Report from "../models/Report.js";
import RSVP from "../models/RSVP.js";
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to convert array of objects to CSV
const arrayToCSV = (data, headers) => {
  if (!data || data.length === 0) return "";
  
  const csvHeaders = headers.join(",");
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header] || "";
      // Escape quotes and wrap in quotes if contains comma, newline, or quote
      const stringValue = String(value).replace(/"/g, '""');
      if (stringValue.includes(",") || stringValue.includes("\n") || stringValue.includes('"')) {
        return `"${stringValue}"`;
      }
      return stringValue;
    }).join(",");
  });
  
  return [csvHeaders, ...csvRows].join("\n");
};

// Helper to create temp file with auto-delete
const createTempCSV = async (filename, content) => {
  const tempDir = path.join(__dirname, '../../temp');
  
  // Ensure temp directory exists
  try {
    await fs.mkdir(tempDir, { recursive: true });
  } catch (err) {
    console.error('Error creating temp directory:', err);
  }
  
  const filePath = path.join(tempDir, filename);
  
  // Write file
  await fs.writeFile(filePath, content, 'utf-8');
  
  // Schedule deletion after 10 minutes
  setTimeout(async () => {
    try {
      await fs.unlink(filePath);
      console.log(`Deleted temp file: ${filename}`);
    } catch (err) {
      console.error(`Error deleting temp file ${filename}:`, err);
    }
  }, 10 * 60 * 1000); // 10 minutes
  
  return filePath;
};

// Export users as CSV
export async function exportUsers(req, res) {
  try {
    // Get all Clerk users
    const clerkUsers = await clerkClient.users.getUserList({ limit: 500 });
    
    const csvData = [];
    
    for (const user of clerkUsers.data) {
      const email = user.emailAddresses?.[0]?.emailAddress || "";
      const role = user.publicMetadata?.role || "user";
      const joinDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "";
      const status = user.banned ? "Banned" : "Active";
      const username = user.username || user.firstName || email.split("@")[0] || "Unknown";
      
      csvData.push({
        user: username,
        email: email,
        role: role,
        joinDate: joinDate,
        status: status
      });
    }
    
    const csv = arrayToCSV(csvData, ["user", "email", "role", "joinDate", "status"]);
    const filename = `users-export-${Date.now()}.csv`;
    const filePath = await createTempCSV(filename, csv);
    
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    return res.sendFile(filePath);
  } catch (err) {
    console.error("Export users error:", err);
    return res.status(500).json({ ok: false, message: "Failed to export users" });
  }
}

// Export fandom groups as CSV
export async function exportGroups(req, res) {
  try {
    const groups = await Groups.find({}).lean();
    
    const csvData = groups.map(group => ({
      name: group.name || "",
      category: group.category || "",
      memberCount: group.members?.length || 0,
      dateCreated: group.createdAt ? new Date(group.createdAt).toLocaleDateString() : "",
      status: group.status || "pending"
    }));
    
    const csv = arrayToCSV(csvData, ["name", "category", "memberCount", "dateCreated", "status"]);
    const filename = `groups-export-${Date.now()}.csv`;
    const filePath = await createTempCSV(filename, csv);
    
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    return res.sendFile(filePath);
  } catch (err) {
    console.error("Export groups error:", err);
    return res.status(500).json({ ok: false, message: "Failed to export groups" });
  }
}

// Export events as CSV
export async function exportEvents(req, res) {
  try {
    const events = await Event.find({}).populate('groupId', 'name').lean();
    
    const csvData = events.map(event => ({
      eventName: event.title || event.name || "",
      group: event.groupId?.name || "N/A",
      dateOfEvent: event.startAt ? new Date(event.startAt).toLocaleDateString() : "",
      attendees: event.attendees?.length || 0,
      status: event.status || "pending"
    }));
    
    const csv = arrayToCSV(csvData, ["eventName", "group", "dateOfEvent", "attendees", "status"]);
    const filename = `events-export-${Date.now()}.csv`;
    const filePath = await createTempCSV(filename, csv);
    
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    return res.sendFile(filePath);
  } catch (err) {
    console.error("Export events error:", err);
    return res.status(500).json({ ok: false, message: "Failed to export events" });
  }
}

// Export reports as CSV
export async function exportReports(req, res) {
  try {
    const reports = await Report.find({}).lean();
    
    // Get reporter names from Clerk
    const reporterIds = [...new Set(reports.map(r => r.reporterId).filter(Boolean))];
    const reporterMap = {};
    
    for (const repId of reporterIds) {
      try {
        const user = await clerkClient.users.getUser(repId);
        const name = user.username || user.firstName || user.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "Unknown";
        reporterMap[repId] = name;
      } catch {
        reporterMap[repId] = "Unknown";
      }
    }
    
    const csvData = reports.map(report => ({
      target: report.targetName || report.targetId || "",
      typeCategory: `${report.reportType || ""}${report.reportCategory ? ` - ${report.reportCategory}` : ""}`,
      reason: report.reason || "",
      reportedBy: reporterMap[report.reporterId] || "Unknown",
      date: report.createdAt ? new Date(report.createdAt).toLocaleDateString() : "",
      status: report.status || "open"
    }));
    
    const csv = arrayToCSV(csvData, ["target", "typeCategory", "reason", "reportedBy", "date", "status"]);
    const filename = `reports-export-${Date.now()}.csv`;
    const filePath = await createTempCSV(filename, csv);
    
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    return res.sendFile(filePath);
  } catch (err) {
    console.error("Export reports error:", err);
    return res.status(500).json({ ok: false, message: "Failed to export reports" });
  }
}

// Export organizer's events as CSV
export async function exportOrganizerEvents(req, res) {
  try {
    const organizerId = req.auth.userId;
    if (!organizerId) {
      return res.status(401).json({ ok: false, message: "Unauthorized" });
    }

    // Use createdBy field instead of organizerId
    const events = await Event.find({ createdBy: organizerId }).lean();
    
    // Get RSVP counts for each event
    const eventIds = events.map(e => e._id);
    const rsvpCounts = await RSVP.aggregate([
      { $match: { eventId: { $in: eventIds } } },
      { $group: { _id: "$eventId", count: { $sum: 1 } } }
    ]);
    
    const rsvpMap = {};
    rsvpCounts.forEach(r => {
      rsvpMap[r._id.toString()] = r.count;
    });
    
    const csvData = events.map(event => ({
      eventName: event.title || "",
      dateOfEvent: event.startAt ? new Date(event.startAt).toLocaleDateString() : "",
      attendees: rsvpMap[event._id.toString()] || 0,
      status: event.status || "pending"
    }));
    
    const csv = arrayToCSV(csvData, ["eventName", "dateOfEvent", "attendees", "status"]);
    const filename = `my-events-export-${Date.now()}.csv`;
    const filePath = await createTempCSV(filename, csv);
    
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    return res.sendFile(filePath);
  } catch (err) {
    console.error("Export organizer events error:", err);
    return res.status(500).json({ ok: false, message: "Failed to export events" });
  }
}

// Export organizer's attendees as CSV
export async function exportOrganizerAttendees(req, res) {
  try {
    const organizerId = req.auth.userId;
    if (!organizerId) {
      return res.status(401).json({ ok: false, message: "Unauthorized" });
    }

    // Get all events by this organizer using createdBy field
    const events = await Event.find({ createdBy: organizerId }).lean();
    const eventIds = events.map(e => e._id);
    
    // Create a map of event IDs to event names
    const eventMap = {};
    events.forEach(e => {
      eventMap[e._id.toString()] = e.title || "Unknown Event";
    });
    
    // Get all RSVPs for these events
    const rsvps = await RSVP.find({ eventId: { $in: eventIds } }).lean();
    
    // Get attendee details from Clerk
    const attendeeIds = [...new Set(rsvps.map(r => r.userId).filter(Boolean))];
    const attendeeMap = {};
    
    for (const userId of attendeeIds) {
      try {
        const user = await clerkClient.users.getUser(userId);
        const name = user.username || user.firstName || user.lastName || "Unknown";
        const email = user.emailAddresses?.[0]?.emailAddress || "";
        attendeeMap[userId] = { name, email };
      } catch {
        attendeeMap[userId] = { name: "Unknown", email: "" };
      }
    }
    
    const csvData = rsvps.map(rsvp => ({
      name: attendeeMap[rsvp.userId]?.name || "Unknown",
      email: attendeeMap[rsvp.userId]?.email || "",
      eventName: eventMap[rsvp.eventId.toString()] || "Unknown Event",
      rsvpDate: rsvp.rsvpedAt ? new Date(rsvp.rsvpedAt).toLocaleDateString() : 
                (rsvp.createdAt ? new Date(rsvp.createdAt).toLocaleDateString() : ""),
      status: rsvp.status || "pending"
    }));
    
    const csv = arrayToCSV(csvData, ["name", "email", "eventName", "rsvpDate", "status"]);
    const filename = `attendees-export-${Date.now()}.csv`;
    const filePath = await createTempCSV(filename, csv);
    
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    return res.sendFile(filePath);
  } catch (err) {
    console.error("Export organizer attendees error:", err);
    return res.status(500).json({ ok: false, message: "Failed to export attendees" });
  }
}
