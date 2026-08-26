import { CitationDriftSentinel } from './drift-sentinel';
import { ProductCatalogItem } from '@shopify-geo/shared-types';

export interface SentinelJobConfig {
  shopDomain: string;
  catalog: ProductCatalogItem[];
  previousScores: Map<string, number>;
}

export class InngestSentinelScheduler {
  private sentinel: CitationDriftSentinel;

  constructor() {
    this.sentinel = new CitationDriftSentinel();
  }

  /**
   * Cron Trigger: '0 9 * * 1' (Every Monday at 9:00 AM UTC)
   * Executes automated citation health scans across all active merchant catalogs
   */
  public async executeScheduledWeeklyRun(jobs: SentinelJobConfig[]) {
    console.log(`[Drift Sentinel] Starting weekly citation health sweep across ${jobs.length} stores...`);
    const reports = [];

    for (const job of jobs) {
      try {
        const report = await this.sentinel.executeWeeklyHealthCheck(
          job.shopDomain,
          job.catalog,
          job.previousScores
        );
        reports.push(report);
        console.log(`[Drift Sentinel] Completed scan for ${job.shopDomain}: Health ${report.averageScore}/100`);
      } catch (err) {
        console.error(`[Drift Sentinel] Failed scan for ${job.shopDomain}:`, err);
      }
    }

    return {
      executedAt: new Date().toISOString(),
      storesProcessed: reports.length,
      reports,
    };
  }
}
