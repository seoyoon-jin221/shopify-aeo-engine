# Product Requirements Document (PRD): Shopify GEO Engine

## 1. Executive Summary & Vision

### Vision
To become the **#1 Generative Engine Optimization (GEO) platform for e-commerce**, enabling Shopify merchants to get their products cited, recommended, and purchased when consumers search on **ChatGPT Search, Perplexity, Gemini, and Google AI Overviews**.

### Category Opportunity
Traditional SEO suites (Booster, Avada, Plug in SEO) focus exclusively on Google crawler meta tags and page speed, leaving merchants completely invisible to LLM RAG pipelines. Off-platform GEO enterprise tools (Profound, Peec AI) charge $2,000+/mo and cannot write directly to store themes. **GeoSync captures the uncontested Shopify App Store white space** by providing automated, 1-click schema and context optimization directly inside the merchant admin.

---

## 2. Target Persona & Jobs-to-be-Done (JTBD)

### Target Persona
* **Primary**: Indie D2C Founders & E-commerce Managers (specifically high-intent verticals like K-Beauty, Skincare, Supplements, and Specialty Goods).
* **Pain Point**: Losing search traffic as Gen Z / millennial buyers shift from standard Google search to conversational AI queries (*"What is the best gentle serum for a damaged moisture barrier?"*).
* **Goal**: Increase AI search visibility and citation share without hiring expensive SEO consultants or editing Liquid theme code.

### Jobs-to-be-Done (JTBD)
> *"When a prospective buyer asks ChatGPT or Perplexity for product recommendations in my niche, I want my product's key ingredients, benefits, and price to be accurately cited with a direct link, so that I capture high-intent conversion traffic from AI search engines."*

---

## 3. Critical User Journeys (CUJs)

### CUJ 1: Onboarding & Zero-Click Store Audit
1. Merchant installs **GeoSync** from Shopify App Store.
2. App completes OAuth and automatically imports top 20 products.
3. Merchant lands on Polaris Dashboard showing overall Store AI Visibility Score (e.g., 38/100).
4. Top 3 entity gaps and competitor threats (e.g., COSRX, Beauty of Joseon) are highlighted immediately.

### CUJ 2: 1-Click RAG Schema & FAQ Injection
1. Merchant clicks **"1-Click Fix"** on an underperforming product.
2. Core GEO Engine generates:
   - RAG-optimized `Product` + `Offer` + `MerchantReturnPolicy` JSON-LD graph.
   - High-Information-Gain FAQ accordion answering Reddit/AI buyer questions.
3. System writes JSON payloads to Shopify Product Metafields (`geo_engine.structured_data`, `geo_engine.faq_data`).
4. Injected Theme App Block dynamically renders structured data without touching theme code.
5. Product score immediately updates to **94/100**.

### CUJ 3: Automated Review Flywheel & Social Proof
1. Immediately after a merchant resolves their first 5 products and hits a 90+ score, an in-app banner triggers:
   > *"Your store is now AI-Search Ready! Share your experience to unlock 10 additional simulation audits."*
2. Merchant is directed to the Shopify App Store 5-star review flow.

---

## 4. Feature Specifications & Requirements

### 4.1 AI Citation Simulation Engine
* **Input**: Product title, description, tags, vendor, type.
* **Output**: Synthetic buyer prompt variations across 4 intents (ingredient, skin type, comparison, recommendation).
* **Providers**: Perplexity API, OpenAI Search / GPT-4o, Google Gemini API.

### 4.2 Holistic 0–100 Citation Readiness Scorer
* **Brand Citation Rate (0–30 pts)**: Presence in simulated AI answers.
* **Entity Depth (0–25 pts)**: Ingredient composition, clinical claims, step-by-step usage.
* **Information Gain (0–25 pts)**: Unique FAQ answers addressing comparative and barrier questions.
* **Structured Data Readiness (0–20 pts)**: Valid JSON-LD schema with rich snippet fields.

### 4.3 Theme App Extension (Liquid App Blocks)
* **`geo-schema.liquid`**: Injected into `<head>` targeting LLM crawlers (`GPTBot`, `PerplexityBot`, `Google-Extended`).
* **`geo-faq.liquid`**: Responsive storefront accordion rendering AI-generated Q&As for both human shoppers and search parsers.

### 4.4 Mandatory Shopify Compliance Endpoints
* `POST /api/webhooks/customers_data_request` -> 200 OK
* `POST /api/webhooks/customers_redact` -> 200 OK
* `POST /api/webhooks/shop_redact` -> 200 OK
* `POST /api/webhooks/app_uninstalled` -> 200 OK

---

## 5. Pricing & Monetization Strategy

| Tier | Price | Product Audits | Features |
|---|---|---|---|
| **Free / Starter** | $0 / mo | 5 Products | Baseline Citation Score, Basic JSON-LD Schema |
| **Pro Growth** | $39 / mo | 50 Products | Full Perplexity/ChatGPT Simulation, High-Info FAQ Injection, Weekly Drift Alerts |
| **Scale / Agency** | $89 / mo | Unlimited | Multi-channel Simulation, Reddit Sentiment Monitoring, Priority Support |

---

## 6. Acceptance Criteria (BDD / Gherkin)

```gherkin
Feature: Product GEO Audit and 1-Click Schema Fix

  Scenario: Merchant runs audit on a newly imported product
    Given the merchant has installed the GeoSync app
    And the merchant has 10 products in their Shopify store
    When the merchant opens the dashboard and triggers an audit
    Then the system should return a 0-100 Citation Readiness Score for each product
    And identify missing entity fields like ingredients or return policy

  Scenario: Merchant applies 1-click fix to product
    Given a product with score below 50
    When the merchant clicks "1-Click Fix"
    Then the app should set metafields "geo_engine.structured_data" and "geo_engine.faq_data"
    And the Theme App Block should render the JSON-LD script tag on the storefront
    And the product score should update to 90+
```
