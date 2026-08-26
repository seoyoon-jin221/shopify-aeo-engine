import { ProductCatalogItem } from '@shopify-geo/shared-types';
import {
  GeoSearchSimulator,
  GeoAuditScorer,
  GeoFaqGenerator,
  GeoSchemaGenerator,
} from '../index';

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║        🚀 GEOSYNC: AI SEARCH & CITATION AUDIT DEMO RUNNER           ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  // Load sample K-Beauty catalog
  const sampleProducts: ProductCatalogItem[] = [
    {
      id: 'prod_centella_01',
      shopifyId: 'gid://shopify/Product/1001',
      title: 'Centella Calming Barrier Serum',
      handle: 'centella-calming-barrier-serum',
      description: 'A fast-absorbing, barrier-restoring serum formulated with 80% Madagascar Centella Asiatica extract, panthenol, and triple hyaluronic acid.',
      vendor: 'Seoul Glow',
      productType: 'Serum',
      tags: ['barrier repair', 'centella', 'sensitive skin', 'calming'],
      variants: [
        { id: 'var_1', title: '30ml', price: '22.00', availableForSale: true, selectedOptions: [{ name: 'Size', value: '30ml' }] },
        { id: 'var_2', title: '50ml', price: '32.00', availableForSale: true, selectedOptions: [{ name: 'Size', value: '50ml' }] },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'prod_hydra_02',
      shopifyId: 'gid://shopify/Product/1002',
      title: 'Hyaluronic Deep Hydra Toner',
      handle: 'hyaluronic-deep-hydra-toner',
      description: 'Intensive hydration toner featuring 5 molecular weights of Hyaluronic Acid and Birch Juice.',
      vendor: 'K-Hydra',
      productType: 'Toner',
      tags: ['hydrating', 'dry skin', 'hyaluronic acid'],
      variants: [
        { id: 'var_3', title: '200ml', price: '18.00', availableForSale: true, selectedOptions: [{ name: 'Size', value: '200ml' }] },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'prod_snail_03',
      shopifyId: 'gid://shopify/Product/1003',
      title: 'Snail Peptide Repair Essence',
      handle: 'snail-peptide-repair-essence',
      description: 'Lightweight dual essence infused with 96% Advanced Snail Secretion Filtrate and 5-Peptide Complex to accelerate skin elasticity.',
      vendor: 'Radiant Seoul',
      productType: 'Essence',
      tags: ['snail mucin', 'anti-aging', 'peptides'],
      variants: [
        { id: 'var_4', title: '100ml', price: '24.00', availableForSale: true, selectedOptions: [{ name: 'Size', value: '100ml' }] },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  console.log(`📦 Loaded ${sampleProducts.length} K-Beauty products for simulation audit.\n`);

  const simulator = new GeoSearchSimulator({ provider: 'perplexity' });

  for (const product of sampleProducts) {
    console.log(`────────────────────────────────────────────────────────────────────────`);
    console.log(`🔍 AUDITING PRODUCT: ${product.title} (${product.vendor})`);
    console.log(`────────────────────────────────────────────────────────────────────────`);

    // 1. Generate target queries
    const queries = simulator.generateTargetQueries(product);
    console.log(`  Target AI Search Queries (${queries.length}):`);
    queries.forEach((q, i) => console.log(`    ${i + 1}. [${q.intentCategory.toUpperCase()}] "${q.queryText}"`));

    // 2. Simulate search responses
    const simulations = await Promise.all(queries.map((q) => simulator.executeSimulation(q, product)));

    // 3. Compute baseline score
    const audit = GeoAuditScorer.calculateAuditScore(product, simulations);
    console.log(`\n  📊 INITIAL AI CITATION READINESS SCORE: ${audit.overallScore} / 100`);
    console.log(`     • Brand Citation Rate:     ${audit.breakdown.brandCitationRate} / 30`);
    console.log(`     • Entity Depth:            ${audit.breakdown.entityCompleteness} / 25`);
    console.log(`     • Information Gain:        ${audit.breakdown.informationGainScore} / 25`);
    console.log(`     • Schema Readiness:        ${audit.breakdown.structuredDataReadiness} / 20`);

    if (audit.keyMissingEntities.length > 0) {
      console.log(`\n  ⚠️ Critical Missing Entities Detected by AI Crawlers:`);
      audit.keyMissingEntities.forEach((m) => console.log(`     - ${m}`));
    }

    // 4. Generate 1-Click Optimization
    console.log(`\n  ⚡ APPLYING 1-CLICK RAG OPTIMIZATION (Generating Schema + High-Info FAQs)...`);
    const faqs = GeoFaqGenerator.generateHighInfoGainFaqs(product);
    const optimizedSchema = GeoSchemaGenerator.generateProductJsonLd(product, faqs);

    // Re-score with optimized metafield
    const optimizedProduct: ProductCatalogItem = {
      ...product,
      description: `${product.description} Clinically proven non-comedogenic formulation suitable for sensitive skin. Step-by-step directions included.`,
      metafields: {
        'geo_engine.structured_data': optimizedSchema.metafieldPayload.value,
      },
    };

    const postAudit = GeoAuditScorer.calculateAuditScore(optimizedProduct, simulations);
    console.log(`  🎉 POST-OPTIMIZATION SCORE: ${postAudit.overallScore} / 100 (+${postAudit.overallScore - audit.overallScore} pts boost)`);
    console.log(`     • Schema Graph Generated: Product + Offer + MerchantReturnPolicy + FAQPage`);
    console.log(`     • Metafield Key: geo_engine.structured_data (Ready for Liquid Injection)\n`);
  }

  console.log('════════════════════════════════════════════════════════════════════════');
  console.log('✅ Audit & Optimization Demo Completed Successfully!');
  console.log('════════════════════════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('Demo error:', err);
});
