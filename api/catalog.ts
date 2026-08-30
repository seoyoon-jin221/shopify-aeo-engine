import type { VercelRequest, VercelResponse } from '@vercel/node';

export interface CatalogProductItem {
  id: string;
  title: string;
  productType: string;
  vendor: string;
  tags: string[];
  price: string;
  currencyCode: string;
  hasStructuredData: boolean;
  hasFaqData: boolean;
  hasReviews: boolean;
  aiReadinessScore: number;
  status: 'OPTIMIZED' | 'PARTIAL' | 'UNPROTECTED';
  updatedAt?: string;
}

export interface CatalogResponse {
  success: boolean;
  shopDomain: string;
  planTier: string;
  totalProducts: number;
  protectedProductsCount: number;
  productLimit: number;
  products: CatalogProductItem[];
  error?: string;
}

const TIER_LIMITS: Record<string, number> = {
  FREE_TRIAL: 5,
  STARTER: 10,
  GROWTH: 50,
  SCALE: 99999,
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const shopDomain =
      (req.query.shop as string) ||
      (req.body && req.body.shopDomain) ||
      'quickstart-c01718bf.myshopify.com';
    const cleanDomain = shopDomain.replace('https://', '').replace(/\/$/, '');
    const accessToken =
      process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ||
      (req.headers['x-shopify-access-token'] as string);

    const planTier = (req.query.planTier as string) || (req.body && req.body.planTier) || 'FREE_TRIAL';
    const productLimit = TIER_LIMITS[planTier] || 5;

    let products: CatalogProductItem[] = [];

    if (accessToken) {
      const endpoint = `https://${cleanDomain}/admin/api/2026-01/graphql.json`;
      const query = `
        {
          shop {
            currencyCode
          }
          products(first: 50) {
            edges {
              node {
                id
                title
                productType
                vendor
                tags
                updatedAt
                variants(first: 1) {
                  edges {
                    node {
                      price
                    }
                  }
                }
                metafields(first: 20) {
                  edges {
                    node {
                      namespace
                      key
                      value
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const gqlRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
        },
        body: JSON.stringify({ query }),
      });

      if (gqlRes.ok) {
        const data: any = await gqlRes.json();
        const currency = data.data?.shop?.currencyCode || 'USD';
        const edges = data.data?.products?.edges || [];

        products = edges.map((e: any) => {
          const node = e.node;
          const metafields = (node.metafields?.edges || []).map((m: any) => m.node);
          const hasStructured = metafields.some(
            (m: any) => m.namespace === 'geo_engine' && m.key === 'structured_data'
          );
          const hasFaq = metafields.some(
            (m: any) => m.namespace === 'geo_engine' && m.key === 'faq_data'
          );
          const hasReviews = metafields.some((m: any) =>
            ['judgeme', 'yotpo', 'loox', 'reviews', 'stamped'].includes(m.namespace)
          );

          let score = 15; // Base unoptimized score
          if (hasStructured) score += 40;
          if (hasFaq) score += 25;
          if (hasReviews) score += 20;

          const status: 'OPTIMIZED' | 'PARTIAL' | 'UNPROTECTED' =
            score >= 80 ? 'OPTIMIZED' : score >= 40 ? 'PARTIAL' : 'UNPROTECTED';

          const price = node.variants?.edges?.[0]?.node?.price || '0.00';

          return {
            id: node.id,
            title: node.title,
            productType: node.productType || 'Specialty Goods',
            vendor: node.vendor || cleanDomain,
            tags: node.tags || [],
            price: `$${price}`,
            currencyCode: currency,
            hasStructuredData: hasStructured,
            hasFaqData: hasFaq,
            hasReviews,
            aiReadinessScore: Math.min(score, 100),
            status,
            updatedAt: node.updatedAt,
          };
        });
      }
    }

    // Fallback sample catalog if no Shopify token is configured (for local testing and sandbox preview)
    if (products.length === 0) {
      products = [
        {
          id: 'gid://shopify/Product/101',
          title: 'Precision Pour-Over Gooseneck Kettle (Variable Temp)',
          productType: 'Coffee Equipment',
          vendor: 'AeroCraft Studio',
          tags: ['pour over', 'temperature control', 'matte black'],
          price: '$165.00',
          currencyCode: 'USD',
          hasStructuredData: true,
          hasFaqData: true,
          hasReviews: true,
          aiReadinessScore: 94,
          status: 'OPTIMIZED',
        },
        {
          id: 'gid://shopify/Product/102',
          title: 'Full-Grain Artisan Leather Tote (Cognac)',
          productType: 'Leather Goods',
          vendor: 'Heritage Workshop',
          tags: ['full-grain leather', 'brass hardware', 'lifetime warranty'],
          price: '$285.00',
          currencyCode: 'USD',
          hasStructuredData: false,
          hasFaqData: false,
          hasReviews: false,
          aiReadinessScore: 18,
          status: 'UNPROTECTED',
        },
        {
          id: 'gid://shopify/Product/103',
          title: 'Centrifuge Conical Burr Coffee Grinder (40mm)',
          productType: 'Coffee Equipment',
          vendor: 'AeroCraft Studio',
          tags: ['stainless steel', 'stepless adjustment'],
          price: '$195.00',
          currencyCode: 'USD',
          hasStructuredData: false,
          hasFaqData: false,
          hasReviews: false,
          aiReadinessScore: 22,
          status: 'UNPROTECTED',
        },
        {
          id: 'gid://shopify/Product/104',
          title: 'Snail Mucin Deep Hydration Peptide Serum (100ml)',
          productType: 'Skincare',
          vendor: 'Lumiere Labs',
          tags: ['hyaluronic acid', 'cruelty-free', 'clean beauty'],
          price: '$38.00',
          currencyCode: 'USD',
          hasStructuredData: false,
          hasFaqData: false,
          hasReviews: false,
          aiReadinessScore: 15,
          status: 'UNPROTECTED',
        },
        {
          id: 'gid://shopify/Product/105',
          title: 'Minimalist Bifold Travel Passport Wallet',
          productType: 'Leather Goods',
          vendor: 'Heritage Workshop',
          tags: ['RFID blocking', 'vegetable tanned'],
          price: '$65.00',
          currencyCode: 'USD',
          hasStructuredData: false,
          hasFaqData: false,
          hasReviews: false,
          aiReadinessScore: 18,
          status: 'UNPROTECTED',
        },
      ];
    }

    const protectedCount = products.filter((p) => p.hasStructuredData).length;

    res.status(200).json({
      success: true,
      shopDomain: cleanDomain,
      planTier,
      totalProducts: products.length,
      protectedProductsCount: protectedCount,
      productLimit,
      products,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: errMsg });
  }
}
