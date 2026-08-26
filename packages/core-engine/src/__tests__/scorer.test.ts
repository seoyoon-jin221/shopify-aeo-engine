import { ProductCatalogItem } from '@shopify-geo/shared-types';
import {
  GeoSearchSimulator,
  GeoAuditScorer,
  GeoFaqGenerator,
  GeoSchemaGenerator,
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

async function runTests() {
  console.log('🧪 Running Core GEO Engine Unit Tests...\n');

  // Test 1: Query generation
  const dummyProduct: ProductCatalogItem = {
    id: 'prod_123',
    shopifyId: 'gid://shopify/Product/123',
    title: 'Centella Calming Barrier Serum',
    handle: 'centella-calming-barrier-serum',
    description: 'A soothing serum enriched with 80% Centella Asiatica for skin barrier repair.',
    vendor: 'Seoul Glow',
    productType: 'Serum',
    tags: ['barrier repair', 'centella', 'sensitive skin'],
    variants: [
      {
        id: 'var_1',
        title: '50ml',
        price: '24.00',
        availableForSale: true,
        selectedOptions: [{ name: 'Size', value: '50ml' }],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const simulator = new GeoSearchSimulator({ provider: 'perplexity' });
  const queries = simulator.generateTargetQueries(dummyProduct);
  assertEqual(queries.length, 4, 'Should generate 4 intent-based buyer queries');
  assertTrue(queries[0].queryText.includes('Serum'), 'Query should include category');
  console.log('  ✅ Test 1 Passed: GeoSearchSimulator query generation');

  // Test 2: Scoring algorithm
  const simulations = await Promise.all(queries.map((q) => simulator.executeSimulation(q, dummyProduct)));
  const audit = GeoAuditScorer.calculateAuditScore(dummyProduct, simulations);
  assertTrue(audit.overallScore >= 0 && audit.overallScore <= 100, 'Score should be bounded 0-100');
  assertTrue(audit.recommendedActions.length > 0, 'Should generate recommendations');
  console.log(`  ✅ Test 2 Passed: GeoAuditScorer computed score (${audit.overallScore}/100)`);

  // Test 3: Schema generation
  const faqs = GeoFaqGenerator.generateHighInfoGainFaqs(dummyProduct);
  const schema = GeoSchemaGenerator.generateProductJsonLd(dummyProduct, faqs);
  assertEqual(schema.productId, 'prod_123', 'Schema should match product ID');
  assertEqual(schema.metafieldPayload.namespace, 'geo_engine', 'Metafield namespace check');
  assertEqual(schema.metafieldPayload.key, 'structured_data', 'Metafield key check');
  assertTrue(schema.metafieldPayload.value.includes('Product'), 'Value should contain Product entity');
  assertTrue(schema.metafieldPayload.value.includes('FAQPage'), 'Value should contain FAQPage entity');
  console.log('  ✅ Test 3 Passed: GeoSchemaGenerator generated valid Product + FAQ graph');

  console.log('\n🎉 All Core Engine tests passed successfully!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
});
