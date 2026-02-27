// frontend/src/components/ConvexAuthWrapper.tsx
// Wraps the app with Convex Auth provider for session management
// All child components can use useConvexAuth, useAuthActions, useAuthToken
// Related: convex.ts, App.tsx

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { convex } from "../lib/convex";

export default function ConvexAuthWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ConvexAuthProvider client={convex}>
      {children}
    </ConvexAuthProvider>
  );
}
