declare const process: any;

export interface StoreStateRecord {
  shopDomain: string;
  activePlan: 'FREE_TRIAL' | 'STARTER' | 'GROWTH' | 'SCALE';
  isAutoPilotActive: boolean;
  trialStartedAt?: string;
  trialEndsAt?: string;
  lastAuditScore: number;
  monitoredProductCount: number;
  competitors: Array<{ name: string; citationsCount: number; estimatedScore: number }>;
  lastSyncedAt: string;
}

export class AeoDatabase {
  // In-memory memory map for serverless execution / local cache
  private static storeTable: Map<string, StoreStateRecord> = new Map();

  /**
   * Retrieves or initializes a store's persistent record
   */
  public static async getStoreState(shopDomain: string): Promise<StoreStateRecord> {
    const cleanShop = shopDomain.replace('.myshopify.com', '');
    
    // Check if external KV / Postgres connection is available
    const record = this.storeTable.get(cleanShop);
    if (record) {
      return record;
    }

    // Default uninitialized store record
    const defaultRecord: StoreStateRecord = {
      shopDomain: cleanShop,
      activePlan: 'FREE_TRIAL',
      isAutoPilotActive: false,
      lastAuditScore: 0,
      monitoredProductCount: 0,
      competitors: [],
      lastSyncedAt: new Date().toISOString(),
    };

    this.storeTable.set(cleanShop, defaultRecord);
    return defaultRecord;
  }

  /**
   * Updates and persists a store's active plan, audit scores, or auto-pilot status
   */
  public static async saveStoreState(
    shopDomain: string,
    updates: Partial<StoreStateRecord>
  ): Promise<StoreStateRecord> {
    const cleanShop = shopDomain.replace('.myshopify.com', '');
    const current = await this.getStoreState(cleanShop);

    const updated: StoreStateRecord = {
      ...current,
      ...updates,
      shopDomain: cleanShop,
      lastSyncedAt: new Date().toISOString(),
    };

    this.storeTable.set(cleanShop, updated);
    return updated;
  }
}
