// landing/src/components/forum/ForumConvexProvider.tsx
// Convex provider for forum React islands — provides auth context
// Related: LandingConvexProvider.tsx

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { convex } from "../../lib/convex";

export default function ForumConvexProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConvexAuthProvider client={convex}>
      {children}
    </ConvexAuthProvider>
  );
}
