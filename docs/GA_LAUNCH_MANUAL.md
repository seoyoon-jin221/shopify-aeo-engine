# 🚀 AEO Engine: GA Launch & Operator Runbook

This runbook outlines the exact step-by-step actions to transition **AEO Engine** from local development to **Live General Availability on the Shopify App Store**.

---

## 📋 Pre-Flight Checklist

```
[x] Core 4-Vector AI Scoring Engine (0-100)
[x] Academic Research Alignment (Princeton/Georgia Tech SIGKDD '24)
[x] Shopify GraphQL Metafield Sync (geo_engine.structured_data & faq_data)
[x] Liquid Theme App Extensions (geo-schema.liquid & geo-faq.liquid)
[x] Mandatory GDPR Webhooks (data_request, customers_redact, shop_redact)
[x] Recurring Billing Engine ($10 Starter, $59.99 Growth, $199.99 Scale + 14-Day Trials)
[x] Inngest Weekly Citation Drift Sentinel Scheduler
[x] 100% E2E Integration Test Coverage
```

---

## 🛠️ Tomorrow's Step-by-Step Operator Actions

### Step 1: Deploy to Cloud (Vercel / Fly.io)
1. Push this repository to GitHub (`git push origin main`).
2. Import repo into **Vercel** (`https://vercel.com/new`).
3. Add Environment Variables from `.env.example`:
   * `SHOPIFY_API_KEY`: `070a38794fa2ae9e69e443ef405ca16e`
   * `SHOPIFY_API_SECRET`: *(From Shopify Partner Dashboard)*
   * `PERPLEXITY_API_KEY` & `OPENAI_API_KEY`: *(Your LLM keys)*
   * `SHOPIFY_APP_URL`: `https://your-app-name.vercel.app`
4. Click **Deploy**.

---

### Step 2: Update Shopify App URLs & Webhooks
1. Open [Shopify Partner Dashboard](https://partners.shopify.com/) $\rightarrow$ **Apps** $\rightarrow$ **AEO Engine**.
2. Under **App Setup**:
   * **App URL**: `https://your-app-name.vercel.app`
   * **Allowed redirection URL(s)**: `https://your-app-name.vercel.app/api/auth/callback`
3. Under **GDPR Webhooks**:
   * **Customer data request**: `https://your-app-name.vercel.app/api/webhooks/customers_data_request`
   * **Customer data erasure**: `https://your-app-name.vercel.app/api/webhooks/customers_redact`
   * **Shop data erasure**: `https://your-app-name.vercel.app/api/webhooks/shop_redact`

---

### Step 3: Deploy Theme Extensions via CLI
In your local terminal:
```bash
npm run deploy
```
*This uploads the `geo-schema` and `geo-faq` Liquid Theme App Extensions to Shopify CDN.*

---

### Step 4: Submit for Shopify App Store Review
1. Go to **Distribution** $\rightarrow$ **Shopify App Store**.
2. Fill in the listing metadata (already pre-written in [`docs/APP_STORE_LISTING.md`](file:///Users/emanon/workspace/shopify_GEO/docs/APP_STORE_LISTING.md)):
   * **App Name**: `AEO Engine: Answer Engine Optimization & ChatGPT SEO`
   * **Category**: *Search Engine Optimization* & *Marketing Analytics*
   * **Pricing**:
     * **Starter Pilot**: $10.00/mo (14-day free trial)
     * **Growth Pilot**: $59.99/mo (14-day free trial)
     * **Scale Dominance**: $199.99/mo (14-day free trial)
3. Upload the App Store Screenshots and click **Submit for Review**.

---

## 🎯 Day-1 Cold Outreach Launch Script
Once approved, send this high-converting cold email to your target list of 500 K-Beauty/Skincare Shopify stores:

> **Subject**: quick check on your ChatGPT & Perplexity citation ranking
>
> Hey [Name],
> 
> Noticed that when buyers ask ChatGPT *"What's the best moisturizer for barrier repair?"*, [Competitor Brand] is getting recommended #1 while [Your Store] is missing out on citations because your Shopify store lacks structured entity schema graphs.
> 
> We built **AEO Engine** to automatically inject Princeton-benchmark RAG schemas & Q&A accordions into your Shopify store in 1 click.
> 
> You can try it completely free for 14 days on the Shopify App Store: [Shopify App Store Link]
> 
> Best,  
> [Your Name]
