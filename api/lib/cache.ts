import crypto from 'crypto';
import { getDb, memoryStore } from './db';

export interface CachedEvaluation {
  queryFingerprint: string;
  category: string;
  queryText: string;
  engine: string;
  responseText: string;
  topCitedBrand: string | null;
  whyWon: string | null;
  citations: string[];
  extractedBrands: Array<{ name: string; domain?: string }>;
  isStoreSpecific: boolean;
  expiresAt: string;
}

export function generateQueryFingerprint(category: string, queryText: string, engine: string): string {
  const normalized = queryText
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
  return crypto.createHash('sha256').update(`${category.toLowerCase()}:${engine}:${normalized}`).digest('hex');
}

export async function getCachedEvaluation(
  category: string,
  queryText: string,
  engine: string,
  shopDomain?: string
): Promise<CachedEvaluation | null> {
  const fingerprint = generateQueryFingerprint(category, queryText, engine);
  const now = new Date();

  const sql = getDb();
  if (sql) {
    try {
      const rows = await sql`
        SELECT query_fingerprint, category, query_text, engine, response_text,
               top_cited_brand, why_won, citations, extracted_brands, is_store_specific, expires_at
        FROM grounding_query_cache
        WHERE query_fingerprint = ${fingerprint}
          AND expires_at > ${now.toISOString()}
        LIMIT 1;
      `;
      if (rows.length > 0) {
        const r: any = rows[0];
        return {
          queryFingerprint: r.query_fingerprint,
          category: r.category,
          queryText: r.query_text,
          engine: r.engine,
          responseText: r.response_text,
          topCitedBrand: r.top_cited_brand,
          whyWon: r.why_won,
          citations: Array.isArray(r.citations) ? r.citations : JSON.parse(r.citations || '[]'),
          extractedBrands: Array.isArray(r.extracted_brands) ? r.extracted_brands : JSON.parse(r.extracted_brands || '[]'),
          isStoreSpecific: r.is_store_specific,
          expiresAt: r.expires_at,
        };
      }
    } catch (err) {
      console.warn('[Cache] DB query error, falling back to memory store:', err);
    }
  }

  // Memory fallback
  const cached = memoryStore.queryCache.get(fingerprint);
  if (cached && new Date(cached.expiresAt) > now) {
    return cached;
  }
  return null;
}

export async function setCachedEvaluation(
  category: string,
  queryText: string,
  engine: string,
  data: {
    responseText: string;
    topCitedBrand: string | null;
    whyWon: string | null;
    citations: string[];
    extractedBrands: Array<{ name: string; domain?: string }>;
  },
  shopDomain?: string
): Promise<void> {
  const fingerprint = generateQueryFingerprint(category, queryText, engine);
  const isStoreSpecific = Boolean(
    shopDomain &&
      (queryText.toLowerCase().includes(shopDomain.toLowerCase().replace('.myshopify.com', '')) ||
        shopDomain.toLowerCase().includes(category.toLowerCase()))
  );

  // TTL: 7 days for global category queries, 24 hours for store-specific
  const ttlHours = isStoreSpecific ? 24 : 168; // 168 hrs = 7 days
  const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000).toISOString();

  const record: CachedEvaluation = {
    queryFingerprint: fingerprint,
    category,
    queryText,
    engine,
    responseText: data.responseText,
    topCitedBrand: data.topCitedBrand,
    whyWon: data.whyWon,
    citations: data.citations,
    extractedBrands: data.extractedBrands,
    isStoreSpecific,
    expiresAt,
  };

  const sql = getDb();
  if (sql) {
    try {
      await sql`
        INSERT INTO grounding_query_cache (
          query_fingerprint, category, query_text, engine, response_text,
          top_cited_brand, why_won, citations, extracted_brands, is_store_specific,
          shop_domain, expires_at
        ) VALUES (
          ${fingerprint}, ${category}, ${queryText}, ${engine}, ${data.responseText},
          ${data.topCitedBrand}, ${data.whyWon}, ${JSON.stringify(data.citations)}::jsonb,
          ${JSON.stringify(data.extractedBrands)}::jsonb, ${isStoreSpecific},
          ${shopDomain || null}, ${expiresAt}
        )
        ON CONFLICT (query_fingerprint) DO UPDATE SET
          response_text = EXCLUDED.response_text,
          top_cited_brand = EXCLUDED.top_cited_brand,
          why_won = EXCLUDED.why_won,
          citations = EXCLUDED.citations,
          extracted_brands = EXCLUDED.extracted_brands,
          expires_at = EXCLUDED.expires_at;
      `;
      return;
    } catch (err) {
      console.warn('[Cache] DB write error, storing in memory:', err);
    }
  }

  memoryStore.queryCache.set(fingerprint, record);
}

// Brand Entity Normalization Resolver
const CANONICAL_BRAND_ALIASES: Record<string, string> = {
  'fellowproducts': 'Fellow Products',
  'fellow': 'Fellow Products',
  'breville': 'Breville',
  'baratza': 'Baratza',
  'chemex': 'Chemex',
  'aeropress': 'AeroPress',
  'bluebottle': 'Blue Bottle Coffee',
  'blue bottle': 'Blue Bottle Coffee',
  'stumptown': 'Stumptown Coffee',
  'onyx': 'Onyx Coffee Lab',
  'bellroy': 'Bellroy',
  'cuyana': 'Cuyana',
  'saddleback': 'Saddleback Leather',
  'cosrx': 'COSRX',
  'everlane': 'Everlane',
};

export function resolveCanonicalBrand(rawBrand: string, domain?: string): { name: string; domain: string } {
  const cleanName = rawBrand.trim();
  const slug = (domain || cleanName).toLowerCase().replace(/[^a-z0-9]/g, '');

  for (const [alias, canonical] of Object.entries(CANONICAL_BRAND_ALIASES)) {
    if (slug.includes(alias) || cleanName.toLowerCase().includes(alias)) {
      const canonicalSlug = canonical.toLowerCase().replace(/[^a-z0-9]/g, '');
      return {
        name: canonical,
        domain: domain || `${canonicalSlug}.com`,
      };
    }
  }

  return {
    name: cleanName,
    domain: domain || `${slug}.com`,
  };
}
