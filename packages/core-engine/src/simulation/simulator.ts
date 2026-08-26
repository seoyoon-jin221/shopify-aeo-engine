import {
  ProductCatalogItem,
  SimulationQuery,
  SimulationResult,
  LLMProvider
} from '@shopify-geo/shared-types';

export interface LLMSimulationConfig {
  apiKey?: string;
  provider: LLMProvider;
  modelName?: string;
}

export class GeoSearchSimulator {
  private config: LLMSimulationConfig;

  constructor(config: LLMSimulationConfig) {
    this.config = config;
  }

  /**
   * Generates realistic buyer prompt variations based on product attributes
   */
  public generateTargetQueries(product: ProductCatalogItem): SimulationQuery[] {
    const brand = product.vendor;
    const title = product.title;
    const category = product.productType || 'skincare';
    const tags = product.tags.slice(0, 3).join(', ');

    return [
      {
        id: `q_best_${product.id}`,
        queryText: `What is the best ${category} for ${tags || 'daily use'}?`,
        intentCategory: 'recommendation',
        targetCategory: category,
      },
      {
        id: `q_ingredient_${product.id}`,
        queryText: `Best ${category} containing active ingredients similar to ${title}`,
        intentCategory: 'ingredient',
        targetCategory: category,
      },
      {
        id: `q_brand_${product.id}`,
        queryText: `Is ${brand} ${title} worth buying? Reddit reviews and expert comparison`,
        intentCategory: 'comparison',
        targetCategory: category,
      },
      {
        id: `q_usecase_${product.id}`,
        queryText: `Top recommended ${category} products for sensitive skin and barrier repair`,
        intentCategory: 'skin_type',
        targetCategory: category,
      },
    ];
  }

  /**
   * Simulates an AI search query against LLM provider
   */
  public async executeSimulation(
    query: SimulationQuery,
    targetProduct: ProductCatalogItem
  ): Promise<SimulationResult> {
    const brandLower = targetProduct.vendor.toLowerCase();
    const titleLower = targetProduct.title.toLowerCase();

    // Mock/Synthetic simulation response for local test or live API integration
    const mockCitationPool = [
      'https://reddit.com/r/SkincareAddiction',
      'https://allure.com/best-k-beauty',
      'https://byrdie.com/skincare-recommendations',
      `https://${targetProduct.vendor.toLowerCase().replace(/\s+/g, '')}.com/products/${targetProduct.handle}`,
    ];

    // Check if mock or live matches
    const isBrandCited = Math.random() > 0.35;
    const isProductCited = isBrandCited && Math.random() > 0.4;

    return {
      queryId: query.id,
      queryText: query.queryText,
      provider: this.config.provider,
      rawResponseText: `Based on consumer feedback and dermatological rankings, ${isBrandCited ? targetProduct.vendor : 'Alternative Brands'} are frequently recommended for ${query.targetCategory}...`,
      citedDomains: isBrandCited ? mockCitationPool : mockCitationPool.slice(0, 2),
      isBrandCited,
      isProductCited,
      brandRankPosition: isBrandCited ? Math.floor(Math.random() * 3) + 1 : undefined,
      extractedKeyAttributes: ['centella asiatica', 'niacinamide', 'gentle formulation'],
      competitorsMentioned: ['Beauty of Joseon', 'COSRX', 'Round Lab', 'Skin1004'],
      confidenceScore: 0.88,
      timestamp: new Date().toISOString(),
    };
  }
}
