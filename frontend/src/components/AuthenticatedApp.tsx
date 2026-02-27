// frontend/src/components/AuthenticatedApp.tsx
// Wraps App.tsx with Convex Auth — gates the app behind authentication
// Unauthenticated users are redirected to foxdoc.io/auth
// Related: ConvexAuthWrapper.tsx, App.tsx

import { useConvexAuth } from "convex/react";
import ConvexAuthWrapper from "./ConvexAuthWrapper";
import App from "./App";

const LANDING_URL = import.meta.env.PUBLIC_LANDING_URL || "https://foxdoc.io";

function AuthGate() {
  const { isLoading, isAuthenticated } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#231c18]">
        <div className="text-surface-400 text-sm">Kraunama...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== "undefined") {
      window.location.href = `${LANDING_URL}/auth`;
    }
    return (
      <div className="flex items-center justify-center h-screen bg-[#231c18]">
        <div className="text-surface-400 text-sm">Nukreipiama į prisijungimą...</div>
      </div>
    );
  }

  return <App />;
}

export default function AuthenticatedApp() {
  return (
    <ConvexAuthWrapper>
      <AuthGate />
    </ConvexAuthWrapper>
  );
}
