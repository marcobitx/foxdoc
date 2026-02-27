// frontend/src/components/AuthRelay.tsx
// Exchanges a one-time relay code for auth tokens and stores them in localStorage
// This page must NOT be wrapped in ConvexAuthProvider — writes tokens BEFORE provider mounts
// Related: authRelay.ts (Convex), ConvexAuthWrapper.tsx

import { useEffect, useState } from "react";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";

const CONVEX_URL = import.meta.env.PUBLIC_CONVEX_URL;

export default function AuthRelay() {
  const [status, setStatus] = useState<"loading" | "error" | "success">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function exchangeCode() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (!code) {
        setStatus("error");
        setError("Trūksta autorizacijos kodo");
        return;
      }

      window.history.replaceState({}, "", "/auth/relay");

      try {
        const client = new ConvexHttpClient(CONVEX_URL);
        const result = await client.mutation(api.authRelay.exchangeRelayCode, { code });

        const namespace = CONVEX_URL.replace(/[^a-zA-Z0-9]/g, "");
        localStorage.setItem(`__convexAuthJWT_${namespace}`, result.jwt);
        localStorage.setItem(`__convexAuthRefreshToken_${namespace}`, result.refresh_token);

        setStatus("success");

        setTimeout(() => {
          window.location.href = "/";
        }, 500);
      } catch (err: any) {
        setStatus("error");
        setError(err.message || "Autorizacijos klaida");
      }
    }

    exchangeCode();
  }, []);

  return (
    <div className="flex items-center justify-center h-screen bg-[#231c18]">
      <div className="text-center">
        {status === "loading" && (
          <div className="text-surface-400 text-sm">Autorizuojama...</div>
        )}
        {status === "success" && (
          <div className="text-green-400 text-sm">Sėkmingai prisijungta! Nukreipiama...</div>
        )}
        {status === "error" && (
          <div className="space-y-3">
            <div className="text-red-400 text-sm">{error}</div>
            <a
              href={(import.meta.env.PUBLIC_LANDING_URL || "https://foxdoc.io") + "/auth"}
              className="text-brand-400 text-sm underline hover:no-underline"
            >
              Bandyti prisijungti iš naujo
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
