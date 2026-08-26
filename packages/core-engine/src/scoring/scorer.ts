import {
  ProductCatalogItem,
  SimulationResult,
  GeoAuditScore,
  GeoRecommendedAction,
} from '@shopify-geo/shared-types';

export class GeoAuditScorer {
  /**
   * Computes the holistic 0-100 AI Citation Readiness Score
   */
  public static calculateAuditScore(
    product: ProductCatalogItem,
    simulations: SimulationResult[]
  ): GeoAuditScore {
    // 1. Citation Rate Score (0 - 30)
    const citationScore = this.evaluateBrandCitationRate(simulations);

    // 2. Entity Completeness Score (0 - 25)
    const entityScore = this.evaluateEntityCompleteness(product);

    // 3. Information Gain Score (0 - 25)
    const infoGainScore = this.evaluateInformationGain(product);

    // 4. Structured Data Readiness (0 - 20)
    const schemaScore = this.evaluateStructuredDataReadiness(product);

    const overallScore = Math.round(
      citationScore + entityScore + infoGainScore + schemaScore
    );

    const missingEntities = this.detectMissingEntities(product);
    const competitorThreats = this.aggregateCompetitorThreats(simulations);
    const recommendedActions = this.generateRecommendations(
      product,
      overallScore,
      missingEntities,
      schemaScore
    );

    return {
      productId: product.id,
      overallScore,
      breakdown: {
        brandCitationRate: Math.round(citationScore),
        entityCompleteness: Math.round(entityScore),
        informationGainScore: Math.round(infoGainScore),
        structuredDataReadiness: Math.round(schemaScore),
      },
      keyMissingEntities: missingEntities,
      topCompetitorThreats: competitorThreats,
      recommendedActions,
      generatedAt: new Date().toISOString(),
    };
  }

  private static evaluateBrandCitationRate(simulations: SimulationResult[]): number {
    if (simulations.length === 0) return 0;
    const citedCount = simulations.filter((s) => s.isBrandCited).length;
    const ratio = citedCount / simulations.length;
    return ratio * 30; // Max 30 points
  }

  private static evaluateEntityCompleteness(product: ProductCatalogItem): number {
    let score = 0;
    const desc = (product.description || '').toLowerCase();

    // Key required entities for LLM RAG ingestion
    if (desc.length > 200) score += 5;
    if (desc.length > 500) score += 5;
    if (product.vendor && product.vendor.length > 0) score += 3;
    if (product.tags && product.tags.length >= 3) score += 4;
    if (desc.includes('ingredient') || desc.includes('materials') || desc.includes('composition')) score += 4;
    if (desc.includes('how to use') || desc.includes('directions') || desc.includes('application')) score += 4;

    return Math.min(score, 25);
  }

  private static evaluateInformationGain(product: ProductCatalogItem): number {
    let score = 0;
    const desc = (product.description || '').toLowerCase();

    // Check for unique comparative info, specific clinical claims, suitability nuances
    if (desc.includes('clinical') || desc.includes('tested') || desc.includes('proven')) score += 6;
    if (desc.includes('suitable for') || desc.includes('skin type') || desc.includes('ideal for')) score += 6;
    if (desc.includes('faq') || desc.includes('frequently asked') || desc.includes('q:')) score += 7;
    if (desc.includes('texture') || desc.includes('finish') || desc.includes('scent')) score += 6;

    return Math.min(score, 25);
  }

  private static evaluateStructuredDataReadiness(product: ProductCatalogItem): number {
    let score = 0;
    const metafields = product.metafields || {};

    if (metafields['geo_engine.structured_data']) {
      score += 15;
    } else if (metafields['schema'] || metafields['jsonld']) {
      score += 8;
    }

    if (product.variants && product.variants.length > 0) score += 5;

    return Math.min(score, 20);
  }

  private static detectMissingEntities(product: ProductCatalogItem): string[] {
    const missing: string[] = [];
    const desc = (product.description || '').toLowerCase();

    if (!desc.includes('ingredient') && !desc.includes('composition')) {
      missing.push('Full Key Ingredients / Material Specs Breakdown');
    }
    if (!desc.includes('how to use') && !desc.includes('directions')) {
      missing.push('Step-by-Step Usage & Application Routine');
    }
    if (!desc.includes('suitable for') && !desc.includes('skin type')) {
      missing.push('Target Skin Type & Intended Audience Profile');
    }
    if (!desc.includes('return') && !desc.includes('guarantee')) {
      missing.push('Merchant Return & Satisfaction Policy Entity');
    }
    return missing;
  }

  private static aggregateCompetitorThreats(simulations: SimulationResult[]): string[] {
    const counts: Record<string, number> = {};
    for (const sim of simulations) {
      for (const comp of sim.competitorsMentioned) {
        counts[comp] = (counts[comp] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name]) => name);
  }

  private static generateRecommendations(
    product: ProductCatalogItem,
    overallScore: number,
    missingEntities: string[],
    schemaScore: number
  ): GeoRecommendedAction[] {
    const actions: GeoRecommendedAction[] = [];

    if (schemaScore < 15) {
      actions.push({
        id: `act_schema_${product.id}`,
        type: 'schema_injection',
        title: 'Inject RAG-Optimized JSON-LD Schema Block',
        description: 'Auto-inject schema with nested Product, ItemAvailability, and MerchantReturnPolicy to feed GPTBot & PerplexityBot.',
        impactScore: 9,
        automatedFixAvailable: true,
      });
    }

    if (missingEntities.length > 0) {
      actions.push({
        id: `act_faq_${product.id}`,
        type: 'faq_addition',
        title: 'Generate High-Information-Gain FAQ Block',
        description: `Enrich product context by automatically creating structured Q&As answering ${missingEntities[0]}.`,
        impactScore: 8,
        automatedFixAvailable: true,
      });
    }

    return actions;
  }
}
