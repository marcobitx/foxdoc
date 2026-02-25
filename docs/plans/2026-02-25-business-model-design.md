# FoxDoc Business Model Design
**Date:** 2026-02-25
**Status:** Approved
**Research sources:** BVP AI Pricing Playbook, 10+ competitor analysis (Kira, Luminance, Ironclad, Docspire), Reddit/HN community, Factory.ai/Cursor/Devin/GitHub Copilot pricing

---

## Positioning

**"Lietuvos viešųjų pirkimų AI analitikas"** — the only Lithuanian-language tool for automated analysis of public procurement document packages.

**Target market (Phase 1):** Lithuania only
- ~500 municipalities and public institutions
- ~200 audit and consulting firms
- ~1,000 individual procurement specialists
- **Total addressable: ~1,700 potential customers**

**Value proposition:** A procurement specialist manually reviews a 200-page tender package in 4–6 hours. FoxDoc does it in 3 minutes. At €40/hr analyst cost, 1 analysis = €160–€240 of saved value. FoxDoc cost = €0.60–€2.40 per analysis.

**12-month target:** 100 paying customers → ~€6,000–€8,000 MRR

---

## Business Model: Credit-Based Hybrid (Variant B)

### Why Credits, Not Seats or Flat Subscriptions

1. **Mirrors real inference costs** — a 50-document ZIP analysis costs 3x more compute than a single PDF. Credits reflect this proportionally.
2. **Protects margins** — "unlimited" plans are margin killers for AI products (GitHub Copilot lost ~$20/user/month at $10/month). Credits cap downside risk.
3. **Industry standard** — Factory.ai (Factory Standard Tokens), Windsurf (Prompt Credits), Devin (ACUs), GitHub Copilot (Premium Requests) all use proprietary credit units.
4. **Add-on credits reduce churn** — when users hit limits at a critical deadline, they buy credits rather than cancel.
5. **Scales with value** — as OpenRouter inference costs decline over time, credit margins improve without changing listed prices.

### Credit Definition

| Analysis Size | Credits Used |
|--------------|-------------|
| Standard (1–15 documents) | 1 credit |
| Large (16–50 documents, ZIP) | 3 credits |
| Extra-large (50+ documents) | 5 credits |

The system calculates credit cost before running the pipeline and warns the user.

---

## Pricing Tiers

| Plan | Price | Credits | Users | Features |
|------|-------|---------|-------|----------|
| **Free** | €0 | 3 (one-time, no CC) | 1 | Analysis + on-screen report view |
| **Starter** | €19/month | 20/month | 1 | + PDF export + chat history |
| **Pro** | €59/month | 75/month | 3 | + DOCX export + model selection + priority queue |
| **Team** | €149/month | 200/month | 10 | + API access + custom prompts + bulk upload |
| **Enterprise** | Custom (annual) | Unlimited | Unlimited | + SSO/SAML + VPC/on-premise + SLA + GDPR DPA + audit logs |

**Annual billing discount:** 17% off
- Starter: €190/year (saves €38)
- Pro: €590/year (saves €118)
- Team: €1,490/year (saves €298)

**Add-on credit packs** (available on any paid plan):

| Pack | Price | Per-credit cost |
|------|-------|----------------|
| 10 credits | €9 | €0.90 |
| 50 credits | €35 | €0.70 |
| 100 credits | €59 | €0.59 |

---

## Growth Funnel (Product-Led Growth)

```
Free (3 credits, no CC required)
    ↓  "aha moment" after first real analysis
Starter €19 (low barrier for individual specialists)
    ↓  team starts using it
Pro/Team €59–€149 (natural expansion)
    ↓  procurement department + auditors
Enterprise (municipality / central purchasing body)
```

### Conversion Mechanisms

| Conversion | Trigger |
|-----------|---------|
| Free → Starter | Export button paywall; chat history limit |
| Starter → Pro | 3-user seat limit; DOCX export requirement |
| Pro → Team | API access need; 10+ users |
| Team → Enterprise | SSO requirement; GDPR DPA; VPC deployment |

### Free Tier Design Principles

- 3 credits is enough to complete 1 real analysis and experience the full value
- No credit card required (reduces signup friction for public sector)
- After credits exhaust: clear CTA to Starter, not a hard wall
- No permanent free plan for power users — time-limited trial behavior

---

## Competitive Positioning

| Dimension | FoxDoc | Docspire (nearest SMB competitor) | Enterprise tools (Kira/Luminance) |
|-----------|--------|----------------------------------|----------------------------------|
| Language | Lithuanian (native) | English | English |
| Entry price | €19/month | $99/month | $5,000–$100,000+/year |
| Multi-document ZIP | ✅ | ❌ at entry tier | ✅ |
| QA scoring | ✅ | ❌ | varies |
| Post-analysis chat | ✅ | ❌ | ❌ at this price |
| Procurement-specific extraction | ✅ (CPV, CVPIS) | ❌ | partial |
| Transparent pricing | ✅ | ✅ | ❌ (quote-only) |

**Primary moat:** Lithuanian language fluency + procurement domain specificity + multi-document aggregation at a price point that enterprise tools cannot touch.

**Strategic insight from research:** The €29–€249/month band for Lithuanian/Eastern European public procurement is completely uncontested. Enterprise tools floor at $15,000–$30,000/year. Nothing serious exists below $100/month for document AI. FoxDoc owns this band by default.

---

## Unit Economics

### Per-Analysis Cost (LLM inference via OpenRouter)

- Claude Sonnet 4: ~$3/M input tokens + $15/M output tokens
- Average procurement analysis: ~2,000–5,000 output tokens
- **Estimated COGS per analysis: €0.05–€0.15**

### Margin Analysis

| Plan | Revenue/credit | COGS/credit | Gross margin |
|------|---------------|------------|-------------|
| Starter (€19/20 credits) | €0.95 | €0.10 | ~89% |
| Pro (€59/75 credits) | €0.79 | €0.10 | ~87% |
| Team (€149/200 credits) | €0.75 | €0.10 | ~87% |
| Add-on 10-pack (€9/10) | €0.90 | €0.10 | ~89% |

**Note:** Even at 3x inference cost (heavy ZIP analysis = 3 credits), margins remain healthy. This model achieves 85–90% gross margins, well above the 50–60% industry average for AI SaaS.

---

## Pricing Psychology Rules

From BVP + community research:

1. **If buyers say "sold" immediately → price is too low.** Raise until you hear "we need to discuss this."
2. **Higher prices attract higher-quality customers.** Public sector buyers use price as a quality proxy.
3. **Annual discount of 15–17% is market standard.** Don't exceed 20% — it signals desperation.
4. **Never offer "unlimited" plans** — one heavy user can destroy margins. Always use credit caps.
5. **Do not expose token counts or API costs** — confuses non-technical buyers and creates anxiety.

---

## Future Pricing Evolution

As the product matures and AI accuracy improves:

**Phase 2 (6–12 months):** Outcome-based option for Enterprise — "pay only if QA score ≥ 70%". This removes risk for institutional buyers and is the direction Intercom ($0.99/resolved ticket) and Zendesk are moving.

**Phase 3 (12–24 months):** Expand to Latvia/Estonia with localized language models. Same credit system, adjusted pricing for local market conditions.

---

## What NOT to Do

- ❌ No unlimited plans at any tier
- ❌ No token-based pricing visible to end users
- ❌ No permanent generous free tier (kills conversion)
- ❌ No per-seat pricing for the core product
- ❌ No quote-only enterprise-only motion at launch (kills SMB acquisition)
- ❌ Do not underprice to attract users — price where institutional buyers take you seriously
