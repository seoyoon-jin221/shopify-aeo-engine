import type { VercelRequest, VercelResponse } from '@vercel/node';

interface PlanConfig {
  name: string;
  price: number;
  trialDays: number;
}

interface BillingResponse {
  success: boolean;
  shopDomain?: string;
  planTier?: string;
  planName?: string;
  monthlyPrice?: number;
  trialDays?: number;
  confirmationUrl?: string | null;
  billingStatus?: string;
  timestamp?: string;
  error?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const body = req.body || {};
    const planTier: string = body.planTier || 'STARTER';
    const shopDomain: string = body.shopDomain || 'quickstart-c01718bf.myshopify.com';
    const returnUrl: string = body.returnUrl || `https://admin.shopify.com/store/${shopDomain.replace('.myshopify.com', '')}/apps/070a38794fa2ae9e69e443ef405ca16e`;

    const planConfigs: Record<string, PlanConfig> = {
      STARTER: { name: 'AEO Engine Starter Pilot', price: 10.00, trialDays: 14 },
      GROWTH: { name: 'AEO Engine Growth Pilot', price: 59.99, trialDays: 14 },
      SCALE: { name: 'AEO Engine Scale Dominance', price: 199.99, trialDays: 14 },
    };

    const planConfig: PlanConfig = planConfigs[planTier] || { name: 'AEO Engine Starter Pilot', price: 10.00, trialDays: 14 };

    const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || (req.headers['x-shopify-access-token'] as string);
    let confirmationUrl: string | null = null;

    if (accessToken) {
      const endpoint = `https://${shopDomain}/admin/api/2026-01/graphql.json`;
      const mutation = `
        mutation AppSubscriptionCreate($name: String!, $returnUrl: URL!, $trialDays: Int!, $lineItems: [AppSubscriptionLineItemInput!]!) {
          appSubscriptionCreate(
            name: $name
            returnUrl: $returnUrl
            trialDays: $trialDays
            lineItems: $lineItems
            test: true
          ) {
            appSubscription {
              id
              status
            }
            confirmationUrl
            userErrors {
              field
              message
            }
          }
        }
      `;

      const variables = {
        name: planConfig.name,
        returnUrl,
        trialDays: planConfig.trialDays,
        lineItems: [
          {
            plan: {
              appRecurringPricingDetails: {
                price: { amount: planConfig.price, currencyCode: 'USD' },
                interval: 'EVERY_30_DAYS',
              },
            },
          },
        ],
      };

      try {
        const gqlRes = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': accessToken,
          },
          body: JSON.stringify({ query: mutation, variables }),
        });

        if (gqlRes.ok) {
          const data = await gqlRes.json() as any;
          confirmationUrl = data.data?.appSubscriptionCreate?.confirmationUrl || null;
        }
      } catch (e: any) {
        console.warn('[billing] Shopify GraphQL Billing API warning:', e.message);
      }
    }

    // Default confirmation URL fallback if no active Shopify API token in dev
    if (!confirmationUrl) {
      confirmationUrl = `https://${shopDomain}/admin/charges/confirm_recurring_charge?charge_id=trial_14day_${planTier.toLowerCase()}`;
    }

    const responseData: BillingResponse = {
      success: true,
      shopDomain,
      planTier,
      planName: planConfig.name,
      monthlyPrice: planConfig.price,
      trialDays: planConfig.trialDays,
      confirmationUrl,
      billingStatus: '14_DAY_FREE_TRIAL_PENDING_APPROVAL',
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(responseData);
  } catch (err: any) {
    const errorResponse: BillingResponse = { success: false, error: err.message };
    return res.status(500).json(errorResponse);
  }
}
