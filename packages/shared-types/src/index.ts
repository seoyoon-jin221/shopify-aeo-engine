/**
 * Core Data Models & Contracts for Shopify GEO Engine
 */

export interface ProductCatalogItem {
  id: string;
  shopifyId: string;
  title: string;
  handle: string;
  description: string;
  descriptionHtml?: string;
  vendor: string;
  productType: string;
  tags: string[];
  variants: ProductVariant[];
  metafields?: Record<string, string>;
  featuredImageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  title: string;
  price: string;
  compareAtPrice?: string;
  sku?: string;
  availableForSale: boolean;
  selectedOptions: { name: string; value: string }[];
}

export type LLMProvider = 'perplexity' | 'openai_search' | 'gemini_search' | 'anthropic';

export interface SimulationQuery {
  id: string;
  queryText: string;
  intentCategory: 'ingredient' | 'skin_type' | 'use_case' | 'comparison' | 'recommendation';
  targetCategory: string;
}

export interface SimulationResult {
  queryId: string;
  queryText: string;
  provider: LLMProvider;
  rawResponseText: string;
  citedDomains: string[];
  isBrandCited: boolean;
  isProductCited: boolean;
  brandRankPosition?: number;
  extractedKeyAttributes: string[];
  competitorsMentioned: string[];
  confidenceScore: number;
  timestamp: string;
}

export interface GeoAuditScore {
  productId: string;
  overallScore: number; // 0 to 100
  breakdown: {
    brandCitationRate: number;        // 0 to 30 pts: Frequency of brand citations across query variations
    entityCompleteness: number;       // 0 to 25 pts: Depth of ingredients, specs, usage, certifications
    informationGainScore: number;     // 0 to 25 pts: Unique FAQ/Q&A, clinical claims, comparative clarity
    structuredDataReadiness: number;  // 0 to 20 pts: Valid JSON-LD Rich Snippet, MerchantReturnPolicy, FAQ schema
  };
  keyMissingEntities: string[];
  topCompetitorThreats: string[];
  recommendedActions: GeoRecommendedAction[];
  generatedAt: string;
}

export interface GeoRecommendedAction {
  id: string;
  type: 'schema_injection' | 'faq_addition' | 'entity_enrichment' | 'metafield_sync';
  title: string;
  description: string;
  impactScore: number; // 1 to 10
  automatedFixAvailable: boolean;
  payload?: Record<string, unknown>;
}

export interface GeoGeneratedSchema {
  productId: string;
  jsonLd: Record<string, unknown>;
  faqItems: Array<{ question: string; answer: string; informationGainKeywords: string[] }>;
  metafieldPayload: {
    namespace: 'geo_engine';
    key: 'structured_data';
    value: string;
    type: 'json';
  };
}

export interface ShopifyWebhookGDPRPayload {
  shop_id: number;
  shop_domain: string;
  customer?: {
    id: number;
    email: string;
    phone?: string;
  };
  orders_to_redact?: number[];
  orders_requested?: number[];
}
