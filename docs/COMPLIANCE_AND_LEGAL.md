# Compliance, Legal & App Store Review Readiness

## 1. Shopify App Store Review Checklist

To pass the official Shopify App Store review on the first attempt, ensure all items in this checklist are satisfied:

| Requirement | Implementation Detail | Status |
|---|---|---|
| **Mandatory GDPR Webhooks** | `/api/webhooks/customers_data_request`<br/>`/api/webhooks/customers_redact`<br/>`/api/webhooks/shop_redact` returning 200 OK | Built |
| **Theme Integrity** | Zero direct Liquid theme file edits; strictly use **Theme App Extensions (App Blocks)** | Built |
| **Embedded App Experience** | Loads inside Shopify Admin iframe via **App Bridge v4** & **Polaris UI** | Built |
| **Hosted Privacy Policy** | Public HTTPS URL (e.g. `https://your-domain.vercel.app/privacy`) | Ready |
| **Hosted Terms of Service** | Public HTTPS URL (e.g. `https://your-domain.vercel.app/terms`) | Ready |
| **Reviewer Test Credentials** | Test store credentials or free automatic demo mode enabled for Shopify reviewers | Ready |

---

## 2. Mandatory GDPR / CCPA Webhook Handlers

```typescript
// Implemented in packages/shopify-app/app/routes/api.webhooks.ts
// 1. customers/data_request
// 2. customers/redact
// 3. shop/redact (Purges all stored tokens & shop data 48 hours after uninstall)
```

---

## 3. Moonlighting & IP Boundary Safety Guidelines

For full-time software engineers building a side venture:

1. **Equipment**: Strictly use **personal computer and personal network**. Never use employer laptops, corporate cloud accounts, or corporate IDE profiles.
2. **Time**: Perform all development and business operations **outside of company business hours** (evenings and weekends).
3. **Intellectual Property**: Do not use employer proprietary algorithms, internal tools, or internal frameworks. All code in this repository is built using standard open-source tools (React, Polaris, Node.js, TypeScript).
4. **Corporate Formation**: Payouts from Shopify Partner Dashboard can be received directly via personal checking account (SSN / Sole Proprietorship) initially, with zero LLC filing friction until revenue thresholds are met.
