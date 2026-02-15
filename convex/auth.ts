// convex/auth.ts
// Convex Auth provider configuration with Google OAuth
// Enables user login/logout via Google accounts
// Related: schema.ts, http.ts

import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Google],
});
