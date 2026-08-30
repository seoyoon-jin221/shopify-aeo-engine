declare const process: any;

export interface ProductInputPayload {
  productTitle: string;
  category: string;
  vendor: string;
  price?: number;
  tags: string[];
  description?: string;
}

export interface SynthesizedQuery {
  id: string;
  intentArchetype: string;
  intentDescription: string;
  queryText: string;
  targetedFeatures: string[];
}

export class SmartQueryOrchestrator {
  /**
   * Synthesizes 5 natural, organic, high-intent conversational buyer queries tailored to the product's value proposition
   */
  public static async synthesizeBuyerQueries(
    product: ProductInputPayload
  ): Promise<SynthesizedQuery[]> {
    const title = product.productTitle || 'Featured Product';
    const category = product.category || 'Specialty Goods';
    const tag1 = product.tags?.[0] || 'premium quality';
    const tag2 = product.tags?.[1] || 'durable';

    // If an OpenAI or Gemini key is available, use LLM to dynamically generate organic queries
    const apiKey = typeof process !== 'undefined' ? (process.env?.OPENAI_API_KEY || process.env?.GEMINI_API_KEY) : undefined;
    if (apiKey) {
      try {
        const llmQueries = await this.generateWithLlm(apiKey, product);
        if (llmQueries && llmQueries.length === 5) {
          return llmQueries;
        }
      } catch (err: any) {
        console.warn('[SmartQueryOrchestrator] LLM synthesis fallback:', err.message);
      }
    }

    // Heuristic Multi-Intent Synthesis Engine
    return [
      {
        id: 'q1',
        intentArchetype: 'Unbranded Organic Problem-Solving',
        intentDescription: 'Shopper searching for top-rated solutions without specifying a brand name.',
        queryText: `What are the best ${category} products for ${tag1} and ${tag2} in 2026?`,
        targetedFeatures: [tag1, tag2],
      },
      {
        id: 'q2',
        intentArchetype: 'Technical Specification & Material Tradeoff',
        intentDescription: 'High-intent technical buyer comparing active ingredients or material build quality.',
        queryText: `Top recommended ${category} made with authentic ${tag1} and verified high customer ratings?`,
        targetedFeatures: [tag1, 'verified reviews'],
      },
      {
        id: 'q3',
        intentArchetype: 'Purchase Assurance & Risk Reversal',
        intentDescription: 'Buyer seeking peace of mind through return policies and satisfaction guarantees.',
        queryText: `Best ${category} brands offering verified 30-day money-back guarantee with free returns?`,
        targetedFeatures: ['return policy', 'satisfaction guarantee'],
      },
      {
        id: 'q4',
        intentArchetype: 'Community & Reddit Consensus',
        intentDescription: 'Buyer researching authentic peer reviews and enthusiast discussions.',
        queryText: `Is ${product.vendor} ${title} worth buying? Reddit review summary and top market alternatives`,
        targetedFeatures: ['reddit sentiment', 'peer comparison'],
      },
      {
        id: 'q5',
        intentArchetype: 'Use-Case & Buyer Persona',
        intentDescription: 'Buyer searching for optimal recommendation for a specific lifestyle or use-case.',
        queryText: `Best ${category} for ${tag2} recommended by experts and verified owners`,
        targetedFeatures: [tag2, 'expert consensus'],
      },
    ];
  }

  private static async generateWithLlm(apiKey: string, product: ProductInputPayload): Promise<SynthesizedQuery[] | null> {
    const prompt = `You are an AI Search Query Synthesizer. For a merchant selling "${product.productTitle}" in category "${product.category}" with tags "${product.tags.join(', ')}", synthesize exactly 5 distinct, natural conversational buyer queries that real shoppers type into Perplexity or ChatGPT.
Return ONLY valid JSON array with objects containing: "id" (q1..q5), "intentArchetype", "intentDescription", "queryText", "targetedFeatures" (array of strings).`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    });

    if (res.ok) {
      const data: any = await res.json();
      const content = JSON.parse(data.choices?.[0]?.message?.content || '{}');
      const queries = content.queries || content.items || Object.values(content)[0];
      if (Array.isArray(queries) && queries.length === 5) {
        return queries;
      }
    }
    return null;
  }
}
