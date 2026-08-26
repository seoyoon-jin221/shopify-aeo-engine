# Sprint Backlog & Acceptance Criteria

## Sprint 0: Scaffolding & Zero-Admin Setup (Day 1)
* [x] Initialize Monorepo workspaces (`@shopify-geo/core-engine`, `@shopify-geo/shopify-app`, `@shopify-geo/shared-types`).
* [x] Set up living documentation suite (`docs/ARCHITECTURE.md`, `docs/PRD.md`, `docs/GEO_ALGORITHM_SPEC.md`).
* [x] Define Antigravity custom subagents (`.antigravity/agents/`).
* [ ] Register free Shopify Partner account at `partners.shopify.com`.
* [ ] Create free Development Store with Dawn theme and sample product catalog.
* **Definition of Done (DoD)**: Monorepo builds cleanly with `npm run build`, and dev store is ready for app installation.

---

## Sprint 1: Core GEO Engine & AI Simulation (Days 2–7)
* [x] Build `GeoSearchSimulator` interface with buyer query generator.
* [x] Implement `GeoAuditScorer` formula (Brand Citations, Entity Depth, Info Gain, Schema).
* [x] Implement `GeoSchemaGenerator` for rich `Product` + `FAQPage` JSON-LD graphs.
* [x] Unit test engine with synthetic K-beauty product catalog fixtures (`npm test`).
* [ ] Integrate live Perplexity / OpenAI Search API keys for real-time validation.
* **Definition of Done (DoD)**: Passing unit tests verifying that raw Shopify product objects produce accurate 0–100 scores and valid schema metafield payloads.

---

## Sprint 2: Embedded Polaris Dashboard & 1-Click Injection (Days 8–14)
* [x] Create `PolarisAuditScorecard` displaying overall score and category breakdown.
* [x] Create `ProductAuditTable` with 1-Click Fix buttons.
* [x] Build `ShopifyGraphQLService` for batch product fetching and metafield mutations.
* [x] Build Theme App Extension blocks (`geo-schema.liquid` and `geo-faq.liquid`).
* [ ] Test live metafield sync on Shopify Development Store.
* **Definition of Done (DoD)**: Merchant can open app in Shopify Admin, view audit score, click "1-Click Fix", and see JSON-LD schema rendered in storefront HTML source.

---

## Sprint 3: Billing, GDPR Compliance & App Store Submission (Days 15–21)
* [x] Implement mandatory GDPR webhook handlers (`customers/data_request`, `customers/redact`, `shop/redact`).
* [ ] Wire Shopify Recurring Application Charge GraphQL mutation for $39/mo Pro plan.
* [ ] Generate App Store icon (1200x1200px) and 3 dashboard screenshots.
* [ ] Write App Store listing copy targeting `ChatGPT SEO` and `Perplexity Optimization`.
* [ ] Submit app for official review in Shopify Partner Dashboard.
* **Definition of Done (DoD)**: App status transitions to "Under Review" in Shopify Partner Dashboard.

---

## Sprint 4: Day-1 Distribution & Review Flywheel (Days 22–28)
* [ ] Run automated GEO audit on 50 indie Shopify stores.
* [ ] Send personalized cold audit emails to store founders offering free 6-month license.
* [ ] Onboard first 10 active stores.
* [ ] Trigger in-app review prompts once stores hit 90+ score.
* **Definition of Done (DoD)**: Secure first 5 verified 5-star reviews on the public Shopify App Store.
