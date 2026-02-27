// landing/src/components/LandingConvexProvider.tsx
// Wraps landing components with Convex Auth for login/signup
// Same Convex deployment as app — shared auth tables
// Related: convex.ts, AuthForm.tsx

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { convex } from "../lib/convex";

export default function LandingConvexProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConvexAuthProvider client={convex}>
      {children}
    </ConvexAuthProvider>
  );
}
