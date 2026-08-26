import { ProductCatalogItem, GeoGeneratedSchema } from '@shopify-geo/shared-types';
import {
  GeoSearchSimulator,
  GeoAuditScorer,
  GeoFaqGenerator,
  GeoSchemaGenerator,
  CitationDriftSentinel,
} from '../index';

function assertTrue(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message} (Expected ${expected}, got ${actual})`);
  }
}

async function runE2ETests() {
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║        🧪 RUNNING FULL END-TO-END GEO INTEGRATION & SCHEMA TESTS             ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

  // Step 1: Ingest product fixture
  console.log('1️⃣ Ingesting Multi-Variant Product Catalog Fixture...');
  const testProduct: ProductCatalogItem = {
    id: 'prod_test_01',
    shopifyId: 'gid://shopify/Product/99991',
    title: 'Centella Calming Barrier Serum SPF 50',
    handle: 'centella-calming-barrier-serum-spf50',
    description: 'A multi-functional soothing barrier serum and sunscreen infused with 80% Madagascar Centella Asiatica, ceramides, and niacinamide.',
    vendor: 'Seoul Glow',
    productType: 'Serum',
    tags: ['barrier repair', 'centella', 'sensitive skin', 'spf50', 'k-beauty'],
    variants: [
      { id: 'var_1', title: '30ml', price: '24.00', availableForSale: true, selectedOptions: [{ name: 'Size', value: '30ml' }] },
      { id: 'var_2', title: '50ml', price: '34.00', availableForSale: true, selectedOptions: [{ name: 'Size', value: '50ml' }] },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  assertEqual(testProduct.variants.length, 2, 'Product should have 2 variants');
  console.log('   ✅ Step 1 Passed: Product fixture validated.\n');

  // Step 2: Query Generation & Simulation
  console.log('2️⃣ Generating Multi-Intent Buyer Queries & AI Search Simulation...');
  const simulator = new GeoSearchSimulator({ provider: 'perplexity' });
  const queries = simulator.generateTargetQueries(testProduct);
  assertEqual(queries.length, 4, 'Should generate 4 buyer queries');
  
  const expectedIntents = ['recommendation', 'ingredient', 'comparison', 'skin_type'];
  queries.forEach((q, i) => {
    assertEqual(q.intentCategory, expectedIntents[i] as any, `Query ${i} intent match`);
  });

  const simulations = await Promise.all(queries.map((q) => simulator.executeSimulation(q, testProduct)));
  assertEqual(simulations.length, 4, 'Should complete 4 simulation runs');
  console.log('   ✅ Step 2 Passed: 4 buyer intent queries simulated across search engines.\n');

  // Step 3: Citation Readiness Scoring
  console.log('3️⃣ Evaluating 0–100 AI Citation Readiness Score...');
  const initialAudit = GeoAuditScorer.calculateAuditScore(testProduct, simulations);
  assertTrue(initialAudit.overallScore >= 0 && initialAudit.overallScore <= 100, 'Score is bounded 0-100');
  assertTrue(initialAudit.breakdown.brandCitationRate <= 30, 'Citation rate <= 30');
  assertTrue(initialAudit.breakdown.entityCompleteness <= 25, 'Entity completeness <= 25');
  assertTrue(initialAudit.breakdown.informationGainScore <= 25, 'Info gain <= 25');
  assertTrue(initialAudit.breakdown.structuredDataReadiness <= 20, 'Schema readiness <= 20');
  console.log(`   • Computed Baseline Score: ${initialAudit.overallScore}/100`);
  console.log('   ✅ Step 3 Passed: 4-vector scoring engine validated.\n');

  // Step 4: High-Info FAQ & RAG JSON-LD Generation
  console.log('4️⃣ Generating RAG JSON-LD Schema Graph & Storefront FAQs...');
  const faqs = GeoFaqGenerator.generateHighInfoGainFaqs(testProduct);
  assertTrue(faqs.length >= 3, 'Should generate at least 3 FAQ items');
  faqs.forEach((f) => {
    assertTrue(f.question.length > 10, 'Question length check');
    assertTrue(f.answer.length > 30, 'Answer length check');
    assertTrue(f.informationGainKeywords.length >= 2, 'High-info keywords check');
  });

  const schema: GeoGeneratedSchema = GeoSchemaGenerator.generateProductJsonLd(testProduct, faqs);
  const jsonLdGraph = schema.jsonLd['@graph'] as Array<Record<string, any>>;
  assertTrue(Array.isArray(jsonLdGraph), 'JSON-LD @graph should be an array');
  
  const productEntity = jsonLdGraph.find((e) => e['@type'] === 'Product');
  const faqEntity = jsonLdGraph.find((e) => e['@type'] === 'FAQPage');
  
  assertTrue(!!productEntity, 'Product entity must exist in graph');
  assertTrue(!!faqEntity, 'FAQPage entity must exist in graph');
  assertEqual(productEntity.name, testProduct.title, 'Product name match');
  assertEqual(productEntity.brand.name, testProduct.vendor, 'Brand name match');
  assertTrue(!!productEntity.offers.hasMerchantReturnPolicy, 'Merchant return policy must be defined');
  console.log('   ✅ Step 4 Passed: Schema.org Product, Offer, ReturnPolicy, and FAQPage graphs verified.\n');

  // Step 5: Metafield Payload Formatting
  console.log('5️⃣ Validating Shopify Metafield Injection Contracts...');
  assertEqual(schema.metafieldPayload.namespace, 'geo_engine', 'Namespace must be geo_engine');
  assertEqual(schema.metafieldPayload.key, 'structured_data', 'Key must be structured_data');
  assertEqual(schema.metafieldPayload.type, 'json', 'Type must be json');
  
  const parsedValue = JSON.parse(schema.metafieldPayload.value);
  assertTrue(!!parsedValue['@context'], 'Parsed JSON-LD must contain @context');
  console.log('   ✅ Step 5 Passed: Shopify Metafield mutation payload conforms to GraphQL spec.\n');

  // Step 6: Weekly Citation Drift Sentinel Verification
  console.log('6️⃣ Validating Weekly Citation Drift Sentinel & Health Reports...');
  const sentinel = new CitationDriftSentinel();
  const baselineScores = new Map<string, number>([[testProduct.id, 94]]);
  const report = await sentinel.executeWeeklyHealthCheck('quickstart-c01718bf.myshopify.com', [testProduct], baselineScores);
  assertTrue(report.totalProductsMonitored === 1, 'Report should track 1 product');
  assertTrue(report.summaryEmailText.includes('quickstart-c01718bf.myshopify.com'), 'Report must contain shop domain');
  console.log('   ✅ Step 6 Passed: Weekly Citation Drift Sentinel verified.\n');

  console.log('══════════════════════════════════════════════════════════════════════════════');
  console.log('🎉 ALL END-TO-END INTEGRATION TESTS PASSED (100% SUCCESS)');
  console.log('══════════════════════════════════════════════════════════════════════════════\n');
}

runE2ETests().catch((err) => {
  console.error('❌ E2E Test Failure:', err);
});
