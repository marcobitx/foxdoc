# FoxDoc Auth Architecture — Design Document
**Date:** 2026-02-26
**Status:** Approved
**Scope:** Cross-domain authentication between `foxdoc.io` (landing) and `app.foxdoc.io` (app)

---

## 1. Context

- **Landing page** (`landing/`) — new Astro app at foxdoc.io, marketing site with login/signup
- **App** (`frontend/`) — existing Astro+React app at app.foxdoc.io, the procurement analyzer
- **Both share one Convex deployment** (same database, same auth tables)
- **Current state:** Convex Auth is configured server-side (`convex/auth.ts` with Google OAuth), but the app frontend has NO ConvexAuthProvider and no login UI

---

## 2. Auth Method

**Google OAuth + Email/Password** — user chooses either method on landing page.

- Google OAuth: already configured in `convex/auth.ts`
- Email/Password: add `Password` provider to `convex/auth.ts`

---

## 3. Architecture — One-Time Code Relay

### Problem

`foxdoc.io` and `app.foxdoc.io` are different origins — localStorage is NOT shared between them. Convex Auth stores JWT + refresh token in localStorage. After login on landing, we need to transfer the session to app.

### Solution — One-Time Auth Code Exchange

Passing raw JWT/refresh tokens in URL is dangerous (tokens logged in server access logs, browser history). Instead, use a **one-time authorization code** pattern:

```
LANDING (foxdoc.io)                    APP (app.foxdoc.io)
──────────────────────                 ──────────────────────────
1. User clicks "Registruotis"
2. foxdoc.io/auth → Google or Email
3. Convex Auth → JWT + refreshToken
4. Landing calls Convex HTTP action:
   POST /api/auth/create-relay-code
   (Authorization: Bearer JWT)
   → returns one-time code (60s TTL)
5. Redirect →                          6. /auth/relay?code=ABC123
                                        7. App calls POST /api/auth/exchange-code
                                           → returns JWT + refreshToken
                                        8. Writes to localStorage (Convex format)
                                        9. Redirect → / (ConvexAuthProvider
                                           reads tokens, session active)
```

### Why One-Time Code (Not Raw Tokens in URL)

- Refresh token is long-lived (30 days) — if leaked via logs/history, attacker gets persistent access
- One-time code expires in 60 seconds and is single-use
- Mirrors OAuth authorization code flow — proven pattern

---

## 4. Convex Auth Token Storage Format

Tokens are stored in localStorage with namespaced keys:

| Key | Format |
|-----|--------|
| `__convexAuthJWT_{namespace}` | Raw JWT string |
| `__convexAuthRefreshToken_{namespace}` | Raw refresh token string |

Where `{namespace}` = Convex deployment URL with non-alphanumeric chars stripped.
Example: `https://foo-123.convex.cloud` → `httpsfoo123convexcloud`

### Programmatic Access

- **Read JWT:** `useAuthToken()` hook from `@convex-dev/auth/react`
- **Read refresh token:** `localStorage.getItem("__convexAuthRefreshToken_{namespace}")`
- **Write tokens:** Set both localStorage keys before `ConvexAuthProvider` mounts

---

## 5. New Components

### Convex (server-side)

**`convex/schema.ts`** — add `auth_relay_codes` table:
```typescript
auth_relay_codes: defineTable({
  code: v.string(),          // random 32-char hex
  user_id: v.id("users"),
  session_id: v.string(),    // Convex auth session ID
  jwt: v.string(),           // encrypted JWT
  refresh_token: v.string(), // encrypted refresh token
  expires_at: v.number(),    // epoch ms (creation + 60s)
  used: v.boolean(),         // single-use flag
})
  .index("by_code", ["code"])
  .index("by_expires", ["expires_at"]),
```

**`convex/authRelay.ts`** — two HTTP actions:
- `createRelayCode` — authenticated, creates a one-time code, stores tokens
- `exchangeRelayCode` — public, validates code + expiry + used flag, returns tokens, marks as used

**`convex/auth.ts`** — add Password provider:
```typescript
import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Google, Password],
});
```

### Landing (`landing/`)

| File | Purpose |
|------|---------|
| `src/pages/index.astro` | Landing home with nav CTA buttons |
| `src/pages/auth.astro` | Login/signup page |
| `src/components/AuthForm.tsx` | React island — Google + Email/Password auth form |
| `src/components/AuthProvider.tsx` | ConvexAuthProvider wrapper |
| `src/lib/convex.ts` | ConvexReactClient instance |

**Auth flow in landing:**
1. `AuthForm.tsx` uses `useAuthActions().signIn("google")` or `signIn("password", { email, password })`
2. On success, `useAuthToken()` returns JWT
3. Read refresh token from localStorage
4. Call `createRelayCode` HTTP action → get one-time code
5. `window.location.href = "https://app.foxdoc.io/auth/relay?code=CODE"`

### App (`frontend/`)

| File | Change |
|------|--------|
| `src/components/App.tsx` | Wrap with `ConvexAuthProvider` |
| `src/lib/convex.ts` | NEW — ConvexReactClient instance |
| `src/pages/auth/relay.astro` | NEW — standalone page (no ConvexProvider), reads code from URL, calls exchange endpoint, writes tokens to localStorage, redirects to `/` |
| `src/components/TopBar.tsx` | Show user name + logout button when authenticated |

**Critical:** The `/auth/relay` page must be a standalone page WITHOUT ConvexAuthProvider. It writes tokens to localStorage first, then redirects to `/` where ConvexAuthProvider will find them on mount.

---

## 6. App Changes — Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| ConvexProvider | None | ConvexAuthProvider wraps App |
| Login UI | None | Protected — unauthenticated → redirect to landing auth |
| API calls | No auth headers | FastAPI gets JWT via Bearer header |
| TopBar | No user info | Shows user name + logout |

### FastAPI Auth Integration

Backend will validate Convex JWT on protected endpoints:
- Extract JWT from `Authorization: Bearer {token}` header
- Verify JWT signature against Convex public key (from JWKS endpoint)
- Extract `sub` (user ID) for per-user data access

---

## 7. Security Considerations

- One-time codes expire in 60 seconds and are single-use
- Relay page clears URL immediately via `history.replaceState` after reading code
- Refresh tokens stored only in localStorage (never in URL)
- CORS on Convex HTTP actions restricted to foxdoc.io and app.foxdoc.io origins
- Expired/used relay codes cleaned up by scheduled Convex cron

---

## 8. Email/Password Specifics

- Registration: email + password → Convex creates user + sends verification email
- Login: email + password → Convex validates, returns JWT
- Password reset: "Pamiršote slaptažodį?" → email with reset link
- Email verification: required before first login (Convex Auth built-in)
- All UI text in Lithuanian

---

## 9. Landing Auth Page UI

### `/auth` page layout

```
┌──────────────────────────────────────────┐
│  foxDoc logo          [← Grįžti]         │
├──────────────────────────────────────────┤
│                                          │
│     ┌────────────────────────┐           │
│     │  Prisijungti / Registruotis  │     │
│     │  (tab toggle)                │     │
│     │                              │     │
│     │  [🔵 Prisijungti su Google]  │     │
│     │                              │     │
│     │  ──── arba ────              │     │
│     │                              │     │
│     │  El. paštas: [___________]   │     │
│     │  Slaptažodis: [___________]  │     │
│     │                              │     │
│     │  [Prisijungti]               │     │
│     │                              │     │
│     │  Pamiršote slaptažodį? →     │     │
│     └────────────────────────┘           │
│                                          │
│  Registruodamiesi sutinkate su           │
│  Naudojimo sąlygomis ir Privatumo       │
│  politika.                               │
└──────────────────────────────────────────┘
```

- Dark theme matching landing design system
- Glassmorphism card on gradient background
- Mobile-first responsive
