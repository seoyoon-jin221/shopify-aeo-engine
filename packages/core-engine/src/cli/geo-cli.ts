import { ProductCatalogItem, GeoAuditScore, GeoGeneratedSchema } from '@shopify-geo/shared-types';
import {
  GeoSearchSimulator,
  GeoAuditScorer,
  GeoFaqGenerator,
  GeoSchemaGenerator,
} from '../index';

declare const process: { argv: string[] };

export class GeoCommandLineRunner {
  private products: ProductCatalogItem[];
  private simulator: GeoSearchSimulator;

  constructor(products?: ProductCatalogItem[]) {
    this.products = products || this.getDefaultCatalog();
    this.simulator = new GeoSearchSimulator({ provider: 'perplexity' });
  }

  public async runAudit(): Promise<Map<string, GeoAuditScore>> {
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║    🔍 AEO ENGINE: ANSWER ENGINE OPTIMIZATION & AI CITATION AUDIT             ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');
    console.log(`📦 Target Store Catalog: ${this.products.length} Products\n`);

    const scoreMap = new Map<string, GeoAuditScore>();

    for (const product of this.products) {
      const queries = this.simulator.generateTargetQueries(product);
      const simulations = await Promise.all(
        queries.map((q) => this.simulator.executeSimulation(q, product))
      );
      const audit = GeoAuditScorer.calculateAuditScore(product, simulations);
      scoreMap.set(product.id, audit);

      const tone = audit.overallScore >= 80 ? '🟢' : audit.overallScore >= 50 ? '🟡' : '🔴';
      console.log(`──────────────────────────────────────────────────────────────────────────────`);
      console.log(`${tone} [${audit.overallScore}/100] ${product.title} (${product.vendor})`);
      console.log(`   • Citations: ${audit.breakdown.brandCitationRate}/30 | Entity Depth: ${audit.breakdown.entityCompleteness}/25 | Info Gain: ${audit.breakdown.informationGainScore}/25 | Schema: ${audit.breakdown.structuredDataReadiness}/20`);
      
      if (audit.keyMissingEntities.length > 0) {
        console.log(`   ⚠️ Critical Gaps: ${audit.keyMissingEntities.slice(0, 2).join(' | ')}`);
      }
    }

    const avgScore = Math.round(
      Array.from(scoreMap.values()).reduce((acc, s) => acc + s.overallScore, 0) / scoreMap.size
    );

    console.log(`\n══════════════════════════════════════════════════════════════════════════════`);
    console.log(`📊 OVERALL STORE AEO CITATION READINESS: ${avgScore} / 100`);
    console.log(`══════════════════════════════════════════════════════════════════════════════\n`);
    return scoreMap;
  }

  public async runSync(): Promise<GeoGeneratedSchema[]> {
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║    ⚡ AEO ENGINE: AUTO-INJECTING RAG SCHEMA & FAQ METAVALUES                 ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

    const generatedSchemas: GeoGeneratedSchema[] = [];

    for (const product of this.products) {
      const faqs = GeoFaqGenerator.generateHighInfoGainFaqs(product);
      const schema = GeoSchemaGenerator.generateProductJsonLd(product, faqs);
      generatedSchemas.push(schema);

      console.log(`✅ [SYNCED] ${product.title}`);
      console.log(`   ├── Metafield: geo_engine.structured_data (Product + Offer + Return Policy)`);
      console.log(`   └── Metafield: geo_engine.faq_data (${faqs.length} High-Info FAQs injected)`);
    }

    console.log(`\n══════════════════════════════════════════════════════════════════════════════`);
    console.log(`🎉 100% of Catalog Synced! Metafield payloads ready for Liquid Theme Extension.`);
    console.log(`══════════════════════════════════════════════════════════════════════════════\n`);
    return generatedSchemas;
  }

  private getDefaultCatalog(): ProductCatalogItem[] {
    return [
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
      {
        id: 'prod_sun_04',
        shopifyId: 'gid://shopify/Product/1004',
        title: 'Birch Relief Daily Sunscreen SPF 50+',
        handle: 'birch-relief-daily-sunscreen-spf50',
        description: 'Moisturizing chemical sunscreen with broad-spectrum SPF 50+ PA++++. Formulated with Inje Birch Sap and Niacinamide.',
        vendor: 'Seoul Glow',
        productType: 'Sunscreen',
        tags: ['sunscreen', 'spf50', 'zero white cast', 'birch juice'],
        variants: [
          { id: 'var_5', title: '50ml', price: '20.00', availableForSale: true, selectedOptions: [{ name: 'Size', value: '50ml' }] },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'prod_rice_05',
        shopifyId: 'gid://shopify/Product/1005',
        title: 'Rice Ceramide Barrier Moisture Cream',
        handle: 'rice-ceramide-barrier-cream',
        description: 'Rich, non-comedogenic barrier relief cream powered by Rice Bran Extract and 5-Ceramide Complex (EOP, NS, NP, AS, AP).',
        vendor: 'K-Hydra',
        productType: 'Moisturizer',
        tags: ['barrier cream', 'ceramides', 'dry skin', 'rice water'],
        variants: [
          { id: 'var_6', title: '80ml', price: '28.00', availableForSale: true, selectedOptions: [{ name: 'Size', value: '80ml' }] },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }
}

// CLI Command execution
const mode = (typeof process !== 'undefined' && process.argv && process.argv[2]) || 'audit';
const runner = new GeoCommandLineRunner();

if (mode === 'sync') {
  runner.runSync().catch(console.error);
} else {
  runner.runAudit().catch(console.error);
}
