// convex/crons.ts
// Scheduled jobs for periodic cleanup tasks
// Keeps the database clean by removing expired relay codes
// Related: authRelay.ts

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("cleanup expired relay codes", { hours: 1 }, internal.authRelay.cleanupExpiredCodes);

export default crons;
