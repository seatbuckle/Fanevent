// server/routes/events.public.js
import { Router } from "express";
import Event from "../models/Event.js";
const r = Router();

r.get("/", async (req, res) => {
  const events = await Event.find({ status: "approved" }).sort({ startAt: 1 }).limit(200);
  res.json(events);
});

r.get("/:id", async (req, res) => {
  const ev = await Event.findById(req.params.id);
  if (!ev || ev.status === "rejected") return res.sendStatus(404);
  res.json(ev);
});

export default r;
a