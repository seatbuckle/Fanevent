// server/api/clerk.js  (ESM file)
import { createClerkClient } from '@clerk/backend';

export const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});
