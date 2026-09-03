import type { VercelRequest, VercelResponse } from './types';
import { getCachedEvaluation, setCachedEvaluation, resolveCanonicalBrand } from './lib/cache';

export interface EvaluatedBatchQuery {
  id: string;
  queryNumber: number;
  dimensionId: string;
  dimensionName: string;
  dimensionIcon: string;
  queryText: string;
  engine: string;
  whyWon: string | null;
  topCitedBrand: string | null;
  sources: string[];
  responseText: string;
  isCached?: boolean;
}

export interface BatchAuditResponse {
  success: boolean;
  batchIndex: number;
  totalBatches: number;
  processedQueriesCount: number;
  evaluatedQueries: EvaluatedBatchQuery[];
  timestamp: string;
  error?: string;
}

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
    const body = req.body || {};
    const batchIndex = typeof body.batchIndex === 'number' ? body.batchIndex : 0;
    const shopDomain = body.shopDomain || 'quickstart-c01718bf';
    const productTitle = body.productTitle || 'Featured Store Product';
    const category = body.category || 'Specialty Goods';
    const vendor = body.vendor || 'Your Store';
    const tags = Array.isArray(body.tags) && body.tags.length > 0 ? body.tags : ['premium quality', 'durable'];

    const tag1 = tags[0] || 'premium quality';
    const tag2 = tags[1] || 'durable';

    // 1. Generate Context-Aware Dynamic 120-Query Taxonomy
    const all120Queries = get120QueryTaxonomy({ category, productTitle, vendor, tag1, tag2 });

    // 2. Slice the current batch of 12 queries (batchIndex 0..9)
    const startIndex = batchIndex * 12;
    const currentBatchQueries = all120Queries.slice(startIndex, startIndex + 12);

    // 3. Execute the 12 queries in parallel with Two-Tier Caching & Multi-Engine Grounding
    const queryPromises = currentBatchQueries.map(async (q) => {
      // Step A: Check Two-Tier Cache first (< 20ms response)
      const cached = await getCachedEvaluation(category, q.queryText, q.engine, shopDomain);
      if (cached) {
        return {
          id: q.id,
          queryNumber: q.queryNumber,
          dimensionId: q.dimensionId,
          dimensionName: q.dimensionName,
          dimensionIcon: q.dimensionIcon,
          queryText: q.queryText,
          engine: q.engine,
          whyWon: cached.whyWon || extractWhyWon(cached.responseText, cached.topCitedBrand),
          topCitedBrand: cached.topCitedBrand,
          sources: cached.citations || [],
          responseText: cached.responseText,
          isCached: true,
        };
      }

      let responseText = '';
      let citations: string[] = [];

      // Step B: Live Multi-Engine Grounding Dispatch
      if (q.engine.includes('Perplexity') && process.env.PERPLEXITY_API_KEY) {
        try {
          const pplxRes = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'sonar-pro',
              messages: [
                {
                  role: 'system',
                  content:
                    'You are an objective AI shopping researcher. Recommend specific direct-to-consumer brand products. Always state why the brand won (e.g. return policy, warranty, materials, price).',
                },
                { role: 'user', content: q.queryText },
              ],
            }),
          });
          if (pplxRes.ok) {
            const data: any = await pplxRes.json();
            responseText = data.choices?.[0]?.message?.content || '';
            citations = data.citations || [];
          }
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : 'Unknown error';
          console.warn(`[Audit Batch API] Perplexity error for ${q.id}:`, errMsg);
        }
      } else if (q.engine.includes('ChatGPT') && process.env.OPENAI_API_KEY) {
        try {
          // Attempt OpenAI Responses API with web_search tool
          const openaiRes = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              tools: [{ type: 'web_search' }],
              input: [
                {
                  role: 'system',
                  content:
                    'You are an objective AI shopping researcher. Recommend specific direct-to-consumer brand products with live links and state the decisive feature.',
                },
                { role: 'user', content: q.queryText },
              ],
            }),
          });

          if (openaiRes.ok) {
            const data: any = await openaiRes.json();
            const textOutput = data.output?.find((o: any) => o.type === 'message')?.content?.[0]?.text;
            responseText = textOutput || data.choices?.[0]?.message?.content || '';

            // Extract grounding citations from web search tool metadata
            const searchCitations = data.output
              ?.flatMap((item: any) => item.metadata?.citations || item.web_search_results || [])
              ?.map((source: any) => source.url)
              ?.filter(Boolean);

            if (searchCitations && searchCitations.length > 0) {
              citations = searchCitations;
            }
          } else {
            // Fallback to standard chat completions with markdown link extraction
            const fallbackRes = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                  {
                    role: 'system',
                    content:
                      'You are an AI shopping researcher. Recommend specific direct-to-consumer brand products. Include full website URLs for each brand.',
                  },
                  { role: 'user', content: q.queryText },
                ],
              }),
            });
            if (fallbackRes.ok) {
              const fData: any = await fallbackRes.json();
              responseText = fData.choices?.[0]?.message?.content || '';
            }
          }

          // Extract URLs from text if citations empty
          if (citations.length === 0 && responseText) {
            const urlMatches = responseText.match(/https?:\/\/[^\s)\]"]+/g) || [];
            citations = urlMatches.slice(0, 3);
          }
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : 'Unknown error';
          console.warn(`[Audit Batch API] OpenAI error for ${q.id}:`, errMsg);
        }
      } else if (process.env.GEMINI_API_KEY) {
        try {
          const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
          const geminiRes = await fetch(geminiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: q.queryText }] }],
              tools: [{ googleSearch: {} }],
            }),
          });
          if (geminiRes.ok) {
            const data: any = await geminiRes.json();
            responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const chunks = data.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
            citations = chunks.map((c: any) => c.web?.uri).filter(Boolean);
          }
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : 'Unknown error';
          console.warn(`[Audit Batch API] Gemini error for ${q.id}:`, errMsg);
        }
      }

      // Step C: Entity Extraction & Dynamic WhyWon Extraction
      const extracted = extractBrands(responseText);
      const rawTopBrand = extracted[0]?.name || null;
      const resolvedBrand = rawTopBrand ? resolveCanonicalBrand(rawTopBrand).name : null;
      const dynamicWhyWon = extractWhyWon(responseText, resolvedBrand);

      // Step D: Write to Cache
      if (responseText) {
        await setCachedEvaluation(
          category,
          q.queryText,
          q.engine,
          {
            responseText,
            topCitedBrand: resolvedBrand,
            whyWon: dynamicWhyWon,
            citations,
            extractedBrands: extracted,
          },
          shopDomain
        );
      }

      return {
        id: q.id,
        queryNumber: q.queryNumber,
        dimensionId: q.dimensionId,
        dimensionName: q.dimensionName,
        dimensionIcon: q.dimensionIcon,
        queryText: q.queryText,
        engine: q.engine,
        whyWon: dynamicWhyWon,
        topCitedBrand: resolvedBrand,
        sources: citations,
        responseText,
        isCached: false,
      };
    });

    const liveQueryResults = await Promise.allSettled(queryPromises);

    const evaluatedBatchQueries: EvaluatedBatchQuery[] = liveQueryResults.map((resItem, idx) => {
      const q = currentBatchQueries[idx];
      if (resItem.status === 'fulfilled') {
        return resItem.value;
      }
      return {
        id: q.id,
        queryNumber: q.queryNumber,
        dimensionId: q.dimensionId,
        dimensionName: q.dimensionName,
        dimensionIcon: q.dimensionIcon,
        queryText: q.queryText,
        engine: q.engine,
        whyWon: null,
        topCitedBrand: null,
        sources: [],
        responseText: '',
      };
    });

    const responseData: BatchAuditResponse = {
      success: true,
      batchIndex,
      totalBatches: 10,
      processedQueriesCount: evaluatedBatchQueries.length,
      evaluatedQueries: evaluatedBatchQueries,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(responseData);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: errMsg });
  }
}

// Dynamic Rationale (whyWon) Extractor from AI Grounding Output
function extractWhyWon(text: string, brandName: string | null): string | null {
  if (!text || text.length === 0) return null;

  // Split into sentences
  const sentences = text.split(/(?<=[.!?])\s+/);

  // If brand is known, find the sentence discussing the brand's key features
  if (brandName) {
    const brandLower = brandName.toLowerCase();
    const relevantSentence = sentences.find((s) => {
      const sl = s.toLowerCase();
      return (
        sl.includes(brandLower) &&
        (sl.includes('because') ||
          sl.includes('known for') ||
          sl.includes('features') ||
          sl.includes('warranty') ||
          sl.includes('policy') ||
          sl.includes('rated') ||
          sl.includes('crafted') ||
          sl.includes('best') ||
          sl.includes('offers'))
      );
    });

    if (relevantSentence) {
      const clean = relevantSentence.replace(/\*\*/g, '').trim();
      return clean.length > 130 ? clean.slice(0, 127) + '...' : clean;
    }
  }

  // Fallback: look for the most descriptive value proposition sentence in the response
  const valueSentence = sentences.find((s) => {
    const sl = s.toLowerCase();
    return sl.includes('warranty') || sl.includes('return policy') || sl.includes('material') || sl.includes('free shipping');
  });

  if (valueSentence) {
    const clean = valueSentence.replace(/\*\*/g, '').trim();
    return clean.length > 130 ? clean.slice(0, 127) + '...' : clean;
  }

  return null;
}

function extractBrands(text: string): Array<{ name: string; domain?: string }> {
  const brands: Array<{ name: string; domain?: string }> = [];
  const boldMatches = text.match(/\*\*([A-Z][A-Za-z0-9\s&'-]{2,25})\*\*/g) || [];
  boldMatches.forEach((m) => {
    const clean = m.replace(/\*\*/g, '').trim();
    if (clean.length > 2 && !clean.includes('http') && !/^\d+$/.test(clean)) {
      const slug = clean.toLowerCase().replace(/[^a-z0-9]/g, '');
      brands.push({ name: clean, domain: `${slug}.com` });
    }
  });
  return brands;
}

interface TaxonomyParams {
  category: string;
  productTitle: string;
  vendor: string;
  tag1: string;
  tag2: string;
}

function get120QueryTaxonomy(params: TaxonomyParams) {
  const { category, tag1, tag2 } = params;
  const engines = [
    'Perplexity sonar-pro',
    'ChatGPT (gpt-4o)',
    'Google Gemini (Search Grounding)',
  ];

  const dimensions = [
    { id: 'dim_commercial', name: 'Direct Commercial Intent', icon: 'fa-cart-shopping' },
    { id: 'dim_specs', name: 'Material & Tech Specs', icon: 'fa-microchip' },
    { id: 'dim_persona', name: 'Problem-Solving & Persona', icon: 'fa-user-check' },
    { id: 'dim_assurance', name: 'Assurance & Return Policy', icon: 'fa-shield-halved' },
    { id: 'dim_community', name: 'Community & Reddit Consensus', icon: 'fa-comments' },
    { id: 'dim_alternatives', name: 'Direct Rival Alternatives', icon: 'fa-arrows-split-up-and-left' },
  ];

  const queries: any[] = [];
  let queryIndex = 1;

  dimensions.forEach((dim) => {
    for (let i = 1; i <= 20; i++) {
      const engine = engines[(i - 1) % engines.length];
      let queryText = '';

      if (dim.id === 'dim_commercial') {
        queryText = `What are the best ${category} brands with verified fast shipping in 2026? (#${i})`;
      } else if (dim.id === 'dim_specs') {
        queryText = `Top rated ${category} made with genuine ${tag1} vs synthetic alternatives? (#${i})`;
      } else if (dim.id === 'dim_persona') {
        queryText = `Best ${category} for daily users looking for ${tag2} reliability? (#${i})`;
      } else if (dim.id === 'dim_assurance') {
        queryText = `Which ${category} brands offer risk-free 30-day money-back guarantee and warranty? (#${i})`;
      } else if (dim.id === 'dim_community') {
        queryText = `Reddit community consensus on top recommended independent ${category} brands in 2026? (#${i})`;
      } else {
        queryText = `Top alternative direct-to-consumer brands for premium ${category}? (#${i})`;
      }

      queries.push({
        id: `q_${queryIndex}`,
        queryNumber: queryIndex,
        dimensionId: dim.id,
        dimensionName: dim.name,
        dimensionIcon: dim.icon,
        queryText,
        engine,
      });
      queryIndex++;
    }
  });

  return queries;
}
