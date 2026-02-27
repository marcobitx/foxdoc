# Auth Implementation Plan v2

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add authentication (Google + Email/Password) with automatic Free plan (3 credits) for new users. Login on foxdoc.io landing, relay to app.foxdoc.io via one-time code.

**Architecture:** Landing (foxdoc.io) handles login/signup via Convex Auth → creates one-time relay code → redirects to app.foxdoc.io/auth/relay → exchanges code for tokens → user lands in app. New users auto-get Free plan. Both sites share one Convex deployment.

**Tech Stack:** Convex Auth (@convex-dev/auth), @auth/core, React 19, Astro 5, Tailwind CSS v4, FastAPI

**Design doc:** `docs/plans/2026-02-26-auth-design.md`

**Key decision:** Stripe/payments come LATER. This plan only covers auth + Free plan auto-assignment.

---

## Pre-requisite: Landing page is on `feat/landing-page` branch (worktree at `.worktrees/feat-landing/`)

---

## Phase 0: Merge Landing Branch

### Task 0: Merge feat/landing-page into main

**Files:**
- All landing/ directory files from feat/landing-page branch

**Step 1: Merge the branch**

```bash
cd /c/Users/nj/projects/foxdoc
git checkout main
git merge feat/landing-page --no-ff -m "feat: merge landing page into main"
```

If conflicts, resolve them — landing/ is a new directory so conflicts are unlikely.

**Step 2: Verify merge**

```bash
ls landing/
# Should show: src/, package.json, astro.config.mjs, etc.
```

**Step 3: Remove worktree (cleanup)**

```bash
git worktree remove .worktrees/feat-landing
```

**Step 4: Verify landing dev server**

```bash
cd landing && bun install && bun run dev
```

Expected: Landing page at localhost:3000 with all pages (/, /features, /pricing, /use-cases, /about, /docs).

---

## Phase 1: Convex Server-Side Auth

### Task 1: Add Password provider to Convex Auth

**Files:**
- Modify: `convex/auth.ts`

**Step 1: Update auth.ts to include Password provider**

```typescript
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
```

**Step 2: Verify Convex dev server picks up the change**

Run: `cd /c/Users/nj/projects/foxdoc && npx convex dev --once`
Expected: Schema push succeeds, no errors about Password provider.

**Step 3: Commit**

```bash
git add convex/auth.ts
git commit -m "feat(auth): add Password provider for email/password login"
```

---

### Task 2: Add auth_relay_codes and user_credits tables to schema

**Files:**
- Modify: `convex/schema.ts`

**Step 1: Add both tables before the closing `});`**

```typescript
  // ── Auth relay codes (cross-domain session transfer) ──
  auth_relay_codes: defineTable({
    code: v.string(),
    user_id: v.id("users"),
    session_id: v.string(),
    jwt: v.string(),
    refresh_token: v.string(),
    expires_at: v.number(),
    used: v.boolean(),
  })
    .index("by_code", ["code"])
    .index("by_expires_at", ["expires_at"]),

  // ── User credits (Free plan auto-assigned on registration) ──
  user_credits: defineTable({
    user_id: v.id("users"),
    plan: v.string(),           // "free" | "starter" | "pro" | "team"
    credits_total: v.number(),  // credits per month
    credits_used: v.number(),   // credits used this period
    period_start: v.number(),   // epoch ms — start of current billing period
    period_end: v.number(),     // epoch ms — end of current billing period
  })
    .index("by_user", ["user_id"]),
```

**Step 2: Push schema**

Run: `cd /c/Users/nj/projects/foxdoc && npx convex dev --once`
Expected: Schema push succeeds, new tables created.

**Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(auth): add auth_relay_codes and user_credits tables"
```

---

### Task 3: Create relay code Convex functions + auto Free plan

**Files:**
- Create: `convex/authRelay.ts`
- Create: `convex/userCredits.ts`

**Step 1: Write the relay functions**

```typescript
// convex/authRelay.ts
// One-time code relay for cross-domain auth (foxdoc.io → app.foxdoc.io)
// Creates and exchanges short-lived codes to transfer auth sessions safely
// Related: auth.ts, schema.ts, http.ts

import { v } from "convex/values";
import { mutation, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const CODE_TTL_MS = 60_000; // 60 seconds

function generateCode(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Create a one-time relay code for transferring auth to another domain.
 * Must be called by an authenticated user.
 */
export const createRelayCode = mutation({
  args: {
    jwt: v.string(),
    refresh_token: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const code = generateCode();
    const now = Date.now();

    await ctx.db.insert("auth_relay_codes", {
      code,
      user_id: userId,
      session_id: "",
      jwt: args.jwt,
      refresh_token: args.refresh_token,
      expires_at: now + CODE_TTL_MS,
      used: false,
    });

    return { code };
  },
});

/**
 * Exchange a one-time relay code for auth tokens.
 * Public — no auth required (the code IS the auth).
 */
export const exchangeRelayCode = mutation({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const relayCode = await ctx.db
      .query("auth_relay_codes")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (!relayCode) {
      throw new Error("Invalid or expired code");
    }

    if (relayCode.used) {
      throw new Error("Code already used");
    }

    if (Date.now() > relayCode.expires_at) {
      await ctx.db.delete(relayCode._id);
      throw new Error("Code expired");
    }

    // Mark as used
    await ctx.db.patch(relayCode._id, { used: true });

    return {
      jwt: relayCode.jwt,
      refresh_token: relayCode.refresh_token,
    };
  },
});

/**
 * Clean up expired relay codes. Called by cron.
 */
export const cleanupExpiredCodes = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("auth_relay_codes")
      .withIndex("by_expires_at")
      .filter((q) => q.lt(q.field("expires_at"), now))
      .collect();

    for (const code of expired) {
      await ctx.db.delete(code._id);
    }

    return { deleted: expired.length };
  },
});
```

**Step 2: Write the user credits functions with auto Free plan**

```typescript
// convex/userCredits.ts
// Manages user credit balances and auto-assigns Free plan on first login
// New users automatically get Free plan with 3 credits/month
// Related: schema.ts, authRelay.ts

import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const FREE_PLAN_CREDITS = 3;
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Get current user's credit info. Auto-creates Free plan if none exists.
 */
export const getMyCredits = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const credits = await ctx.db
      .query("user_credits")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .first();

    return credits;
  },
});

/**
 * Initialize Free plan for a new user. Called after first successful login.
 * Idempotent — does nothing if user already has a plan.
 */
export const initializeFreePlan = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if already has credits
    const existing = await ctx.db
      .query("user_credits")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .first();

    if (existing) return existing;

    const now = Date.now();
    const id = await ctx.db.insert("user_credits", {
      user_id: userId,
      plan: "free",
      credits_total: FREE_PLAN_CREDITS,
      credits_used: 0,
      period_start: now,
      period_end: now + MONTH_MS,
    });

    return await ctx.db.get(id);
  },
});

/**
 * Use a credit for an analysis. Returns true if successful, false if no credits left.
 */
export const useCredit = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const credits = await ctx.db
      .query("user_credits")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .first();

    if (!credits) throw new Error("No plan found");

    // Check if period expired — reset if so
    const now = Date.now();
    if (now > credits.period_end) {
      await ctx.db.patch(credits._id, {
        credits_used: 0,
        period_start: now,
        period_end: now + MONTH_MS,
      });
      // After reset, check again
      if (credits.credits_total <= 0) return false;
      await ctx.db.patch(credits._id, { credits_used: 1 });
      return true;
    }

    if (credits.credits_used >= credits.credits_total) {
      return false; // No credits left
    }

    await ctx.db.patch(credits._id, {
      credits_used: credits.credits_used + 1,
    });

    return true;
  },
});
```

**Step 3: Verify Convex picks up the functions**

Run: `cd /c/Users/nj/projects/foxdoc && npx convex dev --once`
Expected: Functions registered.

**Step 4: Commit**

```bash
git add convex/authRelay.ts convex/userCredits.ts
git commit -m "feat(auth): add relay code functions and user credits with auto Free plan"
```

---

### Task 4: Add cleanup cron for expired relay codes

**Files:**
- Create: `convex/crons.ts`

**Step 1: Create the cron file**

```typescript
// convex/crons.ts
// Scheduled jobs for periodic cleanup tasks
// Keeps the database clean by removing expired relay codes
// Related: authRelay.ts

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("cleanup expired relay codes", { hours: 1 }, internal.authRelay.cleanupExpiredCodes);

export default crons;
```

**Step 2: Verify**

Run: `cd /c/Users/nj/projects/foxdoc && npx convex dev --once`
Expected: Cron registered successfully.

**Step 3: Commit**

```bash
git add convex/crons.ts
git commit -m "feat(auth): add hourly cron to clean expired relay codes"
```

---

### Task 5: Create users query

**Files:**
- Create: `convex/users.ts`

**Step 1: Write the users query**

```typescript
// convex/users.ts
// User-related queries for the frontend
// Returns current authenticated user's profile
// Related: auth.ts, schema.ts

import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});
```

**Step 2: Commit**

```bash
git add convex/users.ts
git commit -m "feat(auth): add currentUser query"
```

---

## Phase 2: App Frontend Auth (frontend/)

### Task 6: Install Convex packages in frontend

**Step 1: Install dependencies**

```bash
cd /c/Users/nj/projects/foxdoc/frontend
bun add convex @convex-dev/auth @auth/core
```

**Step 2: Add PUBLIC_CONVEX_URL to frontend .env**

Get the URL: `cd /c/Users/nj/projects/foxdoc && cat .env.local`

Add to `frontend/.env`:
```env
PUBLIC_CONVEX_URL=<convex-deployment-url>
```

**Step 3: Commit**

```bash
git add frontend/package.json frontend/bun.lock
git commit -m "feat(auth): add convex client packages to frontend"
```

---

### Task 7: Create Convex client, auth provider, and AuthenticatedApp wrapper

**Files:**
- Create: `frontend/src/lib/convex.ts`
- Create: `frontend/src/components/ConvexAuthWrapper.tsx`
- Create: `frontend/src/components/AuthenticatedApp.tsx`
- Modify: `frontend/src/pages/index.astro`

**Step 1: Create Convex client**

```typescript
// frontend/src/lib/convex.ts
// Convex React client instance for the app frontend
// Shared across all components that need Convex access
// Related: ConvexAuthWrapper.tsx, App.tsx

import { ConvexReactClient } from "convex/react";

const CONVEX_URL = import.meta.env.PUBLIC_CONVEX_URL;

if (!CONVEX_URL) {
  throw new Error("PUBLIC_CONVEX_URL environment variable is not set");
}

export const convex = new ConvexReactClient(CONVEX_URL);
```

**Step 2: Create auth provider wrapper**

```tsx
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
```

**Step 3: Create AuthenticatedApp**

```tsx
// frontend/src/components/AuthenticatedApp.tsx
// Wraps App.tsx with Convex Auth — gates the app behind authentication
// Unauthenticated users are redirected to foxdoc.io/auth
// Related: ConvexAuthWrapper.tsx, App.tsx

import { useConvexAuth } from "convex/react";
import ConvexAuthWrapper from "./ConvexAuthWrapper";
import App from "./App";

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
      window.location.href = "https://foxdoc.io/auth";
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
```

**Step 4: Update index.astro to use AuthenticatedApp**

Replace the current App import with AuthenticatedApp:

```astro
---
import Layout from '../layouts/Layout.astro';
import AuthenticatedApp from '../components/AuthenticatedApp';
---
<Layout title="foxDoc">
  <AuthenticatedApp client:only="react" />
</Layout>
```

**Step 5: Verify**

Run: `cd /c/Users/nj/projects/foxdoc/frontend && bun run dev`
Expected: App shows loading → redirects to foxdoc.io/auth.

**Step 6: Commit**

```bash
git add frontend/src/lib/convex.ts frontend/src/components/ConvexAuthWrapper.tsx frontend/src/components/AuthenticatedApp.tsx frontend/src/pages/index.astro
git commit -m "feat(auth): gate app behind authentication with Convex Auth"
```

---

### Task 8: Create auth relay page

**Files:**
- Create: `frontend/src/pages/auth/relay.astro`
- Create: `frontend/src/components/AuthRelay.tsx`

**Step 1: Create the relay React component**

```tsx
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

      // Immediately clean URL to prevent code leakage
      window.history.replaceState({}, "", "/auth/relay");

      try {
        const client = new ConvexHttpClient(CONVEX_URL);
        const result = await client.mutation(api.authRelay.exchangeRelayCode, { code });

        // Write tokens to localStorage in Convex Auth format
        const namespace = CONVEX_URL.replace(/[^a-zA-Z0-9]/g, "");
        localStorage.setItem(`__convexAuthJWT_${namespace}`, result.jwt);
        localStorage.setItem(`__convexAuthRefreshToken_${namespace}`, result.refresh_token);

        setStatus("success");

        // Redirect to app root — ConvexAuthProvider will find tokens on mount
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
              href="https://foxdoc.io/auth"
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
```

**Step 2: Create the Astro page (NO ConvexAuthProvider)**

```astro
---
// frontend/src/pages/auth/relay.astro
// Standalone page that receives one-time auth code and stores tokens
// Must NOT use ConvexAuthProvider — tokens are written before provider mounts
// Related: AuthRelay.tsx, authRelay.ts (Convex)

import Layout from '../../layouts/Layout.astro';
import AuthRelay from '../../components/AuthRelay';
---
<Layout title="foxDoc — Autorizacija">
  <AuthRelay client:only="react" />
</Layout>
```

**Step 3: Verify**

Navigate to: `http://localhost:4321/auth/relay`
Expected: Shows "Trūksta autorizacijos kodo" (no code in URL — correct).

**Step 4: Commit**

```bash
git add frontend/src/pages/auth/relay.astro frontend/src/components/AuthRelay.tsx
git commit -m "feat(auth): add auth relay page for cross-domain token exchange"
```

---

### Task 9: Add auth token to API calls

**Files:**
- Create: `frontend/src/lib/authToken.ts`
- Modify: `frontend/src/lib/api.ts`

**Step 1: Create token accessor**

```typescript
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
```

**Step 2: Add auth headers to api.ts**

At the top of `frontend/src/lib/api.ts`, add:

```typescript
import { getAuthToken } from "./authToken";

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
```

Then inject `...authHeaders()` into every `fetch()` call's headers in api.ts.

**Step 3: Verify build**

Run: `cd /c/Users/nj/projects/foxdoc/frontend && bun run build`
Expected: No type errors.

**Step 4: Commit**

```bash
git add frontend/src/lib/authToken.ts frontend/src/lib/api.ts
git commit -m "feat(auth): inject Bearer token into all API calls"
```

---

### Task 10: Add UserMenu with logout to TopBar

**Files:**
- Create: `frontend/src/components/UserMenu.tsx`
- Modify: `frontend/src/components/TopBar.tsx`

**Step 1: Create UserMenu component**

```tsx
// frontend/src/components/UserMenu.tsx
// User avatar + dropdown menu with logout in the TopBar
// Shows user name/email and sign-out action
// Related: TopBar.tsx, ConvexAuthWrapper.tsx

import { useState, useRef, useEffect } from "react";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../convex/_generated/api";
import { LogOut, User } from "lucide-react";

export default function UserMenu() {
  const { signOut } = useAuthActions();
  const currentUser = useQuery(api.users.currentUser);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "https://foxdoc.io";
  };

  const displayName = currentUser?.name || currentUser?.email || "Vartotojas";
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-700/30 transition-colors"
      >
        {currentUser?.image ? (
          <img src={currentUser.image} alt="" className="w-7 h-7 rounded-full" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-xs font-semibold">
            {initials}
          </div>
        )}
        <span className="text-sm text-surface-300 hidden sm:block max-w-[120px] truncate">
          {displayName}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 py-1 bg-surface-800 border border-surface-700/50 rounded-lg shadow-xl z-50">
          <div className="px-3 py-2 border-b border-surface-700/50">
            <p className="text-sm text-surface-200 truncate">{displayName}</p>
            {currentUser?.email && (
              <p className="text-xs text-surface-400 truncate">{currentUser.email}</p>
            )}
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-300 hover:bg-surface-700/50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Atsijungti
          </button>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Add UserMenu to TopBar**

In `frontend/src/components/TopBar.tsx`:
- Add `import UserMenu from "./UserMenu";`
- Insert `<UserMenu />` in the right-side area of the TopBar

**Step 3: Commit**

```bash
git add frontend/src/components/UserMenu.tsx frontend/src/components/TopBar.tsx
git commit -m "feat(auth): add user menu with logout to TopBar"
```

---

## Phase 3: Landing Auth Page (landing/)

### Task 11: Install Convex packages in landing

**Step 1: Install dependencies**

```bash
cd /c/Users/nj/projects/foxdoc/landing
bun add convex @convex-dev/auth @auth/core
```

**Step 2: Create landing .env**

```env
PUBLIC_CONVEX_URL=<convex-deployment-url>
PUBLIC_APP_URL=http://localhost:4321
```

Note: In production, PUBLIC_APP_URL=https://app.foxdoc.io

**Step 3: Commit**

```bash
git add landing/package.json landing/bun.lock
git commit -m "feat(auth): add convex client packages to landing"
```

---

### Task 12: Create auth page on landing

**Files:**
- Create: `landing/src/lib/convex.ts`
- Create: `landing/src/components/LandingConvexProvider.tsx`
- Create: `landing/src/components/AuthForm.tsx`
- Create: `landing/src/pages/auth.astro`

**Step 1: Create Convex client for landing**

```typescript
// landing/src/lib/convex.ts
// Convex React client instance for the landing site
// Same deployment as app.foxdoc.io — shared user database
// Related: LandingConvexProvider.tsx

import { ConvexReactClient } from "convex/react";

const CONVEX_URL = import.meta.env.PUBLIC_CONVEX_URL;

if (!CONVEX_URL) {
  throw new Error("PUBLIC_CONVEX_URL environment variable is not set");
}

export const convex = new ConvexReactClient(CONVEX_URL);
```

**Step 2: Create ConvexAuthProvider wrapper**

```tsx
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
```

**Step 3: Create auth form component**

```tsx
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
  const { signIn } = useAuthActions();
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

  // When authenticated, initialize Free plan + create relay code + redirect
  async function redirectToApp() {
    if (!token) return;

    setRedirecting(true);
    try {
      // Auto-assign Free plan (idempotent — does nothing if already has plan)
      await initializeFreePlan({});

      const namespace = CONVEX_URL.replace(/[^a-zA-Z0-9]/g, "");
      const refreshToken = localStorage.getItem(`__convexAuthRefreshToken_${namespace}`) || "";

      const { code } = await createRelayCode({
        jwt: token,
        refresh_token: refreshToken,
      });

      window.location.href = `${APP_URL}/auth/relay?code=${code}`;
    } catch (err: any) {
      setError(err.message || "Klaida kuriant nukreipimą");
      setRedirecting(false);
    }
  }

  // Auto-redirect when already authenticated
  useEffect(() => {
    if (isAuthenticated && token && !redirecting) {
      redirectToApp();
    }
  }, [isAuthenticated, token]);

  if (redirecting) {
    return (
      <div className="text-center text-neutral-300 py-8">
        Nukreipiama į aplikaciją...
      </div>
    );
  }

  async function handleGoogle() {
    setError(null);
    setLoading(true);
    try {
      const result = await signIn("google", { redirectTo: "/auth" });
      if (result.redirect) {
        window.location.href = result.redirect.toString();
      }
    } catch (err: any) {
      setError(err.message || "Google prisijungimo klaida");
    }
    setLoading(false);
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn("password", {
        email,
        password,
        ...(tab === "signUp" ? { name, flow: "signUp" } : { flow: "signIn" }),
      });
    } catch (err: any) {
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
      {/* Tab toggle */}
      <div className="flex mb-6 bg-neutral-800/50 rounded-lg p-1">
        <button
          onClick={() => setTab("signIn")}
          className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all ${
            tab === "signIn"
              ? "bg-neutral-700 text-white shadow-sm"
              : "text-neutral-400 hover:text-neutral-300"
          }`}
        >
          Prisijungti
        </button>
        <button
          onClick={() => setTab("signUp")}
          className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all ${
            tab === "signUp"
              ? "bg-neutral-700 text-white shadow-sm"
              : "text-neutral-400 hover:text-neutral-300"
          }`}
        >
          Registruotis
        </button>
      </div>

      {/* Google OAuth */}
      <button
        onClick={handleGoogle}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg bg-white text-neutral-900 font-medium hover:bg-neutral-100 transition-colors disabled:opacity-50"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Prisijungti su Google
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-neutral-700"></div>
        <span className="text-xs text-neutral-500 uppercase tracking-wider">arba</span>
        <div className="flex-1 h-px bg-neutral-700"></div>
      </div>

      {/* Email/Password form */}
      <form onSubmit={handleEmailAuth} className="space-y-4">
        {tab === "signUp" && (
          <div>
            <label className="block text-sm text-neutral-400 mb-1.5">Vardas</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jonas Jonaitis"
              className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-[#00ca88] transition-colors"
            />
          </div>
        )}
        <div>
          <label className="block text-sm text-neutral-400 mb-1.5">El. paštas</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="jonas@organizacija.lt"
            className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-[#00ca88] transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1.5">Slaptažodis</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="Mažiausiai 8 simboliai"
            className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-[#00ca88] transition-colors"
          />
        </div>

        {error && (
          <div className="text-red-400 text-sm bg-red-500/10 px-4 py-2.5 rounded-lg">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-lg bg-[#00ca88] text-[#0d0f14] font-semibold hover:bg-[#00b578] transition-colors disabled:opacity-50"
        >
          {loading ? "Palaukite..." : tab === "signIn" ? "Prisijungti" : "Registruotis"}
        </button>
      </form>

      {tab === "signIn" && (
        <p className="text-center text-sm text-neutral-500 mt-4">
          <button
            onClick={() => {/* TODO: implement password reset */}}
            className="text-[#00ca88] hover:underline"
          >
            Pamiršote slaptažodį?
          </button>
        </p>
      )}

      <p className="text-center text-xs text-neutral-600 mt-6">
        {tab === "signUp"
          ? "Registruodamiesi sutinkate su naudojimo sąlygomis ir privatumo politika."
          : "Neturite paskyros? "}
        {tab === "signIn" && (
          <button onClick={() => setTab("signUp")} className="text-[#00ca88] hover:underline">
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
```

**Step 4: Create the auth page**

```astro
---
// landing/src/pages/auth.astro
// Login/signup page for foxdoc.io
// Authenticates users and redirects to app.foxdoc.io via relay code
// Related: AuthForm.tsx, LandingConvexProvider.tsx

import Layout from '../layouts/Layout.astro';
import AuthForm from '../components/AuthForm';
---
<Layout title="foxDoc — Prisijungti">
  <div class="min-h-screen flex items-center justify-center px-4 py-12"
       style="background: radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.15) 0%, #0d0f14 70%);">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <a href="/" class="inline-flex items-center gap-2 mb-6">
          <img src="/favicon.svg" alt="foxDoc" class="w-8 h-8" />
          <span class="text-xl font-bold text-white" style="font-family: 'Space Grotesk', sans-serif;">
            fox<span class="text-[#00ca88]">Doc</span>
          </span>
        </a>
        <h1 class="text-2xl font-bold text-white" style="font-family: 'Space Grotesk', sans-serif;">
          Sveiki sugrįžę
        </h1>
        <p class="text-neutral-400 mt-2 text-sm">
          Prisijunkite arba susikurkite paskyrą
        </p>
      </div>

      <div class="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
        <AuthForm client:only="react" />
      </div>
    </div>
  </div>
</Layout>
```

**Step 5: Update landing navbar CTA buttons**

In the landing navbar/header component, update "Prisijungti" and "Išbandyti nemokamai" buttons to link to `/auth`:
- "Prisijungti" → `/auth`
- "Išbandyti nemokamai" → `/auth?tab=signUp`

**Step 6: Verify**

Run: `cd /c/Users/nj/projects/foxdoc/landing && bun run dev`
Navigate to: `http://localhost:3000/auth`
Expected: Login/signup form with Google + email/password.

**Step 7: Commit**

```bash
git add landing/src/
git commit -m "feat(landing): add auth page with Google + email/password login and Free plan auto-init"
```

---

## Phase 4: Backend Auth Validation

### Task 13: Add JWT validation middleware to FastAPI

**Files:**
- Create: `backend/app/middleware/` directory
- Create: `backend/app/middleware/__init__.py`
- Create: `backend/app/middleware/auth.py`

**Step 1: Install python-jose**

```bash
cd /c/Users/nj/projects/foxdoc/backend
uv add "python-jose[cryptography]"
```

**Step 2: Create auth middleware**

```python
# backend/app/middleware/auth.py
# JWT validation for Convex Auth tokens
# Validates Bearer tokens against Convex JWKS endpoint
# Related: main.py, config.py

import httpx
from jose import jwt, JWTError
from fastapi import Request, HTTPException
from app.config import settings

_jwks_cache: dict | None = None


async def get_jwks() -> dict:
    """Fetch and cache JWKS from Convex deployment."""
    global _jwks_cache
    if _jwks_cache is not None:
        return _jwks_cache

    jwks_url = f"{settings.CONVEX_URL}/.well-known/jwks.json"
    async with httpx.AsyncClient() as client:
        response = await client.get(jwks_url)
        response.raise_for_status()
        _jwks_cache = response.json()
        return _jwks_cache


async def get_current_user_id(request: Request) -> str | None:
    """Extract and validate user ID from Bearer token. Returns None if no token."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None

    token = auth_header[7:]

    try:
        jwks = await get_jwks()
        header = jwt.get_unverified_header(token)
        key = next(
            (k for k in jwks.get("keys", []) if k["kid"] == header.get("kid")),
            None,
        )
        if not key:
            return None

        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        return payload.get("sub")
    except JWTError:
        return None


async def require_auth(request: Request) -> str:
    """Require authentication — raises 401 if not authenticated."""
    user_id = await get_current_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Reikalingas prisijungimas")
    return user_id
```

**Step 3: Add CONVEX_URL to backend config**

In `backend/app/config.py`, add:
```python
CONVEX_URL: str = ""
```

**Step 4: Commit**

```bash
git add backend/app/middleware/ backend/pyproject.toml
git commit -m "feat(auth): add JWT validation middleware for Convex tokens"
```

---

## Phase 5: Environment & Testing

### Task 14: Configure environment variables

**Step 1: Get Convex deployment URL**

```bash
cd /c/Users/nj/projects/foxdoc && cat .env.local
```

**Step 2: Set env vars**

`frontend/.env`:
```env
PUBLIC_CONVEX_URL=<your-convex-url>
```

`landing/.env`:
```env
PUBLIC_CONVEX_URL=<your-convex-url>
PUBLIC_APP_URL=http://localhost:4321
```

`backend/.env`:
```env
CONVEX_URL=<your-convex-url>
```

**Step 3: Set Google OAuth in Convex**

```bash
npx convex env set AUTH_GOOGLE_CLIENT_ID=<your-id>
npx convex env set AUTH_GOOGLE_CLIENT_SECRET=<your-secret>
```

---

### Task 15: End-to-end manual test

**Step 1: Start all services**

```bash
# Terminal 1: Convex
npx convex dev

# Terminal 2: Backend
cd backend && uv run uvicorn app.main:app --reload --port 8000

# Terminal 3: Frontend (app)
cd frontend && bun run dev

# Terminal 4: Landing
cd landing && bun run dev
```

**Step 2: Test registration flow**

1. Go to `http://localhost:3000/auth` (landing)
2. Click "Registruotis" tab
3. Enter email + password → submit
4. Verify: redirects to `http://localhost:4321/auth/relay?code=...`
5. Verify: auto-redirects to `http://localhost:4321/` (app)
6. Verify: user name in TopBar
7. Verify: user_credits table has Free plan entry (3 credits)

**Step 3: Test login flow**

1. Click "Atsijungti" in app
2. Go to `http://localhost:3000/auth`
3. Login with same email/password
4. Verify: redirect chain works again

**Step 4: Test Google OAuth**

1. Click "Prisijungti su Google" on landing /auth
2. Complete Google flow
3. Verify: redirect to app works

---

## Dependency Graph

```
Task 0 (merge landing) ──────────────────────────────────┐
                                                          │
Task 1 (Password provider) ──┐                           │
Task 2 (schema tables) ──────┼── Task 3 (relay + credits)│
                              │          │                │
                              │     Task 4 (cron)         │
                              │     Task 5 (users query)  │
                              │                           │
Task 6 (frontend packages) ──┼── Task 7 (auth wrapper) ──┤
                              │          │                │
                              │     Task 8 (relay page)   │
                              │     Task 9 (auth headers) │
                              │     Task 10 (UserMenu)    │
                              │                           │
Task 11 (landing packages) ──┴── Task 12 (auth page) ────┘
                                                          │
Task 13 (backend JWT) ── independent                      │
Task 14 (env vars) ── required before testing ────────────┘
Task 15 (e2e test) ── after everything
```

**Parallel groups:**
- Tasks 1, 2 in parallel
- Tasks 6, 11, 13 in parallel (after 1+2)
- Tasks 8, 9, 10 in parallel (after 7)

---

## User Flow Summary

```
NAUJAS VARTOTOJAS:
foxdoc.io → [Išbandyti nemokamai] → /auth (signUp tab)
→ Google arba Email/Password registracija
→ Auto Free planas (3 kreditai/mėn)
→ Relay code → app.foxdoc.io/auth/relay?code=X
→ Token exchange → localStorage
→ app.foxdoc.io/ (Dashboard)

ESAMAS VARTOTOJAS:
foxdoc.io → [Prisijungti] → /auth (signIn tab)
→ Google arba Email/Password login
→ Relay code → app.foxdoc.io/auth/relay?code=X
→ app.foxdoc.io/ (Dashboard)

ATSIJUNGIMAS:
app.foxdoc.io → TopBar → Atsijungti
→ Convex signOut + clear localStorage
→ Redirect → foxdoc.io
```
