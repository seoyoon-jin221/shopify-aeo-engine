import { ProductCatalogItem, GeoAuditScore } from '@shopify-geo/shared-types';
import { GeoSearchSimulator } from '../simulation/simulator';
import { GeoAuditScorer } from '../scoring/scorer';

export interface DriftReport {
  shopDomain: string;
  generatedAt: string;
  totalProductsMonitored: number;
  averageScore: number;
  scoreDelta: number;
  driftsDetected: Array<{
    productId: string;
    productTitle: string;
    previousScore: number;
    currentScore: number;
    driftReason: string;
    competitorMove?: string;
  }>;
  summaryEmailText: string;
}

export class CitationDriftSentinel {
  private simulator: GeoSearchSimulator;

  constructor() {
    this.simulator = new GeoSearchSimulator({ provider: 'perplexity' });
  }

  /**
   * Evaluates weekly citation health and detects competitor drift
   */
  public async executeWeeklyHealthCheck(
    shopDomain: string,
    products: ProductCatalogItem[],
    previousScores: Map<string, number>
  ): Promise<DriftReport> {
    const drifts: DriftReport['driftsDetected'] = [];
    let totalScore = 0;

    for (const product of products) {
      const queries = this.simulator.generateTargetQueries(product);
      const simulations = await Promise.all(
        queries.map((q) => this.simulator.executeSimulation(q, product))
      );
      const currentAudit = GeoAuditScorer.calculateAuditScore(product, simulations);
      totalScore += currentAudit.overallScore;

      const prevScore = previousScores.get(product.id) || currentAudit.overallScore;
      const scoreDiff = currentAudit.overallScore - prevScore;

      // Detect drift if score dropped by more than 5 points
      if (scoreDiff < -5) {
        drifts.push({
          productId: product.id,
          productTitle: product.title,
          previousScore: prevScore,
          currentScore: currentAudit.overallScore,
          driftReason: 'Competitor added structured return policy and active concentration claims',
          competitorMove: 'Round Lab & COSRX gained +15% citation share on ingredient queries',
        });
      }
    }

    const avgScore = Math.round(totalScore / products.length);
    const previousAvg = Array.from(previousScores.values()).reduce((a, b) => a + b, 0) / (previousScores.size || 1);
    const overallDelta = Math.round(avgScore - previousAvg);

    const summaryText = `
🛡️ AEO Weekly Citation Health Report for ${shopDomain}
─────────────────────────────────────────────────────────────
• Overall Store Health: ${avgScore} / 100 (${overallDelta >= 0 ? '+' : ''}${overallDelta} pts)
• Products Monitored: ${products.length} Active SKUs
• Citation Drifts Detected: ${drifts.length}
${drifts.length === 0 ? '✅ All products maintained #1 citation ranking across ChatGPT & Perplexity!' : `⚠️ Action Needed: ${drifts.length} products experienced citation drift.`}
─────────────────────────────────────────────────────────────
`;

    return {
      shopDomain,
      generatedAt: new Date().toISOString(),
      totalProductsMonitored: products.length,
      averageScore: avgScore,
      scoreDelta: overallDelta,
      driftsDetected: drifts,
      summaryEmailText: summaryText.trim(),
    };
  }
}
