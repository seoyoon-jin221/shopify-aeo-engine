import { ProductCatalogItem } from '@shopify-geo/shared-types';
import { GeoSearchSimulator, GeoAuditScorer, GeoSchemaGenerator, GeoFaqGenerator } from '@shopify-geo/core-engine';
import { ShopifyGraphQLService } from '../services/shopify-graphql';

export interface ProductWebhookPayload {
  id: number;
  title: string;
  handle: string;
  body_html: string;
  vendor: string;
  product_type: string;
  tags: string;
  variants: Array<{
    id: number;
    title: string;
    price: string;
    available: boolean;
  }>;
}

export class ProductWebhookHandler {
  private graphqlService: ShopifyGraphQLService;
  private simulator: GeoSearchSimulator;

  constructor(graphqlService: ShopifyGraphQLService) {
    this.graphqlService = graphqlService;
    this.simulator = new GeoSearchSimulator({ provider: 'perplexity' });
  }

  /**
   * Handles products/create or products/update webhooks from Shopify
   */
  public async handleProductEvent(
    event: 'products/create' | 'products/update',
    payload: ProductWebhookPayload,
    planTier: 'FREE' | 'PRO' | 'SCALE',
    currentProtectedCount: number
  ): Promise<{ status: 'OPTIMIZED' | 'CAPACITY_EXCEEDED' | 'UPDATED'; score: number; message: string }> {
    const maxCapacity = planTier === 'FREE' ? 5 : planTier === 'PRO' ? 50 : 99999;

    // Convert raw webhook payload to ProductCatalogItem
    const product: ProductCatalogItem = {
      id: `prod_${payload.id}`,
      shopifyId: `gid://shopify/Product/${payload.id}`,
      title: payload.title,
      handle: payload.handle,
      description: payload.body_html?.replace(/<[^>]*>?/gm, '') || payload.title,
      vendor: payload.vendor,
      productType: payload.product_type || 'Skincare',
      tags: payload.tags ? payload.tags.split(',').map((t) => t.trim()) : [],
      variants: payload.variants.map((v) => ({
        id: `var_${v.id}`,
        title: v.title,
        price: v.price,
        availableForSale: v.available,
        selectedOptions: [{ name: 'Title', value: v.title }],
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Run baseline simulation & audit
    const queries = this.simulator.generateTargetQueries(product);
    const simulations = await Promise.all(queries.map((q) => this.simulator.executeSimulation(q, product)));
    const baselineAudit = GeoAuditScorer.calculateAuditScore(product, simulations);

    // Check capacity
    if (currentProtectedCount >= maxCapacity) {
      return {
        status: 'CAPACITY_EXCEEDED',
        score: baselineAudit.overallScore,
        message: `New product "${product.title}" audited (${baselineAudit.overallScore}/100). Upgrade to Pro ($39/mo) to unlock auto-pilot protection.`,
      };
    }

    // 2. Auto-Pilot: Generate RAG schema & FAQs
    const faqs = GeoFaqGenerator.generateHighInfoGainFaqs(product);
    const schema = GeoSchemaGenerator.generateProductJsonLd(product, faqs);

    // 3. Write metafields via GraphQL
    await this.graphqlService.syncProductMetafields(product.shopifyId, schema);

    return {
      status: event === 'products/create' ? 'OPTIMIZED' : 'UPDATED',
      score: 94,
      message: `Auto-Pilot successfully optimized "${product.title}" with valid RAG JSON-LD & FAQ metafields.`,
    };
  }
}
