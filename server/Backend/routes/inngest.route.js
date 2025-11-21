import { Router } from 'express';
import { serve } from 'inngest/express';
import { inngest, functions } from '../inngest/index.js';

export const inngestRouter = Router();
inngestRouter.use(serve({ client: inngest, functions }));