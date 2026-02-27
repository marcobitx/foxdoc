// landing/src/components/AuthForm.tsx
// Login/signup form with Google OAuth + Email/Password
// After successful auth: initializes Free plan, creates relay code, redirects to app
// Related: LandingConvexProvider.tsx, authRelay.ts, userCredits.ts

import { useState, useEffect } from "react";
import { useAuthActions, useAuthToken } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import LandingConvexProvider from "./LandingConvexProvider";

const APP_URL = import.meta.env.PUBLIC_APP_URL || "https://app.foxdoc.io";
const CONVEX_URL = import.meta.env.PUBLIC_CONVEX_URL || "";

type AuthTab = "signIn" | "signUp";

function AuthFormInner() {
  const { signIn, signOut } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const token = useAuthToken();
  const createRelayCode = useMutation(api.authRelay.createRelayCode);
  const initializeFreePlan = useMutation(api.userCredits.initializeFreePlan);

  const [tab, setTab] = useState<AuthTab>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  // Track if user just completed a fresh sign-in action (persists through Google OAuth redirect)
  const [justSignedIn, setJustSignedIn] = useState(() => {
    try { return sessionStorage.getItem("foxdoc_auth_pending") === "1"; } catch { return false; }
  });
  function markSignInPending() {
    try { sessionStorage.setItem("foxdoc_auth_pending", "1"); } catch {}
    setJustSignedIn(true);
  }
  function clearSignInPending() {
    try { sessionStorage.removeItem("foxdoc_auth_pending"); } catch {}
    setJustSignedIn(false);
  }

  // Read returnUrl from query params and persist in sessionStorage (survives Google OAuth redirect)
  const [returnUrl] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlParam = params.get("returnUrl");
      if (urlParam && urlParam.startsWith("/")) {
        sessionStorage.setItem("foxdoc_return_url", urlParam);
        return urlParam;
      }
      return sessionStorage.getItem("foxdoc_return_url") || null;
    } catch { return null; }
  });

  async function redirectToApp() {
    if (!token) return;

    setRedirecting(true);
    try {
      await initializeFreePlan({});

      const namespace = CONVEX_URL.replace(/[^a-zA-Z0-9]/g, "");
      const refreshToken = localStorage.getItem(`__convexAuthRefreshToken_${namespace}`) || "";

      const { code } = await createRelayCode({
        jwt: token,
        refresh_token: refreshToken,
      });

      clearSignInPending();
      try { sessionStorage.removeItem("foxdoc_return_url"); } catch {}
      const relayUrl = returnUrl
        ? `${APP_URL}/auth/relay?code=${code}&returnUrl=${encodeURIComponent(returnUrl)}`
        : `${APP_URL}/auth/relay?code=${code}`;
      window.location.href = relayUrl;
    } catch (err: any) {
      setError(err.message || "Klaida kuriant nukreipimą");
      setRedirecting(false);
    }
  }

  // Only auto-redirect if user just completed a fresh sign-in
  useEffect(() => {
    if (isAuthenticated && token && justSignedIn && !redirecting) {
      redirectToApp();
    }
  }, [isAuthenticated, token, justSignedIn]);

  if (redirecting) {
    return (
      <div className="text-center text-[#6d5f55] py-8">
        Nukreipiama į aplikaciją...
      </div>
    );
  }

  // Already authenticated — show choice instead of auto-redirect
  if (isAuthenticated && token && !justSignedIn) {
    return (
      <div className="w-full max-w-md mx-auto space-y-4">
        <p className="text-center text-[#6d5f55] text-sm mb-2">
          Jūs jau prisijungęs.
        </p>
        <button
          onClick={() => redirectToApp()}
          className="w-full py-3 px-4 rounded-lg bg-amber-500 text-neutral-900 font-semibold hover:bg-amber-400 transition-colors"
        >
          Eiti į aplikaciją
        </button>
        <button
          onClick={async () => {
            await signOut();
            clearSignInPending();
          }}
          className="w-full py-3 px-4 rounded-lg bg-[#f0e8df] text-[#3d3028] font-medium hover:bg-[#e8dfd5] border border-[#e5ddd4] transition-colors"
        >
          Atsijungti ir prisijungti kitu
        </button>
      </div>
    );
  }

  async function handleGoogle() {
    setError(null);
    setLoading(true);
    try {
      markSignInPending();
      const result = await signIn("google", { redirectTo: "/auth" });
      if (result.redirect) {
        window.location.href = result.redirect.toString();
      }
    } catch (err: any) {
      clearSignInPending();
      setError(err.message || "Google prisijungimo klaida");
    }
    setLoading(false);
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      markSignInPending();
      await signIn("password", {
        email,
        password,
        ...(tab === "signUp" ? { name, flow: "signUp" } : { flow: "signIn" }),
      });
    } catch (err: any) {
      clearSignInPending();
      setError(
        err.message || (tab === "signUp"
          ? "Registracijos klaida. Galbūt toks el. paštas jau užregistruotas."
          : "Neteisingas el. paštas arba slaptažodis.")
      );
    }
    setLoading(false);
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex mb-6 bg-[#f0e8df] rounded-lg p-1">
        <button
          onClick={() => setTab("signIn")}
          className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all ${
            tab === "signIn"
              ? "bg-white text-[#1a1512] shadow-sm"
              : "text-[#6d5f55] hover:text-[#1a1512]"
          }`}
        >
          Prisijungti
        </button>
        <button
          onClick={() => setTab("signUp")}
          className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all ${
            tab === "signUp"
              ? "bg-white text-[#1a1512] shadow-sm"
              : "text-[#6d5f55] hover:text-[#1a1512]"
          }`}
        >
          Registruotis
        </button>
      </div>

      <button
        onClick={handleGoogle}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg bg-white text-neutral-900 font-medium hover:bg-neutral-50 border border-[#e5ddd4] transition-colors disabled:opacity-50"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Prisijungti su Google
      </button>

      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-[#e5ddd4]"></div>
        <span className="text-xs text-[#a89888] uppercase tracking-wider">arba</span>
        <div className="flex-1 h-px bg-[#e5ddd4]"></div>
      </div>

      <form onSubmit={handleEmailAuth} className="space-y-4">
        {tab === "signUp" && (
          <div>
            <label className="block text-sm text-[#3d3028] mb-1.5">Vardas</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jonas Jonaitis"
              className="w-full px-4 py-3 bg-[#f8f3ed] border border-[#e5ddd4] rounded-lg text-[#1a1512] placeholder-[#a89888] focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
        )}
        <div>
          <label className="block text-sm text-[#3d3028] mb-1.5">El. paštas</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="jonas@organizacija.lt"
            className="w-full px-4 py-3 bg-[#f8f3ed] border border-[#e5ddd4] rounded-lg text-[#1a1512] placeholder-[#a89888] focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm text-[#3d3028] mb-1.5">Slaptažodis</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="Mažiausiai 8 simboliai"
            className="w-full px-4 py-3 bg-[#f8f3ed] border border-[#e5ddd4] rounded-lg text-[#1a1512] placeholder-[#a89888] focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 px-4 py-2.5 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-lg bg-amber-500 text-neutral-900 font-semibold hover:bg-amber-400 transition-all disabled:opacity-50 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]"
        >
          {loading ? "Palaukite..." : tab === "signIn" ? "Prisijungti" : "Registruotis"}
        </button>
      </form>

      {tab === "signIn" && (
        <p className="text-center text-sm text-[#a89888] mt-4">
          <button className="text-amber-500 hover:underline">
            Pamiršote slaptažodį?
          </button>
        </p>
      )}

      <p className="text-center text-xs text-[#a89888] mt-6">
        {tab === "signUp"
          ? "Registruodamiesi sutinkate su naudojimo sąlygomis ir privatumo politika."
          : "Neturite paskyros? "}
        {tab === "signIn" && (
          <button onClick={() => setTab("signUp")} className="text-amber-500 hover:underline">
            Registruokitės
          </button>
        )}
      </p>
    </div>
  );
}

export default function AuthForm() {
  return (
    <LandingConvexProvider>
      <AuthFormInner />
    </LandingConvexProvider>
  );
}
