import { ShopifyGraphQLService } from '../services/shopify-graphql';
import {
  GeoSearchSimulator,
  GeoAuditScorer,
  GeoFaqGenerator,
  GeoSchemaGenerator,
} from '@shopify-geo/core-engine';

declare const process: { env: Record<string, string | undefined> };

export async function runLiveStoreSync(shopDomain: string, accessToken: string) {
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║        🌐 LIVE STORE SHOPIFY GRAPHQL INGESTION & METAFIELD SYNC             ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');
  console.log(`🔗 Target Store: ${shopDomain}\n`);

  const client = new ShopifyGraphQLService({
    shop: shopDomain,
    accessToken: accessToken,
  });

  const simulator = new GeoSearchSimulator({ provider: 'perplexity' });

  try {
    console.log('📥 Fetching product catalog from Shopify GraphQL Admin API...');
    const products = await client.fetchProducts(20);
    console.log(`✅ Retrieved ${products.length} products from live store.\n`);

    if (products.length === 0) {
      console.log('⚠️ No products found in store. Please import sample products via CSV.');
      return;
    }

    for (const product of products) {
      console.log(`──────────────────────────────────────────────────────────────────────────────`);
      console.log(`🔍 Processing: ${product.title} (${product.handle})`);

      // 1. Generate & run simulations
      const queries = simulator.generateTargetQueries(product);
      const simulations = await Promise.all(queries.map((q) => simulator.executeSimulation(q, product)));

      // 2. Score
      const audit = GeoAuditScorer.calculateAuditScore(product, simulations);
      console.log(`   • Baseline AI Citation Score: ${audit.overallScore}/100`);

      // 3. Generate optimized RAG schema and FAQs
      const faqs = GeoFaqGenerator.generateHighInfoGainFaqs(product);
      const schema = GeoSchemaGenerator.generateProductJsonLd(product, faqs);

      // 4. Sync to Shopify Metafields
      console.log('   ⚡ Writing RAG JSON-LD & FAQ Metafields to Shopify GraphQL API...');
      await client.syncProductMetafields(product.shopifyId, schema);
      console.log('   🎉 Successfully injected into: geo_engine.structured_data & geo_engine.faq_data');
    }

    console.log('\n══════════════════════════════════════════════════════════════════════════════');
    console.log('🎉 Live Store Sync Complete! Storefront is now optimized for AI search engines.');
    console.log('══════════════════════════════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('❌ Live Store Sync Error:', error);
  }
}

// CLI entry point
const domain = process.env.SHOPIFY_SHOP_DOMAIN || 'quickstart-c01718bf.myshopify.com';
const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || '';

if (token) {
  runLiveStoreSync(domain, token).catch(console.error);
} else {
  console.log(`💡 Usage: SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxx npm run store:sync`);
}
