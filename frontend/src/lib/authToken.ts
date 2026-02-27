// frontend/src/lib/authToken.ts
// Provides the current Convex auth JWT for API calls
// Reads from localStorage directly — works outside React component tree
// Related: api.ts, convex.ts

const CONVEX_URL = import.meta.env.PUBLIC_CONVEX_URL || "";
const NAMESPACE = CONVEX_URL.replace(/[^a-zA-Z0-9]/g, "");

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(`__convexAuthJWT_${NAMESPACE}`);
}
