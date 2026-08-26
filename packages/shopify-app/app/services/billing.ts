import { ShopifyGraphQLService } from './shopify-graphql';

export interface PlanConfig {
  name: string;
  price: number;
  trialDays: number;
  terms: string;
}

export const SUBSCRIPTION_PLANS: Record<'STARTER' | 'GROWTH' | 'SCALE', PlanConfig> = {
  STARTER: {
    name: 'Starter Pilot',
    price: 10.0,
    trialDays: 14,
    terms: '14-day free trial, then $10.00/month. Auto-protect up to 10 products with RAG JSON-LD & FAQ schemas.',
  },
  GROWTH: {
    name: 'Growth Pilot',
    price: 59.99,
    trialDays: 14,
    terms: '14-day free trial, then $59.99/month. Auto-protect up to 50 products with Dual-Engine (ChatGPT + Perplexity) simulation & weekly drift alerts.',
  },
  SCALE: {
    name: 'Scale Dominance',
    price: 199.99,
    trialDays: 14,
    terms: '14-day free trial, then $199.99/month. Unlimited products, Tri-Engine simulation (GPT + Perplexity + Gemini), and custom competitor watchlists.',
  },
};

export class ShopifyBillingService {
  private graphqlService: ShopifyGraphQLService;

  constructor(graphqlService: ShopifyGraphQLService) {
    this.graphqlService = graphqlService;
  }

  /**
   * Generates a Shopify GraphQL appSubscriptionCreate mutation for recurring merchant billing
   */
  public generateAppSubscriptionMutation(
    planKey: 'STARTER' | 'GROWTH' | 'SCALE',
    returnUrl: string,
    testMode: boolean = true
  ): { query: string; variables: Record<string, any> } {
    const plan = SUBSCRIPTION_PLANS[planKey];

    const mutation = `
      mutation AppSubscriptionCreate($name: String!, $returnUrl: URL!, $lineItems: [AppSubscriptionLineItemInput!]!, $trialDays: Int, $test: Boolean) {
        appSubscriptionCreate(
          name: $name
          returnUrl: $returnUrl
          lineItems: $lineItems
          trialDays: $trialDays
          test: $test
        ) {
          appSubscription {
            id
            status
            currentPeriodEnd
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
      name: `AEO Engine — ${plan.name}`,
      returnUrl,
      trialDays: plan.trialDays,
      test: testMode,
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              price: {
                amount: plan.price,
                currencyCode: 'USD',
              },
              interval: 'EVERY_30_DAYS',
            },
          },
        },
      ],
    };

    return { query: mutation, variables };
  }
}
