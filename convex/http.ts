// convex/http.ts
// HTTP router for Convex Auth OAuth callback handling
// Required for Google OAuth redirect flow
// Related: auth.ts

import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();
auth.addHttpRoutes(http);

export default http;
