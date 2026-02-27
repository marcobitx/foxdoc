// landing/src/lib/convex.ts
// Convex React client instance for the landing site
// Same deployment as app.foxdoc.io — shared user database
// Related: LandingConvexProvider.tsx

import { ConvexReactClient } from "convex/react";

const CONVEX_URL = import.meta.env.PUBLIC_CONVEX_URL;

if (!CONVEX_URL) {
  throw new Error("PUBLIC_CONVEX_URL environment variable is not set");
}

export const convex = new ConvexReactClient(CONVEX_URL);
