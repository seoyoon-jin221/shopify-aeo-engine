import { neon, NeonQueryFunction } from '@neondatabase/serverless';

// In-memory mock store for local development or when DATABASE_URL is not yet configured
const inMemoryStore: {
  merchants: Map<string, any>;
  queryCache: Map<string, any>;
  auditRuns: Map<string, any>;
  driftTimeline: Map<string, any[]>;
  watchlist: Map<string, any[]>;
} = {
  merchants: new Map(),
  queryCache: new Map(),
  auditRuns: new Map(),
  driftTimeline: new Map(),
  watchlist: new Map(),
};

let dbClient: NeonQueryFunction<false, false> | null = null;

export function getDb(): NeonQueryFunction<false, false> | null {
  if (dbClient) return dbClient;
  if (process.env.DATABASE_URL) {
    try {
      dbClient = neon(process.env.DATABASE_URL);
      return dbClient;
    } catch (err) {
      console.warn('[DB] Failed to initialize Neon client:', err);
    }
  }
  return null;
}

export async function initDatabase(): Promise<boolean> {
  const sql = getDb();
  if (!sql) {
    console.log('[DB] Running with in-memory persistence layer (DATABASE_URL not configured).');
    return false;
  }

  try {
    // 1. Merchants Table
    await sql`
      CREATE TABLE IF NOT EXISTS merchants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_domain VARCHAR(255) UNIQUE NOT NULL,
        access_token TEXT,
        plan_tier VARCHAR(50) DEFAULT 'FREE_TRIAL',
        subscription_id VARCHAR(255),
        subscription_status VARCHAR(50),
        installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // 2. Global Grounding Query Cache
    await sql`
      CREATE TABLE IF NOT EXISTS grounding_query_cache (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        query_fingerprint VARCHAR(64) UNIQUE NOT NULL,
        category VARCHAR(100) NOT NULL,
        query_text TEXT NOT NULL,
        engine VARCHAR(50) NOT NULL,
        response_text TEXT NOT NULL,
        top_cited_brand VARCHAR(255),
        why_won TEXT,
        citations JSONB DEFAULT '[]'::jsonb,
        extracted_brands JSONB DEFAULT '[]'::jsonb,
        is_store_specific BOOLEAN DEFAULT FALSE,
        shop_domain VARCHAR(255),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // 3. Audit Runs
    await sql`
      CREATE TABLE IF NOT EXISTS audit_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_domain VARCHAR(255) NOT NULL,
        total_queries INTEGER DEFAULT 120,
        store_cited_count INTEGER DEFAULT 0,
        citation_rate NUMERIC(5,2) DEFAULT 0.00,
        readiness_score INTEGER DEFAULT 0,
        dimension_breakdown JSONB NOT NULL,
        catalog_context JSONB NOT NULL,
        triggered_by VARCHAR(50) DEFAULT 'MANUAL_SCAN',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // 4. Drift Timeline Snapshots
    await sql`
      CREATE TABLE IF NOT EXISTS drift_timeline (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_domain VARCHAR(255) NOT NULL,
        recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        readiness_score INTEGER NOT NULL,
        citation_rate NUMERIC(5,2) NOT NULL,
        cited_count INTEGER NOT NULL,
        total_queries INTEGER NOT NULL,
        granularity VARCHAR(20) DEFAULT 'MONTHLY'
      );
    `;

    // 5. Competitor Watchlist
    await sql`
      CREATE TABLE IF NOT EXISTS competitor_watchlist (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_domain VARCHAR(255) NOT NULL,
        brand_name VARCHAR(255) NOT NULL,
        website_url TEXT NOT NULL,
        canonical_domain VARCHAR(255) NOT NULL,
        detected_schemas JSONB DEFAULT '[]'::jsonb,
        last_scraped_at TIMESTAMP WITH TIME ZONE,
        status VARCHAR(50) DEFAULT 'TRACKED',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    console.log('[DB] Neon Database tables initialized successfully.');
    return true;
  } catch (err) {
    console.error('[DB] Error bootstrapping Neon schema:', err);
    return false;
  }
}

export const memoryStore = inMemoryStore;
