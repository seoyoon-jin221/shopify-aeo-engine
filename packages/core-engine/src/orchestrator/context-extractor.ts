import { ProductCatalogItem } from '@shopify-geo/shared-types';

export interface ComprehensiveShopContext {
  // 1. Shop-Level Brand Entity Context
  shop: {
    name: string;
    domain: string;
    myshopifyDomain: string;
    currencyCode: string;
    countryCode: string;
    contactEmail?: string;
    brandMissionStatement?: string;
    policies: {
      returnPolicyText?: string;
      returnWindowDays?: number;
      isFreeReturnShipping?: boolean;
      shippingPolicyText?: string;
      privacyPolicyText?: string;
    };
  };

  // 2. Comprehensive Product Entity Graph
  catalogSummary: {
    totalActiveProducts: number;
    primaryProductTypes: string[];
    dominantPriceRange: { min: number; max: number; currency: string };
    allUniqueTags: string[];
    topCollections: string[];
  };

  // 3. Deep Ingested Product Records
  products: DeepProductContext[];
}

export interface DeepProductContext extends ProductCatalogItem {
  shopifyStandardCategory?: string;
  collections?: string[];
  options?: Array<{ name: string; values: string[] }>;
  clinicalClaimsAndSpecs?: {
    materialsOrIngredients: string[];
    certifications: string[];
    usageInstructions?: string;
    targetPersonaOrSkinType?: string;
  };
}

export class ShopifyContextExtractor {
  /**
   * Transforms raw Shopify GraphQL Admin API responses into a unified deep context graph
   */
  public static extractComprehensiveContext(
    rawShopData: any,
    rawProducts: any[]
  ): ComprehensiveShopContext {
    const shopName = rawShopData?.name || 'Your Store';
    const shopDomain = rawShopData?.primaryDomain?.url || rawShopData?.myshopifyDomain || 'quickstart-c01718bf.myshopify.com';

    // Parse Shop Policies
    const returnPolicy = rawShopData?.shopPolicies?.find((p: any) => p.type === 'REFUND_POLICY')?.body || '';
    const returnWindowDays = this.extractReturnWindowDays(returnPolicy);
    const isFreeReturnShipping = returnPolicy.toLowerCase().includes('free return') || returnPolicy.toLowerCase().includes('prepaid label');

    const deepProducts: DeepProductContext[] = (rawProducts || []).map((p: any) => {
      const desc = p.description || p.descriptionHtml || '';
      const tags = Array.isArray(p.tags) ? p.tags : (p.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean);
      
      return {
        id: p.id || 'gid://shopify/Product/1',
        shopifyId: p.id || 'gid://shopify/Product/1',
        title: p.title || 'Featured Product',
        handle: p.handle || 'featured-product',
        description: desc,
        vendor: p.vendor || shopName,
        productType: p.productType || 'Specialty Goods',
        tags,
        shopifyStandardCategory: p.category?.name || p.productType || 'Specialty Goods',
        collections: p.collections?.edges?.map((c: any) => c.node.title) || [],
        variants: p.variants?.edges?.map((v: any) => ({
          id: v.node.id,
          shopifyVariantId: v.node.id,
          title: v.node.title,
          price: parseFloat(v.node.price || '0'),
          sku: v.node.sku,
          availableForSale: v.node.availableForSale ?? true,
        })) || [],
        options: p.options || [],
        clinicalClaimsAndSpecs: {
          materialsOrIngredients: this.extractMaterialsOrIngredients(desc, tags),
          certifications: this.extractCertifications(desc, tags),
          usageInstructions: this.extractUsageInstructions(desc),
          targetPersonaOrSkinType: this.extractTargetPersona(desc, tags),
        },
        metafields: p.metafields || {},
        createdAt: p.createdAt || new Date().toISOString(),
        updatedAt: p.updatedAt || new Date().toISOString(),
      };
    });

    // Compute Catalog Aggregate Metrics
    const allTags = Array.from(new Set(deepProducts.flatMap(p => p.tags)));
    const productTypes = Array.from(new Set(deepProducts.map(p => p.productType).filter(Boolean)));
    const allPrices = deepProducts.flatMap(p => p.variants.map(v => typeof v.price === 'number' ? v.price : parseFloat(String(v.price) || '0'))).filter(p => p > 0);

    return {
      shop: {
        name: shopName,
        domain: shopDomain,
        myshopifyDomain: rawShopData?.myshopifyDomain || shopDomain,
        currencyCode: rawShopData?.currencyCode || 'USD',
        countryCode: rawShopData?.billingAddress?.countryCodeV2 || 'US',
        policies: {
          returnPolicyText: returnPolicy,
          returnWindowDays,
          isFreeReturnShipping,
          shippingPolicyText: rawShopData?.shopPolicies?.find((p: any) => p.type === 'SHIPPING_POLICY')?.body || '',
          privacyPolicyText: rawShopData?.shopPolicies?.find((p: any) => p.type === 'PRIVACY_POLICY')?.body || '',
        },
      },
      catalogSummary: {
        totalActiveProducts: deepProducts.length,
        primaryProductTypes: productTypes,
        dominantPriceRange: {
          min: allPrices.length > 0 ? Math.min(...allPrices) : 0,
          max: allPrices.length > 0 ? Math.max(...allPrices) : 0,
          currency: rawShopData?.currencyCode || 'USD',
        },
        allUniqueTags: allTags,
        topCollections: Array.from(new Set(deepProducts.flatMap(p => p.collections || []))),
      },
      products: deepProducts,
    };
  }

  private static extractReturnWindowDays(policyText: string): number {
    const match = policyText.match(/(\d+)\s*(?:day|days)/i);
    return match ? parseInt(match[1], 10) : 30;
  }

  private static extractMaterialsOrIngredients(desc: string, tags: string[]): string[] {
    const specs: string[] = [];
    const lower = desc.toLowerCase();
    
    ['full-grain', 'vegetable-tanned', 'organic', 'stainless steel', '100% cotton', 'cashmere', 'silk', 'hyaluronic acid', 'niacinamide', 'ceramides', 'peptide', 'cold brew', 'single origin', 'arabica'].forEach(m => {
      if (lower.includes(m) || tags.some(t => t.toLowerCase().includes(m))) {
        specs.push(m);
      }
    });
    return specs;
  }

  private static extractCertifications(desc: string, tags: string[]): string[] {
    const certs: string[] = [];
    const lower = desc.toLowerCase();
    
    ['cruelty-free', 'vegan', 'usda organic', 'fair trade', 'gots certified', 'oeko-tex', 'fsc certified', 'dermatologist tested', 'hypoallergenic'].forEach(c => {
      if (lower.includes(c) || tags.some(t => t.toLowerCase().includes(c))) {
        certs.push(c);
      }
    });
    return certs;
  }

  private static extractUsageInstructions(desc: string): string | undefined {
    const match = desc.match(/(?:how to use|directions|application|instructions)[\s:]+([^.<>\n]{20,200})/i);
    return match ? match[1].trim() : undefined;
  }

  private static extractTargetPersona(desc: string, tags: string[]): string | undefined {
    const match = desc.match(/(?:suitable for|ideal for|designed for|recommended for)[\s:]+([^.<>\n]{10,100})/i);
    return match ? match[1].trim() : undefined;
  }
}
