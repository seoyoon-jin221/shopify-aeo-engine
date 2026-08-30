export interface LiveQueryEvaluation {
  id: string;
  dimensionId: string;
  dimensionName: string;
  dimensionIcon: string;
  queryText: string;
  engine: 'Perplexity sonar-pro' | 'Google Gemini (Search Grounding)' | 'ChatGPT (gpt-4o)';
  topCitedBrand: string;
  whyWon: string;
  sources: string[];
}

export interface Live12BenchmarkReport {
  totalQueriesTested: 12;
  baselineScore: number;
  optimizedScore: number;
  dimensionSummary: Array<{
    id: string;
    name: string;
    icon: string;
    queriesCount: 2;
    unoptimizedCitationRate: number;
    optimizedCitationRate: number;
  }>;
  evaluatedQueries: LiveQueryEvaluation[];
  topCompetitors: Array<{
    name: string;
    websiteUrl: string;
    canonicalDomain: string;
    rank: number;
    score: number;
    queriesCitedCount: number;
    totalQueriesTested: 12;
    citationShare: string;
    citationShareLabel: string;
  }>;
}

export class LiveMatrixEngine {
  /**
   * Constructs the 12 distinct buyer intent queries across all 6 core commercial dimensions
   */
  public static build12QueryTaxonomy(
    category: string,
    productTitle: string,
    vendor: string,
    tag1: string,
    tag2: string
  ): Array<{ id: string; dimensionId: string; dimensionName: string; dimensionIcon: string; queryText: string; engine: string; whyWon: string }> {
    return [
      // Dimension 1: Direct Commercial Intent (2 Queries)
      {
        id: 'q1',
        dimensionId: 'dim_commercial',
        dimensionName: 'Direct Commercial Intent',
        dimensionIcon: 'fa-cart-shopping',
        queryText: `What are the best ${category} products under $200 with fast shipping in 2026?`,
        engine: 'Perplexity sonar-pro',
        whyWon: 'Active Offer schema with real-time price & in-stock availability.',
      },
      {
        id: 'q2',
        dimensionId: 'dim_commercial',
        dimensionName: 'Direct Commercial Intent',
        dimensionIcon: 'fa-cart-shopping',
        queryText: `Where to buy authentic ${tag1} ${category} online with verified warranty?`,
        engine: 'Google Gemini (Search Grounding)',
        whyWon: 'ItemCondition & Brand identity graph indexed in Google Merchant Center.',
      },

      // Dimension 2: Material & Technical Specs (2 Queries)
      {
        id: 'q3',
        dimensionId: 'dim_specs',
        dimensionName: 'Material & Tech Specs',
        dimensionIcon: 'fa-microchip',
        queryText: `Top recommended ${category} made with authentic ${tag1} vs synthetic alternatives?`,
        engine: 'Google Gemini (Search Grounding)',
        whyWon: 'Structured additionalProperty key-value pairs specifying exact material composition.',
      },
      {
        id: 'q4',
        dimensionId: 'dim_specs',
        dimensionName: 'Material & Tech Specs',
        dimensionIcon: 'fa-microchip',
        queryText: `Lab-tested ${category} with verified durability ratings and craftsmanship specs`,
        engine: 'Perplexity sonar-pro',
        whyWon: 'Quantitative product specifications listed in JSON-LD description table.',
      },

      // Dimension 3: Problem-Solving & Persona Match (2 Queries)
      {
        id: 'q5',
        dimensionId: 'dim_persona',
        dimensionName: 'Problem-Solving & Persona',
        dimensionIcon: 'fa-user-check',
        queryText: `Best ${category} for ${tag2} recommended by daily users and professionals`,
        engine: 'ChatGPT (gpt-4o)',
        whyWon: 'Target audience and persona suitability tags embedded in schema.',
      },
      {
        id: 'q6',
        dimensionId: 'dim_persona',
        dimensionName: 'Problem-Solving & Persona',
        dimensionIcon: 'fa-user-check',
        queryText: `How to choose the right ${category} for beginners vs experienced enthusiasts?`,
        engine: 'Perplexity sonar-pro',
        whyWon: 'Detailed FAQPage schema answering beginner sizing and selection criteria.',
      },

      // Dimension 4: Assurance & Return Policy (2 Queries)
      {
        id: 'q7',
        dimensionId: 'dim_assurance',
        dimensionName: 'Assurance & Return Policy',
        dimensionIcon: 'fa-shield-halved',
        queryText: `Best ${category} brands offering 30-day money-back guarantee with free return shipping?`,
        engine: 'Perplexity sonar-pro',
        whyWon: 'MerchantReturnPolicy JSON-LD entity verified by shopping crawler.',
      },
      {
        id: 'q8',
        dimensionId: 'dim_assurance',
        dimensionName: 'Assurance & Return Policy',
        dimensionIcon: 'fa-shield-halved',
        queryText: `Direct-to-consumer ${category} stores with no-hassle return policies and lifetime warranty`,
        engine: 'Google Gemini (Search Grounding)',
        whyWon: 'Explicit returnFees, returnMethod, and applicableCountry schemas present.',
      },

      // Dimension 5: Community & Reddit Consensus (2 Queries)
      {
        id: 'q9',
        dimensionId: 'dim_community',
        dimensionName: 'Community & Reddit Consensus',
        dimensionIcon: 'fa-comments',
        queryText: `Is ${vendor} ${productTitle} worth buying? Reddit review summary and consensus`,
        engine: 'Perplexity sonar-pro',
        whyWon: 'Competitors have 4.8 star aggregateRating schema from thousands of verified reviews.',
      },
      {
        id: 'q10',
        dimensionId: 'dim_community',
        dimensionName: 'Community & Reddit Consensus',
        dimensionIcon: 'fa-comments',
        queryText: `Most recommended independent ${category} brands on Reddit and enthusiast forums`,
        engine: 'ChatGPT (gpt-4o)',
        whyWon: 'Brand entity recognized with strong backlink graph and social markup.',
      },

      // Dimension 6: Direct Rival Alternatives (2 Queries)
      {
        id: 'q11',
        dimensionId: 'dim_alternatives',
        dimensionName: 'Direct Rival Alternatives',
        dimensionIcon: 'fa-arrows-split-up-and-left',
        queryText: `High-quality direct alternatives to market leaders in ${category} with better return policy`,
        engine: 'Perplexity sonar-pro',
        whyWon: 'Direct price-point and feature parity highlighted in structured metadata.',
      },
      {
        id: 'q12',
        dimensionId: 'dim_alternatives',
        dimensionName: 'Direct Rival Alternatives',
        dimensionIcon: 'fa-arrows-split-up-and-left',
        queryText: `Top independent ${category} brand alternatives with premium craftsmanship`,
        engine: 'Google Gemini (Search Grounding)',
        whyWon: 'Multi-variant comparison table rendered in rich Liquid theme snippet.',
      },
    ];
  }
}
