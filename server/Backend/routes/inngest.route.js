// server/inngest.route.js
import express from "express";
import { serve } from "inngest/express";
import { inngest, functions } from "../inngest/index.js";
const inngestRouter = express.Router();

// v3: ONLY raw → serve({ client, functions }) — no eventKey/signingKey here
inngestRouter.use(
  express.raw({ type: "*/*" }),
  serve({
    client: inngest,
    functions,
  })
);

export { inngestRouter };