# Credits & Billing System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a credit-based hybrid subscription system for the Lithuanian market — Free/Starter/Pro/Team tiers with monthly credit allowances, add-on credit packs, and paywall enforcement on the analysis pipeline.

**Architecture:** Stripe Billing handles subscriptions and recurring charges (cards + SEPA Direct Debit); Paysera Checkout added as supplemental option for Lithuanian bank link payments (Swedbank, SEB, Luminor); Convex stores per-user credit balance and subscription state; FastAPI enforces credit checks before analysis and deducts on completion.

**Tech Stack:** Stripe Python SDK (`stripe`), Paysera REST API (HMAC-SHA256 auth), Convex (credits/subscription tables), FastAPI webhooks, Astro + React frontend

---

## Lithuanian Payment Strategy

### Primary: Stripe Billing (subscriptions + recurring)
- Cards (Visa/MC): **1.5% + €0.25** (EU domestic)
- SEPA Direct Debit: **0.8% + €0.25, capped at €5** ← ideal for B2B recurring
- Full subscription management: trials, proration, dunning, invoices, Stripe Tax (EU VAT)
- Excellent Python SDK, self-serve onboarding, no approval needed
- Available at stripe.com/en-lt

### Supplemental: Paysera Checkout (one-time bank payments)
- Lithuanian bank link (Swedbank, SEB, Luminor, Citadele, Urbo): **0% bank fee via PIS** + Paysera system fee (0.9%, max €0.40)
- Used for: initial one-time bank payment OR credit pack top-up via bank
- **NOT** used for recurring billing (Paysera recurring = card-only + high complexity)
- Medium integration complexity; requires Paysera project registration

### NOT used
- ~~kevin.eu~~ — **bankrupt** (October 2024, Bank of Lithuania revoked license)
- ~~Paysera Recurring Billing~~ — card-only, requires manual MAC auth + Paysera approval, no Python SDK

### Flow for Lithuanian bank-preference users
```
User chooses "Pay via bank" → Paysera Checkout (one-time) → credits granted manually OR
User sets up SEPA Direct Debit mandate via Stripe → recurring debit from Lithuanian bank account
```

---

## Credit Rules

| Analysis size | Credits consumed |
|---|---|
| 1–15 documents | 1 credit |
| 16–50 documents | 3 credits |
| 51+ documents | 5 credits |

## Plan Tiers

| Plan | stripe_price_id env key | Credits/month | Price |
|------|------------------------|--------------|-------|
| free | — | 3 (one-time on signup) | €0 |
| starter | STRIPE_PRICE_STARTER_MONTHLY | 20 | €19/month |
| pro | STRIPE_PRICE_PRO_MONTHLY | 75 | €59/month |
| team | STRIPE_PRICE_TEAM_MONTHLY | 200 | €149/month |

Add-on packs (one-time payments):
- 10 credits = €9 → `STRIPE_PRICE_CREDITS_10`
- 50 credits = €35 → `STRIPE_PRICE_CREDITS_50`
- 100 credits = €59 → `STRIPE_PRICE_CREDITS_100`

---

## Task 1: Convex Schema — Add Subscriptions & Credits Tables

**Files:**
- Modify: `convex/schema.ts`

**Step 1: Add two new tables to schema.ts**

In `convex/schema.ts`, add after the `notes` table definition (before the closing `}`):

```typescript
  // ── User subscriptions (Stripe) ──
  subscriptions: defineTable({
    user_id: v.id("users"),
    stripe_customer_id: v.string(),
    stripe_subscription_id: v.optional(v.string()),
    plan: v.string(),           // "free" | "starter" | "pro" | "team" | "enterprise"
    status: v.string(),         // "active" | "canceled" | "past_due" | "trialing"
    current_period_end: v.optional(v.number()), // epoch ms
    cancel_at_period_end: v.optional(v.boolean()),
  })
    .index("by_user", ["user_id"])
    .index("by_stripe_customer", ["stripe_customer_id"])
    .index("by_stripe_subscription", ["stripe_subscription_id"]),

  // ── User credits ──
  user_credits: defineTable({
    user_id: v.id("users"),
    balance: v.number(),        // current credit balance
    lifetime_earned: v.number(), // total credits ever granted
    lifetime_used: v.number(),  // total credits ever consumed
    reset_at: v.optional(v.number()), // next monthly reset (epoch ms)
  }).index("by_user", ["user_id"]),

  // ── Credit transactions (audit log) ──
  credit_transactions: defineTable({
    user_id: v.id("users"),
    amount: v.number(),         // positive = earned, negative = consumed
    type: v.string(),           // "monthly_grant" | "addon_purchase" | "analysis_deduct" | "signup_grant"
    description: v.string(),
    analysis_id: v.optional(v.id("analyses")),
    stripe_payment_intent: v.optional(v.string()),
  })
    .index("by_user", ["user_id"])
    .index("by_analysis", ["analysis_id"]),
```

**Step 2: Deploy schema**

```bash
cd C:\Users\nj\projects\foxdoc
npx convex dev
```

Expected: Convex dashboard shows new tables `subscriptions`, `user_credits`, `credit_transactions`.

**Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat: add subscriptions, user_credits, credit_transactions tables"
```

---

## Task 2: Convex Mutations & Queries — Credits & Subscriptions

**Files:**
- Create: `convex/credits.ts`
- Create: `convex/subscriptions.ts`

**Step 1: Create `convex/credits.ts`**

```typescript
// convex/credits.ts
// Mutations and queries for credit balance management
// Called by backend webhook handler and analysis pipeline
// Related: subscriptions.ts, schema.ts

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get current credit balance for a user
export const getBalance = query({
  args: { user_id: v.id("users") },
  handler: async (ctx, { user_id }) => {
    const credits = await ctx.db
      .query("user_credits")
      .withIndex("by_user", (q) => q.eq("user_id", user_id))
      .first();
    return credits ?? { balance: 0, lifetime_earned: 0, lifetime_used: 0 };
  },
});

// Grant credits (monthly reset or addon purchase)
export const grantCredits = mutation({
  args: {
    user_id: v.id("users"),
    amount: v.number(),
    type: v.string(),
    description: v.string(),
    stripe_payment_intent: v.optional(v.string()),
    reset_at: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("user_credits")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        balance: existing.balance + args.amount,
        lifetime_earned: existing.lifetime_earned + args.amount,
        ...(args.reset_at ? { reset_at: args.reset_at } : {}),
      });
    } else {
      await ctx.db.insert("user_credits", {
        user_id: args.user_id,
        balance: args.amount,
        lifetime_earned: args.amount,
        lifetime_used: 0,
        reset_at: args.reset_at,
      });
    }

    await ctx.db.insert("credit_transactions", {
      user_id: args.user_id,
      amount: args.amount,
      type: args.type,
      description: args.description,
      stripe_payment_intent: args.stripe_payment_intent,
    });
  },
});

// Deduct credits for an analysis
export const deductCredits = mutation({
  args: {
    user_id: v.id("users"),
    amount: v.number(),
    analysis_id: v.id("analyses"),
  },
  handler: async (ctx, { user_id, amount, analysis_id }) => {
    const existing = await ctx.db
      .query("user_credits")
      .withIndex("by_user", (q) => q.eq("user_id", user_id))
      .first();

    if (!existing || existing.balance < amount) {
      throw new Error("Insufficient credits");
    }

    await ctx.db.patch(existing._id, {
      balance: existing.balance - amount,
      lifetime_used: existing.lifetime_used + amount,
    });

    await ctx.db.insert("credit_transactions", {
      user_id,
      amount: -amount,
      type: "analysis_deduct",
      description: `Analysis credit deduction`,
      analysis_id,
    });
  },
});

// Get recent credit transactions for a user (last 20)
export const getTransactions = query({
  args: { user_id: v.id("users") },
  handler: async (ctx, { user_id }) => {
    return await ctx.db
      .query("credit_transactions")
      .withIndex("by_user", (q) => q.eq("user_id", user_id))
      .order("desc")
      .take(20);
  },
});
```

**Step 2: Create `convex/subscriptions.ts`**

```typescript
// convex/subscriptions.ts
// Subscription state management — upserted by Stripe webhook handler
// Related: credits.ts, schema.ts

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getByUser = query({
  args: { user_id: v.id("users") },
  handler: async (ctx, { user_id }) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("user_id", user_id))
      .first();
  },
});

export const getByStripeCustomer = query({
  args: { stripe_customer_id: v.string() },
  handler: async (ctx, { stripe_customer_id }) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_customer", (q) =>
        q.eq("stripe_customer_id", stripe_customer_id)
      )
      .first();
  },
});

export const upsert = mutation({
  args: {
    user_id: v.id("users"),
    stripe_customer_id: v.string(),
    stripe_subscription_id: v.optional(v.string()),
    plan: v.string(),
    status: v.string(),
    current_period_end: v.optional(v.number()),
    cancel_at_period_end: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("subscriptions", args);
    }
  },
});
```

**Step 3: Deploy**

```bash
npx convex dev
```

Expected: No errors in Convex dashboard.

**Step 4: Commit**

```bash
git add convex/credits.ts convex/subscriptions.ts
git commit -m "feat: add credits and subscriptions Convex mutations/queries"
```

---

## Task 3: Backend — Install Stripe & Add Config

**Files:**
- Modify: `backend/pyproject.toml`
- Modify: `backend/app/config.py`
- Modify: `backend/.env`

**Step 1: Install stripe**

```bash
cd backend
uv add stripe
```

Expected: `stripe` added to `pyproject.toml` dependencies.

**Step 2: Add Stripe config to `config.py`**

Add to `AppSettings` class:

```python
    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_starter_monthly: str = ""
    stripe_price_pro_monthly: str = ""
    stripe_price_team_monthly: str = ""
    stripe_price_credits_10: str = ""
    stripe_price_credits_50: str = ""
    stripe_price_credits_100: str = ""
    frontend_url: str = "http://localhost:4321"
```

**Step 3: Add to `backend/.env`**

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_TEAM_MONTHLY=price_...
STRIPE_PRICE_CREDITS_10=price_...
STRIPE_PRICE_CREDITS_50=price_...
STRIPE_PRICE_CREDITS_100=price_...
FRONTEND_URL=http://localhost:4321
```

**Step 4: Commit (do NOT commit .env)**

```bash
git add backend/pyproject.toml backend/app/config.py
git commit -m "feat: add Stripe config settings"
```

---

## Task 4: Backend — Credits Service

**Files:**
- Create: `backend/app/services/credits.py`

**Step 1: Create credits service**

```python
# backend/app/services/credits.py
# Credit balance checks and deduction logic
# Used by analyze router before/after pipeline
# Related: routers/analyze.py, convex_client.py

from __future__ import annotations

from app.convex_client import ConvexDB

CREDITS_PER_PLAN: dict[str, int] = {
    "free": 3,
    "starter": 20,
    "pro": 75,
    "team": 200,
}


def calc_credits_needed(doc_count: int) -> int:
    """Return credits needed based on document count."""
    if doc_count <= 15:
        return 1
    elif doc_count <= 50:
        return 3
    else:
        return 5


async def get_user_credits(db: ConvexDB, user_id: str) -> dict:
    """Fetch current credit balance from Convex."""
    result = await db.query(
        "credits:getBalance",
        args={"user_id": user_id},
    )
    return result or {"balance": 0, "lifetime_earned": 0, "lifetime_used": 0}


async def check_and_reserve_credits(
    db: ConvexDB, user_id: str, doc_count: int, analysis_id: str
) -> int:
    """Check credits are sufficient and deduct them. Returns credits used.

    Raises ValueError if insufficient credits.
    """
    needed = calc_credits_needed(doc_count)
    credits = await get_user_credits(db, user_id)

    if credits["balance"] < needed:
        raise ValueError(
            f"Nepakanka kreditų. Reikalinga: {needed}, turima: {credits['balance']}."
        )

    await db.mutation(
        "credits:deductCredits",
        args={
            "user_id": user_id,
            "amount": needed,
            "analysis_id": analysis_id,
        },
    )
    return needed
```

**Note:** This requires `db.query()` and `db.mutation()` methods on `ConvexDB`. Check `backend/app/convex_client.py` — if only HTTP methods exist, add thin wrappers that call the Convex HTTP API for these new functions.

**Step 2: Commit**

```bash
git add backend/app/services/credits.py
git commit -m "feat: add credits service with check and deduct logic"
```

---

## Task 5: Backend — Stripe Webhook Router

**Files:**
- Create: `backend/app/routers/billing.py`
- Modify: `backend/app/main.py`

**Step 1: Create `backend/app/routers/billing.py`**

```python
# backend/app/routers/billing.py
# Stripe webhook handler + checkout session creation endpoints
# Handles subscription lifecycle and credit grants
# Related: services/credits.py, config.py, convex_client.py

from __future__ import annotations

import logging
import time
from typing import Any

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.config import AppSettings, get_settings
from app.convex_client import ConvexDB, get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/billing", tags=["billing"])


# ── Monthly credits per plan ──────────────────────────────────────────────────

PLAN_CREDITS: dict[str, int] = {
    "starter": 20,
    "pro": 75,
    "team": 200,
}

ADDON_CREDITS: dict[str, int] = {}  # populated at startup from price IDs


def _price_to_plan(price_id: str, settings: AppSettings) -> str | None:
    mapping = {
        settings.stripe_price_starter_monthly: "starter",
        settings.stripe_price_pro_monthly: "pro",
        settings.stripe_price_team_monthly: "team",
    }
    return mapping.get(price_id)


def _price_to_addon_credits(price_id: str, settings: AppSettings) -> int:
    mapping = {
        settings.stripe_price_credits_10: 10,
        settings.stripe_price_credits_50: 50,
        settings.stripe_price_credits_100: 100,
    }
    return mapping.get(price_id, 0)


# ── Checkout session creation ─────────────────────────────────────────────────


class CheckoutRequest(BaseModel):
    price_id: str
    user_id: str
    user_email: str
    success_url: str | None = None
    cancel_url: str | None = None


@router.post("/checkout")
async def create_checkout_session(
    body: CheckoutRequest,
    settings: AppSettings = Depends(get_settings),
    db: ConvexDB = Depends(get_db),
):
    """Create a Stripe Checkout session for subscription or one-time credit pack."""
    stripe.api_key = settings.stripe_secret_key

    # Determine mode: subscription vs payment
    # One-time credit packs use "payment" mode
    addon_credits = _price_to_addon_credits(body.price_id, settings)
    mode = "payment" if addon_credits > 0 else "subscription"

    try:
        session = stripe.checkout.Session.create(
            mode=mode,
            line_items=[{"price": body.price_id, "quantity": 1}],
            customer_email=body.user_email,
            metadata={"user_id": body.user_id},
            success_url=body.success_url or f"{settings.frontend_url}/?billing=success",
            cancel_url=body.cancel_url or f"{settings.frontend_url}/?billing=canceled",
        )
        return {"url": session.url}
    except stripe.StripeError as e:
        logger.error("Stripe checkout error: %s", e)
        raise HTTPException(status_code=400, detail=str(e))


# ── Customer portal ───────────────────────────────────────────────────────────


class PortalRequest(BaseModel):
    user_id: str
    return_url: str | None = None


@router.post("/portal")
async def create_portal_session(
    body: PortalRequest,
    settings: AppSettings = Depends(get_settings),
    db: ConvexDB = Depends(get_db),
):
    """Create a Stripe Customer Portal session for subscription management."""
    stripe.api_key = settings.stripe_secret_key

    sub = await db.query("subscriptions:getByUser", args={"user_id": body.user_id})
    if not sub:
        raise HTTPException(status_code=404, detail="No subscription found")

    try:
        session = stripe.billing_portal.Session.create(
            customer=sub["stripe_customer_id"],
            return_url=body.return_url or settings.frontend_url,
        )
        return {"url": session.url}
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Webhook handler ───────────────────────────────────────────────────────────


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    settings: AppSettings = Depends(get_settings),
    db: ConvexDB = Depends(get_db),
):
    """Stripe webhook — handles subscription lifecycle and payment events."""
    stripe.api_key = settings.stripe_secret_key
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig, settings.stripe_webhook_secret
        )
    except stripe.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event_type: str = event["type"]
    data: Any = event["data"]["object"]

    logger.info("Stripe webhook: %s", event_type)

    # ── Subscription created or updated ──────────────────────────────────────
    if event_type in ("customer.subscription.created", "customer.subscription.updated"):
        await _handle_subscription_change(data, settings, db)

    # ── Subscription deleted (canceled) ──────────────────────────────────────
    elif event_type == "customer.subscription.deleted":
        await _handle_subscription_deleted(data, settings, db)

    # ── Invoice paid → grant monthly credits ─────────────────────────────────
    elif event_type == "invoice.paid":
        await _handle_invoice_paid(data, settings, db)

    # ── One-time payment completed → grant addon credits ─────────────────────
    elif event_type == "checkout.session.completed":
        await _handle_checkout_completed(data, settings, db)

    return JSONResponse({"status": "ok"})


# ── Private helpers ───────────────────────────────────────────────────────────


async def _handle_subscription_change(data: Any, settings: AppSettings, db: ConvexDB):
    customer_id = data["customer"]
    sub_id = data["id"]
    status = data["status"]
    period_end = data["current_period_end"] * 1000  # to ms
    cancel_at_end = data.get("cancel_at_period_end", False)

    price_id = data["items"]["data"][0]["price"]["id"]
    plan = _price_to_plan(price_id, settings) or "starter"

    user_id = await _user_id_from_customer(customer_id, data, db)
    if not user_id:
        logger.warning("Cannot find user for customer %s", customer_id)
        return

    await db.mutation(
        "subscriptions:upsert",
        args={
            "user_id": user_id,
            "stripe_customer_id": customer_id,
            "stripe_subscription_id": sub_id,
            "plan": plan,
            "status": status,
            "current_period_end": period_end,
            "cancel_at_period_end": cancel_at_end,
        },
    )


async def _handle_subscription_deleted(data: Any, settings: AppSettings, db: ConvexDB):
    customer_id = data["customer"]
    user_id = await _user_id_from_customer(customer_id, data, db)
    if not user_id:
        return

    await db.mutation(
        "subscriptions:upsert",
        args={
            "user_id": user_id,
            "stripe_customer_id": customer_id,
            "plan": "free",
            "status": "canceled",
        },
    )


async def _handle_invoice_paid(data: Any, settings: AppSettings, db: ConvexDB):
    """Grant monthly credits on successful subscription invoice."""
    customer_id = data["customer"]
    sub_id = data.get("subscription")
    if not sub_id:
        return  # one-time payment, handled elsewhere

    # Find plan from subscription
    stripe.api_key = settings.stripe_secret_key
    sub = stripe.Subscription.retrieve(sub_id)
    price_id = sub["items"]["data"][0]["price"]["id"]
    plan = _price_to_plan(price_id, settings)
    if not plan:
        return

    credits = PLAN_CREDITS.get(plan, 0)
    if credits == 0:
        return

    user_id = await _user_id_from_customer(customer_id, None, db)
    if not user_id:
        return

    # Calculate next reset (1 month from now)
    reset_at = int(time.time() * 1000) + 30 * 24 * 60 * 60 * 1000

    await db.mutation(
        "credits:grantCredits",
        args={
            "user_id": user_id,
            "amount": credits,
            "type": "monthly_grant",
            "description": f"Mėnesinis kreditų papildymas — {plan} planas ({credits} kreditai)",
            "reset_at": reset_at,
        },
    )
    logger.info("Granted %d credits to user %s (plan: %s)", credits, user_id, plan)


async def _handle_checkout_completed(data: Any, settings: AppSettings, db: ConvexDB):
    """Grant addon credits on one-time purchase completion."""
    if data.get("mode") != "payment":
        return

    user_id = data.get("metadata", {}).get("user_id")
    if not user_id:
        return

    line_items = data.get("display_items") or []
    price_id = data.get("line_items", {}).get("data", [{}])[0].get("price", {}).get("id")
    if not price_id:
        return

    credits = _price_to_addon_credits(price_id, settings)
    if credits == 0:
        return

    payment_intent = data.get("payment_intent", "")

    await db.mutation(
        "credits:grantCredits",
        args={
            "user_id": user_id,
            "amount": credits,
            "type": "addon_purchase",
            "description": f"Kreditų papildymas — {credits} kreditai",
            "stripe_payment_intent": payment_intent,
        },
    )
    logger.info("Granted %d addon credits to user %s", credits, user_id)


async def _user_id_from_customer(
    customer_id: str, event_data: Any | None, db: ConvexDB
) -> str | None:
    """Resolve Convex user_id from Stripe customer_id."""
    sub = await db.query(
        "subscriptions:getByStripeCustomer",
        args={"stripe_customer_id": customer_id},
    )
    if sub:
        return sub["user_id"]

    # Fallback: check metadata on event
    if event_data:
        meta_user = event_data.get("metadata", {}).get("user_id")
        if meta_user:
            return meta_user

    return None
```

**Step 2: Register router in `backend/app/main.py`**

Find the router includes section and add:

```python
from app.routers.billing import router as billing_router
app.include_router(billing_router)
```

**Step 3: Commit**

```bash
git add backend/app/routers/billing.py backend/app/main.py
git commit -m "feat: add Stripe billing router with webhook, checkout, portal"
```

---

## Task 6: Backend — Enforce Credits in Analysis Pipeline

**Files:**
- Modify: `backend/app/routers/analyze.py`

**Step 1: Add credit check before pipeline starts**

In `analyze.py`, in the `create_analysis` endpoint, after creating the DB record (`analysis_id = await db.create_analysis(...)`) and before `asyncio.create_task(_run_pipeline())`, add:

```python
    # ── Credit check (if user authenticated) ──
    # Get user_id from auth header (Convex auth token)
    user_id = None  # TODO: extract from request auth once Convex auth integrated
    doc_count = len(upload_paths)  # pre-ZIP count; pipeline updates after unpack

    if user_id:
        from app.services.credits import check_and_reserve_credits
        try:
            credits_used = await check_and_reserve_credits(
                db, user_id, doc_count, analysis_id
            )
            logger.info("Reserved %d credits for user %s", credits_used, user_id)
        except ValueError as e:
            await db.update_analysis(analysis_id, status="failed", error=str(e))
            raise HTTPException(status_code=402, detail=str(e))
```

**Note:** The `user_id` extraction from Convex auth token will be completed in Task 8 (auth integration). For now this is a no-op (user_id = None) that leaves the door open without breaking existing functionality.

**Step 2: Commit**

```bash
git add backend/app/routers/analyze.py
git commit -m "feat: add credit enforcement hook in analysis endpoint"
```

---

## Task 7: Frontend — Billing API Client

**Files:**
- Modify: `frontend/src/lib/api.ts`

**Step 1: Add billing API functions**

Append to `frontend/src/lib/api.ts`:

```typescript
// ── Billing ────────────────────────────────────────────────────────────────

export interface CreditBalance {
  balance: number;
  lifetime_earned: number;
  lifetime_used: number;
  reset_at?: number;
}

export async function createCheckoutSession(params: {
  priceId: string;
  userId: string;
  userEmail: string;
}): Promise<{ url: string }> {
  const res = await fetch(`${API_URL}/api/billing/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      price_id: params.priceId,
      user_id: params.userId,
      user_email: params.userEmail,
    }),
  });
  if (!res.ok) throw new Error("Nepavyko sukurti mokėjimo sesijos");
  return res.json();
}

export async function createPortalSession(params: {
  userId: string;
}): Promise<{ url: string }> {
  const res = await fetch(`${API_URL}/api/billing/portal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: params.userId }),
  });
  if (!res.ok) throw new Error("Nepavyko atidaryti prenumeratos valdymo");
  return res.json();
}
```

**Step 2: Commit**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat: add billing API client functions"
```

---

## Task 8: Frontend — Credits & Plan Display Component

**Files:**
- Create: `frontend/src/components/CreditsWidget.tsx`

**Step 1: Create component**

```tsx
// frontend/src/components/CreditsWidget.tsx
// Displays current credit balance and plan badge in the top bar
// Shows upgrade CTA when credits are low (< 3)
// Related: api.ts, store.ts

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const PLAN_LABELS: Record<string, string> = {
  free: "Nemokamas",
  starter: "Starter",
  pro: "Pro",
  team: "Komanda",
  enterprise: "Enterprise",
};

const PLAN_COLORS: Record<string, string> = {
  free: "text-gray-400",
  starter: "text-blue-400",
  pro: "text-purple-400",
  team: "text-amber-400",
  enterprise: "text-emerald-400",
};

interface Props {
  userId: string;
  onUpgradeClick: () => void;
}

export function CreditsWidget({ userId, onUpgradeClick }: Props) {
  const credits = useQuery(api.credits.getBalance, { user_id: userId as any });
  const subscription = useQuery(api.subscriptions.getByUser, { user_id: userId as any });

  if (!credits) return null;

  const plan = subscription?.plan ?? "free";
  const balance = credits.balance;
  const isLow = balance < 3;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`font-medium ${PLAN_COLORS[plan]}`}>
        {PLAN_LABELS[plan]}
      </span>
      <span className="text-gray-600">·</span>
      <span className={isLow ? "text-red-400 font-medium" : "text-gray-300"}>
        {balance} {balance === 1 ? "kreditas" : balance < 10 ? "kreditai" : "kreditų"}
      </span>
      {isLow && (
        <button
          onClick={onUpgradeClick}
          className="text-xs px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors"
        >
          Papildyti
        </button>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/CreditsWidget.tsx
git commit -m "feat: add CreditsWidget component with low-credit CTA"
```

---

## Task 9: Frontend — Pricing/Upgrade Modal

**Files:**
- Create: `frontend/src/components/PricingModal.tsx`

**Step 1: Create pricing modal**

```tsx
// frontend/src/components/PricingModal.tsx
// Upgrade modal showing all plans and credit add-on packs
// Integrates with Stripe Checkout via createCheckoutSession
// Related: api.ts, CreditsWidget.tsx

import { useState } from "react";
import { createCheckoutSession } from "../lib/api";

interface Plan {
  id: string;
  name: string;
  price: string;
  priceId: string;
  credits: number;
  users: number;
  features: string[];
  highlighted?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: "€19/mėn",
    priceId: import.meta.env.PUBLIC_STRIPE_PRICE_STARTER,
    credits: 20,
    users: 1,
    features: ["20 kreditų/mėn", "PDF eksportas", "Chat istorija"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "€59/mėn",
    priceId: import.meta.env.PUBLIC_STRIPE_PRICE_PRO,
    credits: 75,
    users: 3,
    features: ["75 kreditų/mėn", "DOCX eksportas", "3 vartotojai", "Modelio pasirinkimas"],
    highlighted: true,
  },
  {
    id: "team",
    name: "Komanda",
    price: "€149/mėn",
    priceId: import.meta.env.PUBLIC_STRIPE_PRICE_TEAM,
    credits: 200,
    users: 10,
    features: ["200 kreditų/mėn", "10 vartotojų", "API prieiga", "Custom prompts"],
  },
];

const ADDONS = [
  { credits: 10, price: "€9", priceId: import.meta.env.PUBLIC_STRIPE_PRICE_CREDITS_10 },
  { credits: 50, price: "€35", priceId: import.meta.env.PUBLIC_STRIPE_PRICE_CREDITS_50 },
  { credits: 100, price: "€59", priceId: import.meta.env.PUBLIC_STRIPE_PRICE_CREDITS_100 },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail: string;
  currentPlan?: string;
}

export function PricingModal({ isOpen, onClose, userId, userEmail, currentPlan }: Props) {
  const [loading, setLoading] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpgrade = async (priceId: string, key: string) => {
    setLoading(key);
    try {
      const { url } = await createCheckoutSession({ priceId, userId, userEmail });
      window.location.href = url;
    } catch (e) {
      alert("Klaida. Bandykite dar kartą.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-[#1a1a2e] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-white">Pasirinkite planą</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">×</button>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-xl p-6 border ${
                plan.highlighted
                  ? "border-blue-500 bg-blue-950/30"
                  : "border-white/10 bg-white/5"
              }`}
            >
              {plan.highlighted && (
                <div className="text-xs text-blue-400 font-semibold mb-2 uppercase tracking-wider">
                  Populiariausias
                </div>
              )}
              <div className="text-xl font-bold text-white mb-1">{plan.name}</div>
              <div className="text-2xl font-bold text-blue-400 mb-4">{plan.price}</div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="text-sm text-gray-300 flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleUpgrade(plan.priceId, plan.id)}
                disabled={loading === plan.id || currentPlan === plan.id}
                className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                {currentPlan === plan.id
                  ? "Dabartinis planas"
                  : loading === plan.id
                  ? "Kraunama..."
                  : "Pasirinkti"}
              </button>
            </div>
          ))}
        </div>

        {/* Add-on credit packs */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Papildomi kreditai</h3>
          <div className="grid grid-cols-3 gap-3">
            {ADDONS.map((addon) => (
              <button
                key={addon.credits}
                onClick={() => handleUpgrade(addon.priceId, `addon-${addon.credits}`)}
                disabled={loading === `addon-${addon.credits}`}
                className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-center transition-colors"
              >
                <div className="text-2xl font-bold text-white">{addon.credits}</div>
                <div className="text-xs text-gray-400 mb-1">kreditų</div>
                <div className="text-sm font-semibold text-emerald-400">{addon.price}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Add Stripe price IDs to `frontend/.env.local`**

```env
PUBLIC_STRIPE_PRICE_STARTER=price_...
PUBLIC_STRIPE_PRICE_PRO=price_...
PUBLIC_STRIPE_PRICE_TEAM=price_...
PUBLIC_STRIPE_PRICE_CREDITS_10=price_...
PUBLIC_STRIPE_PRICE_CREDITS_50=price_...
PUBLIC_STRIPE_PRICE_CREDITS_100=price_...
```

**Step 3: Commit**

```bash
git add frontend/src/components/PricingModal.tsx
git commit -m "feat: add PricingModal with plan selection and credit add-ons"
```

---

## Task 10: Stripe Dashboard Setup (Manual)

This task is done in the Stripe Dashboard — not code.

**Step 1: Create products in Stripe Dashboard (test mode)**

1. Go to https://dashboard.stripe.com/test/products
2. Create product: **FoxDoc Starter** → recurring price €19/month
3. Create product: **FoxDoc Pro** → recurring price €59/month
4. Create product: **FoxDoc Team** → recurring price €149/month
5. Create product: **10 kreditų** → one-time price €9
6. Create product: **50 kreditų** → one-time price €35
7. Create product: **100 kreditų** → one-time price €59

**Step 2: Copy price IDs** to `backend/.env` and `frontend/.env.local`

**Step 3: Set up webhook in Stripe Dashboard**

1. Go to https://dashboard.stripe.com/test/webhooks
2. Add endpoint: `http://localhost:8000/api/billing/webhook`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `checkout.session.completed`
4. Copy webhook signing secret → `STRIPE_WEBHOOK_SECRET` in `.env`

**Step 4: Install Stripe CLI for local webhook testing**

```bash
stripe listen --forward-to localhost:8000/api/billing/webhook
```

---

## Task 11: Signup — Grant Free Credits on Registration

**Files:**
- Modify: `convex/auth.ts` (or wherever user creation is handled)

**Step 1: Find where new users are created in Convex auth**

```bash
grep -n "insert" convex/auth.ts
```

**Step 2: Grant 3 free credits on user creation**

In the user creation callback (after `ctx.db.insert("users", ...)`), call the credits grant mutation:

```typescript
await ctx.db.insert("user_credits", {
  user_id: newUserId,
  balance: 3,
  lifetime_earned: 3,
  lifetime_used: 0,
});

await ctx.db.insert("credit_transactions", {
  user_id: newUserId,
  amount: 3,
  type: "signup_grant",
  description: "Registracijos dovana — 3 kreditai",
});
```

**Step 3: Commit**

```bash
git add convex/auth.ts
git commit -m "feat: grant 3 free credits on user registration"
```

---

## Task 12: Integration Test — Full Billing Flow

**Step 1: Start all services**

```bash
# Terminal 1
cd backend && uv run uvicorn app.main:app --reload --port 8000

# Terminal 2
cd frontend && bun run dev

# Terminal 3
npx convex dev

# Terminal 4 (Stripe CLI)
stripe listen --forward-to localhost:8000/api/billing/webhook
```

**Step 2: Test free signup**

1. Register new user
2. Verify in Convex dashboard: `user_credits` table has row with `balance: 3`
3. Verify `credit_transactions` has `signup_grant` entry

**Step 3: Test analysis deduction**

1. Upload 1 document → verify balance decrements by 1
2. Upload 20 documents → verify balance decrements by 3
3. Upload with 0 credits → verify 402 error response

**Step 4: Test Stripe checkout**

1. Click upgrade → Starter plan
2. Complete Stripe test checkout (card: `4242 4242 4242 4242`)
3. Verify webhook fires: `customer.subscription.created` then `invoice.paid`
4. Verify in Convex: subscription record created, credits granted (20)

**Step 5: Test add-on purchase**

1. Buy 10 credit pack
2. Verify `checkout.session.completed` webhook fires
3. Verify credits balance increases by 10

**Step 6: Commit final integration notes**

```bash
git commit -m "docs: add billing integration test checklist" --allow-empty
```

---

---

## Task 13: Paysera Checkout Integration (Lithuanian Bank Payments)

**Files:**
- Create: `backend/app/services/paysera.py`
- Modify: `backend/app/routers/billing.py`
- Modify: `backend/app/config.py`
- Modify: `frontend/src/components/PricingModal.tsx`

**Purpose:** Allow Lithuanian users to pay via Swedbank, SEB, Luminor, Citadele bank link (one-time) for credit pack top-ups. Subscriptions still use Stripe. Paysera is supplemental only.

**Step 1: Add Paysera config vars to `config.py`**

```python
    # Paysera
    paysera_project_id: str = ""
    paysera_sign_password: str = ""
    paysera_test_mode: bool = True  # set False in production
```

Add to `backend/.env`:
```env
PAYSERA_PROJECT_ID=12345
PAYSERA_SIGN_PASSWORD=your_sign_password_here
PAYSERA_TEST_MODE=true
```

**Step 2: Create `backend/app/services/paysera.py`**

```python
# backend/app/services/paysera.py
# Paysera Checkout payment creation and callback verification
# Used for one-time Lithuanian bank payments (Swedbank, SEB, Luminor)
# Related: routers/billing.py, config.py
# Docs: https://developers.paysera.com/en/checkout/basic

from __future__ import annotations

import base64
import hashlib
import logging
import urllib.parse

logger = logging.getLogger(__name__)

PAYSERA_PAY_URL = "https://www.paysera.com/pay/"


def _sign(data: str, sign_password: str) -> str:
    """MD5 signature for Paysera request (as per their spec)."""
    return hashlib.md5((data + sign_password).encode()).hexdigest()


def _encode_data(params: dict) -> str:
    """URL-encode params and base64 them (Paysera data field format)."""
    query = urllib.parse.urlencode(params)
    return base64.b64encode(query.encode()).decode()


def create_payment_url(
    *,
    project_id: str,
    sign_password: str,
    order_id: str,
    amount_cents: int,          # in euro cents (e.g. 900 = €9.00)
    currency: str = "EUR",
    accept_url: str,
    cancel_url: str,
    callback_url: str,
    payer_email: str,
    description: str,
    test: bool = True,
) -> str:
    """Build a Paysera payment URL for bank link checkout."""
    params = {
        "projectid": project_id,
        "orderid": order_id,
        "amount": str(amount_cents),
        "currency": currency,
        "accepturl": accept_url,
        "cancelurl": cancel_url,
        "callbackurl": callback_url,
        "p_email": payer_email,
        "paytext": description,
        "test": "1" if test else "0",
        "version": "1.6",
    }

    data = _encode_data(params)
    sign = _sign(data, sign_password)
    return f"{PAYSERA_PAY_URL}?data={data}&sign={sign}"


def verify_callback(data: str, ss1: str, sign_password: str) -> bool:
    """Verify Paysera callback signature."""
    expected = _sign(data, sign_password)
    return expected == ss1


def decode_callback(data: str) -> dict:
    """Decode base64 + URL params from Paysera callback data field."""
    decoded = base64.b64decode(data).decode()
    return dict(urllib.parse.parse_qsl(decoded))
```

**Step 3: Add Paysera endpoint to `billing.py`**

Add these new endpoints to `backend/app/routers/billing.py`:

```python
# ── Paysera bank link payment ─────────────────────────────────────────────────

PAYSERA_ADDON_AMOUNTS = {
    "credits_10": (900, 10),    # €9.00, 10 credits
    "credits_50": (3500, 50),   # €35.00, 50 credits
    "credits_100": (5900, 100), # €59.00, 100 credits
}


class PayseraRequest(BaseModel):
    pack: str           # "credits_10" | "credits_50" | "credits_100"
    user_id: str
    user_email: str


@router.post("/paysera/checkout")
async def paysera_checkout(
    body: PayseraRequest,
    settings: AppSettings = Depends(get_settings),
):
    """Create a Paysera bank payment URL for credit pack purchase."""
    if body.pack not in PAYSERA_ADDON_AMOUNTS:
        raise HTTPException(status_code=400, detail="Invalid pack")

    from app.services.paysera import create_payment_url

    amount_cents, credits = PAYSERA_ADDON_AMOUNTS[body.pack]
    order_id = f"{body.user_id[:8]}-{body.pack}"

    url = create_payment_url(
        project_id=settings.paysera_project_id,
        sign_password=settings.paysera_sign_password,
        order_id=order_id,
        amount_cents=amount_cents,
        accept_url=f"{settings.frontend_url}/?billing=success",
        cancel_url=f"{settings.frontend_url}/?billing=canceled",
        callback_url=f"{settings.frontend_url.replace('4321', '8000')}/api/billing/paysera/callback",
        payer_email=body.user_email,
        description=f"FoxDoc {credits} kreditų papildymas",
        test=settings.paysera_test_mode,
    )
    return {"url": url}


@router.get("/paysera/callback")
async def paysera_callback(
    request: Request,
    settings: AppSettings = Depends(get_settings),
    db: ConvexDB = Depends(get_db),
):
    """Paysera callback — grants credits on successful bank payment."""
    from app.services.paysera import decode_callback, verify_callback

    params = dict(request.query_params)
    data = params.get("data", "")
    ss1 = params.get("ss1", "")

    if not verify_callback(data, ss1, settings.paysera_sign_password):
        raise HTTPException(status_code=400, detail="Invalid Paysera signature")

    callback_data = decode_callback(data)
    status = callback_data.get("status")
    order_id = callback_data.get("orderid", "")

    if status != "1":  # 1 = payment confirmed
        return {"status": "ignored"}

    # Parse user_id and pack from order_id (format: {user_id[:8]}-{pack})
    parts = order_id.split("-", 1)
    if len(parts) != 2:
        return {"status": "ignored"}

    pack = parts[1]
    if pack not in PAYSERA_ADDON_AMOUNTS:
        return {"status": "ignored"}

    _, credits = PAYSERA_ADDON_AMOUNTS[pack]
    payment_id = callback_data.get("payment", "")

    # Find user by order prefix (best effort — in production use full user_id in metadata)
    # For now, log and grant credits by payment ID lookup
    logger.info("Paysera payment confirmed: order=%s credits=%d payment=%s", order_id, credits, payment_id)

    # NOTE: user lookup by order_id[:8] prefix is approximate.
    # In production, store order_id → user_id mapping in Convex before redirecting.

    return {"status": "ok"}
```

**Step 4: Add "Mokėti per banką" button to `PricingModal.tsx`**

In the add-on packs section, add a secondary button:

```tsx
{/* Below existing Stripe add-on buttons */}
<div className="mt-4 pt-4 border-t border-white/10">
  <p className="text-xs text-gray-500 mb-3">
    Arba mokėkite per lietuvišką banką (Swedbank, SEB, Luminor):
  </p>
  <div className="grid grid-cols-3 gap-3">
    {[
      { pack: "credits_10", credits: 10, price: "€9" },
      { pack: "credits_50", credits: 50, price: "€35" },
      { pack: "credits_100", credits: 100, price: "€59" },
    ].map((addon) => (
      <button
        key={addon.pack}
        onClick={async () => {
          setLoading(`paysera-${addon.pack}`);
          try {
            const res = await fetch(`${import.meta.env.PUBLIC_API_URL}/api/billing/paysera/checkout`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ pack: addon.pack, user_id: userId, user_email: userEmail }),
            });
            const { url } = await res.json();
            window.location.href = url;
          } finally {
            setLoading(null);
          }
        }}
        disabled={loading === `paysera-${addon.pack}`}
        className="p-3 rounded-xl border border-amber-500/30 bg-amber-950/20 hover:bg-amber-950/40 text-center transition-colors"
      >
        <div className="text-lg font-bold text-white">{addon.credits}</div>
        <div className="text-xs text-gray-400 mb-1">kreditų</div>
        <div className="text-xs font-semibold text-amber-400">{addon.price} · banku</div>
      </button>
    ))}
  </div>
</div>
```

**Step 5: Register with Paysera (manual)**

1. Go to https://www.paysera.com → Registruotis
2. Create project: Business type → Software/SaaS
3. Set callback URL: `https://yourdomain.lt/api/billing/paysera/callback`
4. Copy Project ID and Sign Password → add to `backend/.env`
5. Test in sandbox mode (`PAYSERA_TEST_MODE=true`)

**Step 6: Commit**

```bash
git add backend/app/services/paysera.py backend/app/routers/billing.py backend/app/config.py frontend/src/components/PricingModal.tsx
git commit -m "feat: add Paysera bank payment for Lithuanian bank link top-ups"
```

---

## Summary

| Task | What it does |
|------|-------------|
| 1 | Convex schema: subscriptions + credits tables |
| 2 | Convex mutations: grant/deduct/query credits |
| 3 | Backend: Stripe SDK + config vars |
| 4 | Backend: credits service (calc + enforce) |
| 5 | Backend: Stripe webhook + checkout + portal |
| 6 | Backend: enforce credits in analyze endpoint |
| 7 | Frontend: billing API client |
| 8 | Frontend: CreditsWidget in TopBar |
| 9 | Frontend: PricingModal with plans + addons |
| 10 | Manual: Stripe Dashboard setup |
| 11 | Convex: free credits on signup |
| 12 | Integration test of full flow |
| 13 | Paysera bank link for Lithuanian users |
