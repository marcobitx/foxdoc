// convex/auth.ts
// Convex Auth provider configuration with Google OAuth + Email/Password
// Enables user login/logout via Google accounts and email credentials
// Related: schema.ts, http.ts

import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Google, Password],
});
