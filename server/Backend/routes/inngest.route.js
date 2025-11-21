// Backend/routes/inngest.route.js
import { serve } from 'inngest/express';
import { inngest, functions } from '../inngest/index.js';

export const inngestRouter = serve({
  client: inngest,
  functions,
  servePath: '/api/inngest',
});