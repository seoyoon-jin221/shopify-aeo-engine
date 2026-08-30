import { ProductCatalogItem, GeoAuditScore } from '@shopify-geo/shared-types';
import { GeoAuditScorer, GeoSearchSimulator } from '@shopify-geo/core-engine';

export interface CatalogAuditRequest {
  shopDomain: string;
  catalog: ProductCatalogItem[];
}

export interface CatalogAuditResponse {
  shopDomain: string;
  totalProducts: number;
  overallScore: number;
  productAudits: GeoAuditScore[];
  detectedCategory: string;
  topCompetitors: string[];
  missingEntitiesSummary: string[];
}

export class CatalogAuditService {
  private simulator: GeoSearchSimulator;

  constructor() {
    this.simulator = new GeoSearchSimulator({ provider: 'perplexity' });
  }

  /**
   * Runs dynamic 0-100 AEO Citation Audit across a live merchant catalog
   */
  public async auditMerchantCatalog(req: CatalogAuditRequest): Promise<CatalogAuditResponse> {
    const catalog = req.catalog || [];
    
    if (catalog.length === 0) {
      return {
        shopDomain: req.shopDomain,
        totalProducts: 0,
        overallScore: 0,
        productAudits: [],
        detectedCategory: 'General E-Commerce',
        topCompetitors: [],
        missingEntitiesSummary: ['No products found in catalog.'],
      };
    }

    const productAudits: GeoAuditScore[] = [];
    const allCompetitors = new Set<string>();
    const allMissingGaps = new Set<string>();

    for (const product of catalog) {
      const queries = this.simulator.generateTargetQueries(product);
      const simResults = [];

      for (const q of queries) {
        const sim = await this.simulator.executeSimulation(q, product);
        simResults.push(sim);
        sim.competitorsMentioned.forEach((c) => allCompetitors.add(c));
      }

      const audit = GeoAuditScorer.calculateAuditScore(product, simResults);
      productAudits.push(audit);
      audit.keyMissingEntities.forEach((g) => allMissingGaps.add(g));
    }

    const totalScore = productAudits.reduce((acc, a) => acc + a.overallScore, 0);
    const avgScore = Math.round(totalScore / productAudits.length);
    const category = catalog[0]?.productType || 'Beauty & Skincare';

    return {
      shopDomain: req.shopDomain,
      totalProducts: catalog.length,
      overallScore: avgScore,
      productAudits,
      detectedCategory: category,
      topCompetitors: Array.from(allCompetitors).slice(0, 4),
      missingEntitiesSummary: Array.from(allMissingGaps).slice(0, 3),
    };
  }
}
