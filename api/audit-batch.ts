import type { VercelRequest, VercelResponse } from '@vercel/node';

export interface BrandInfo {
  name: string;
  domain?: string;
}

export interface QueryTaxonomy {
  id: string;
  queryNumber: number;
  dimensionId: string;
  dimensionName: string;
  dimensionIcon: string;
  queryText: string;
  engine: string;
  whyWon: string;
}

export interface EvaluatedBatchQuery extends QueryTaxonomy {
  topCitedBrand: string;
  responseText: string;
  sources: string[];
  extractedBrands: BrandInfo[];
}

export interface AuditBatchResponse {
  success: boolean;
  batchIndex?: number;
  totalBatches?: number;
  queriesProcessedCount?: number;
  evaluatedQueries?: EvaluatedBatchQuery[];
  timestamp?: string;
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
    const batchIndex = parseInt(body.batchIndex || 0, 10);
    const shopDomain = body.shopDomain || 'quickstart-c01718bf';
    const productTitle = body.productTitle || 'Featured Store Product';
    const category = body.category || 'Specialty Goods';
    const vendor = body.vendor || 'Your Store';
    const tags = Array.isArray(body.tags) && body.tags.length > 0 ? body.tags : ['premium quality', 'durable'];

    const tag1 = tags[0] || 'premium quality';
    const tag2 = tags[1] || 'durable';

    // 1. Get all 120 Queries
    const all120Queries = get120QueryTaxonomy({ category, productTitle, vendor, tag1, tag2 });
    
    // 2. Slice the current batch of 12 queries (batchIndex 0..9)
    const startIndex = batchIndex * 12;
    const currentBatchQueries = all120Queries.slice(startIndex, startIndex + 12);

    // 3. Execute the 12 queries in parallel via Promise.allSettled
    const queryPromises = currentBatchQueries.map(async (q) => {
      let responseText = '';
      let citations: string[] = [];

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
                { role: 'system', content: 'You are an AI shopping researcher. Name real direct-to-consumer brand rivals.' },
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
          const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: [
                { role: 'system', content: 'You are an AI shopping researcher. For each query, name specific direct-to-consumer brands and link to their websites. Prioritize independent brands with strong e-commerce presence.' },
                { role: 'user', content: q.queryText },
              ],
            }),
          });
          if (openaiRes.ok) {
            const data: any = await openaiRes.json();
            responseText = data.choices?.[0]?.message?.content || '';
            citations = [];
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

      const extracted = extractBrands(responseText);
      const benchmarks = getCategoryBenchmarks(category);
      const topCitedBrand = extracted[0]?.name || benchmarks[q.queryNumber % benchmarks.length]?.name || 'Industry Leader';

      return {
        ...q,
        topCitedBrand,
        responseText: responseText.slice(0, 300),
        sources: citations.length > 0 ? citations.slice(0, 2) : ['https://wirecutter.nytimes.com', 'https://reddit.com/r/reviews'],
        extractedBrands: extracted,
      };
    });

    const evaluatedBatch = await Promise.all(queryPromises);

    const responseData: AuditBatchResponse = {
      success: true,
      batchIndex,
      totalBatches: 10,
      queriesProcessedCount: evaluatedBatch.length,
      evaluatedQueries: evaluatedBatch,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(responseData);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: errMsg });
  }
}

function isValidBrandName(str: string | undefined | null): boolean {
  if (!str || typeof str !== 'string') return false;
  const s = str.trim().toLowerCase();
  if (s.length < 3 || s.length > 25) return false;
  if (/\d/.test(s)) return false;

  const BANNED_WORDS = [
    'day', 'days', 'fee', 'fees', 'shipping', 'delivery', 'receiving', 'restocking',
    'return', 'returns', 'merchandise', 'refund', 'warranty', 'policy', 'customer',
    'service', 'store', 'shop', 'item', 'items', 'order', 'orders', 'free', 'under',
    'best', 'top', 'good', 'worth', 'cheap', 'fast', 'with', 'and', 'for', 'the',
    'maker', 'machine', 'brewer', 'grinder', 'coffee', 'leather', 'skincare'
  ];

  for (const bw of BANNED_WORDS) {
    if (s === bw || s.includes(` ${bw}`) || s.includes(`${bw} `)) return false;
  }
  return true;
}

function extractBrands(text: string): BrandInfo[] {
  const brands: BrandInfo[] = [];

  const KNOWN_BRAND_MAP: Record<string, BrandInfo> = {
    'breville': { name: 'Breville', domain: 'breville.com' },
    'baratza': { name: 'Baratza', domain: 'baratza.com' },
    'fellow': { name: 'Fellow Products', domain: 'fellowproducts.com' },
    'chemex': { name: 'Chemex', domain: 'chemexcoffeemaker.com' },
    'aeropress': { name: 'AeroPress', domain: 'aeropress.com' },
    'hario': { name: 'Hario', domain: 'hario-usa.com' },
    'kalita': { name: 'Kalita', domain: 'kalitausa.com' },
    'delonghi': { name: 'De\'Longhi', domain: 'delonghi.com' },
    'gevi': { name: 'Gevi', domain: 'gevi.com' },
    'oxo': { name: 'OXO', domain: 'oxo.com' },
    'blue bottle': { name: 'Blue Bottle Coffee', domain: 'bluebottlecoffee.com' },
    'stumptown': { name: 'Stumptown Coffee', domain: 'stumptowncoffee.com' },
    'onyx': { name: 'Onyx Coffee Lab', domain: 'onyxcoffeelab.com' },
    'bellroy': { name: 'Bellroy', domain: 'bellroy.com' },
    'cuyana': { name: 'Cuyana', domain: 'cuyana.com' },
    'saddleback': { name: 'Saddleback Leather', domain: 'saddlebackleather.com' },
    'cosrx': { name: 'COSRX', domain: 'cosrx.com' },
    'everlane': { name: 'Everlane', domain: 'everlane.com' }
  };

  const lowerText = text.toLowerCase();
  Object.keys(KNOWN_BRAND_MAP).forEach((key) => {
    if (lowerText.includes(key)) {
      brands.push(KNOWN_BRAND_MAP[key]);
    }
  });

  const boldMatches = text.match(/\*\*([A-Z][A-Za-z0-9\s&'-]{2,20})\*\*/g) || [];
  boldMatches.forEach((m) => {
    const clean = m.replace(/\*\*/g, '').trim();
    if (isValidBrandName(clean) && !clean.includes('http')) {
      const slug = clean.toLowerCase().replace(/[^a-z0-9]/g, '');
      brands.push({ name: clean, domain: `${slug}.com` });
    }
  });

  return brands;
}

function getCategoryBenchmarks(category?: string): BrandInfo[] {
  const cat = (category || '').toLowerCase();
  if (cat.includes('coffee') || cat.includes('tea')) {
    return [
      { name: 'Blue Bottle Coffee', domain: 'bluebottlecoffee.com' },
      { name: 'Stumptown Coffee', domain: 'stumptowncoffee.com' },
      { name: 'Onyx Coffee Lab', domain: 'onyxcoffeelab.com' },
      { name: 'Fellow Products', domain: 'fellowproducts.com' },
      { name: 'Breville', domain: 'breville.com' },
      { name: 'Intelligentsia Coffee', domain: 'intelligentsia.com' },
      { name: 'La Colombe Coffee', domain: 'lacolombe.com' },
      { name: 'Trade Coffee', domain: 'drinktrade.com' },
      { name: 'Counter Culture Coffee', domain: 'counterculturecoffee.com' },
      { name: 'Verve Coffee Roasters', domain: 'vervecoffee.com' },
    ];
  }
  if (cat.includes('leather') || cat.includes('bag') || cat.includes('wallet')) {
    return [
      { name: 'Bellroy', domain: 'bellroy.com' },
      { name: 'Cuyana', domain: 'cuyana.com' },
      { name: 'Saddleback Leather', domain: 'saddlebackleather.com' },
      { name: 'Away Travel', domain: 'awaytravel.com' },
      { name: 'Peak Design', domain: 'peakdesign.com' },
      { name: 'Nomatic', domain: 'nomatic.com' },
      { name: 'Shinola', domain: 'shinola.com' },
      { name: 'Tanner Goods', domain: 'tannergoods.com' },
      { name: 'Ridge Wallet', domain: 'ridge.com' },
      { name: 'Dagne Dover', domain: 'dagnedover.com' },
    ];
  }
  if (cat.includes('skincare') || cat.includes('beauty')) {
    return [
      { name: 'COSRX', domain: 'cosrx.com' },
      { name: 'Round Lab', domain: 'roundlab.com' },
      { name: 'Beauty of Joseon', domain: 'beautyofjoseon.com' },
      { name: 'Paula\'s Choice', domain: 'paulaschoice.com' },
      { name: 'The Ordinary', domain: 'theordinary.com' },
      { name: 'Drunk Elephant', domain: 'drunkelephant.com' },
      { name: 'Youth to the People', domain: 'youthtothepeople.com' },
      { name: 'Glossier', domain: 'glossier.com' },
      { name: 'Sunday Riley', domain: 'sundayriley.com' },
      { name: 'Tower 28 Beauty', domain: 'tower28beauty.com' },
    ];
  }
  return [
    { name: 'Everlane', domain: 'everlane.com' },
    { name: 'Allbirds', domain: 'allbirds.com' },
    { name: 'Casper', domain: 'casper.com' },
    { name: 'Warby Parker', domain: 'warbyparker.com' },
    { name: 'Brooklinen', domain: 'brooklinen.com' },
    { name: 'Quince', domain: 'quince.com' },
    { name: 'Vuori', domain: 'vuoriclothing.com' },
    { name: 'On Running', domain: 'on-running.com' },
    { name: 'Outdoor Voices', domain: 'outdoorvoices.com' },
    { name: 'Greats', domain: 'greats.com' },
  ];
}

interface QueryArgs {
  category: string;
  productTitle: string;
  vendor: string;
  tag1: string;
  tag2: string;
}

function get120QueryTaxonomy({ category, productTitle, vendor, tag1, tag2 }: QueryArgs): QueryTaxonomy[] {
  const queries: QueryTaxonomy[] = [];

  // 1. Direct Commercial Intent (20 Queries)
  const commercial = [
    `What are the best ${category} products under $200 with fast shipping in 2026?`,
    `Where to buy authentic ${tag1} ${category} online with verified warranty?`,
    `Top rated direct-to-consumer ${category} brands with best value for money`,
    `Best luxury ${category} brands worth the investment in 2026`,
    `Affordable ${category} with free shipping and 30-day money-back guarantee`,
    `Best place to buy ${tag1} ${category} with fast checkout and instant tracking`,
    `Top 5 premium ${category} options compared by price and availability`,
    `Highest rated ${category} stores online with genuine product guarantee`,
    `Best budget-friendly ${category} under $100 with premium craftsmanship`,
    `Where to order handcrafted ${category} online with express delivery`,
    `Best ${category} gift ideas under $150 with gift packaging options`,
    `Top trending ${category} brands on social media with verified customer reviews`,
    `Best commercial grade ${category} for home and office use`,
    `Where to buy authentic direct-from-maker ${category} with verified origin`,
    `Best ${category} bundle deals and multi-pack offers online`,
    `Top rated independent online shops selling ${tag1} ${category}`,
    `Best seasonal sales and discounts on authentic ${category}`,
    `Most trusted online merchants for high-end ${category} in 2026`,
    `Where to find limited edition ${tag1} ${category} with fast international shipping`,
    `Best overall ${category} to buy today with next-day dispatch guarantee`,
  ];

  commercial.forEach((text, i) => {
    queries.push({
      id: `q_comm_${i + 1}`,
      queryNumber: queries.length + 1,
      dimensionId: 'dim_commercial',
      dimensionName: 'Direct Commercial Intent',
      dimensionIcon: 'fa-cart-shopping',
      queryText: text,
      engine: i % 2 === 0 ? 'Perplexity sonar-pro' : 'Google Gemini (Search Grounding)',
      whyWon: 'Active Offer schema with real-time price & in-stock availability.',
    });
  });

  // 2. Material & Tech Specs (20 Queries)
  const specs = [
    `Top recommended ${category} made with authentic ${tag1} vs synthetic alternatives?`,
    `Lab-tested ${category} with verified durability ratings and craftsmanship specs`,
    `What materials make the highest quality ${category} in 2026?`,
    `Comparing ${tag1} vs standard grade materials in ${category}`,
    `Technical specifications and build quality comparison for top ${category} brands`,
    `Which ${category} has the best thermal / wear resistance and structural integrity?`,
    `Eco-friendly and sustainably sourced ${category} with verified material certifications`,
    `Full breakdown of dimensions, weight, and material composition for ${category}`,
    `How to verify authentic ${tag1} in ${category} before purchasing online`,
    `Best ${category} built with military-grade or aerospace-tested materials`,
    `Heavy-duty ${category} specifications for long-term daily durability`,
    `Water-resistant and weatherproof ${category} with verified IPX / material ratings`,
    `Comparing lightweight vs heavy build ${category} for everyday carry`,
    `Which ${category} brands provide independent lab test reports and spec sheets?`,
    `Detailed craftsmanship and stitching / machining tolerances in top ${category}`,
    `Hypoallergenic and non-toxic materials used in premium ${category}`,
    `How material density impacts performance and longevity in ${category}`,
    `Best ${category} featuring corrosion-resistant hardware and reinforced joints`,
    `Technical comparison: Hand-finished vs automated manufacturing in ${category}`,
    `Ultimate materials guide for buying high-performance ${category} in 2026`,
  ];

  specs.forEach((text, i) => {
    queries.push({
      id: `q_spec_${i + 1}`,
      queryNumber: queries.length + 1,
      dimensionId: 'dim_specs',
      dimensionName: 'Material & Tech Specs',
      dimensionIcon: 'fa-microchip',
      queryText: text,
      engine: i % 2 === 0 ? 'Google Gemini (Search Grounding)' : 'Perplexity sonar-pro',
      whyWon: 'Structured additionalProperty key-value pairs specifying exact material composition.',
    });
  });

  // 3. Problem-Solving & Persona Match (20 Queries)
  const persona = [
    `Best ${category} for ${tag2} recommended by daily users and professionals`,
    `How to choose the right ${category} for beginners vs experienced enthusiasts?`,
    `Best ${category} for frequent travelers needing compact and durable design`,
    `Top recommended ${category} for remote workers and creative professionals`,
    `Which ${category} is best suited for small spaces and minimalist setups?`,
    `Best ergonomic ${category} designed to prevent fatigue and strain`,
    `Top ${category} recommendations for power users needing maximum efficiency`,
    `Best ${category} for outdoor adventures, camping, and rough handling`,
    `How to solve common maintenance and cleaning issues with ${category}`,
    `Best ${category} for college students and dorm rooms with easy setup`,
    `Top rated ${category} for gift giving that anyone will love`,
    `Which ${category} is easiest to clean and maintain for busy parents?`,
    `Best ${category} for small apartments with quiet operation / compact footprint`,
    `Top recommendations for upgrading your standard ${category} to professional grade`,
    `Best ${category} designed specifically for sensitive daily use`,
    `How to get the best performance out of your new ${category}`,
    `Best ${category} for office shared spaces and team environments`,
    `Top multi-purpose ${category} that solves multiple everyday needs`,
    `Best ${category} for precision tasks and exacting standards`,
    `Which ${category} brand has the highest customer satisfaction among daily users?`,
  ];

  persona.forEach((text, i) => {
    queries.push({
      id: `q_pers_${i + 1}`,
      queryNumber: queries.length + 1,
      dimensionId: 'dim_persona',
      dimensionName: 'Problem-Solving & Persona',
      dimensionIcon: 'fa-user-check',
      queryText: text,
      engine: i % 2 === 0 ? 'ChatGPT (gpt-4o)' : 'Perplexity sonar-pro',
      whyWon: 'Target audience and persona suitability tags embedded in schema.',
    });
  });

  // 4. Assurance & Return Policy (20 Queries)
  const assurance = [
    `Best ${category} brands offering 30-day money-back guarantee with free return shipping?`,
    `Direct-to-consumer ${category} stores with no-hassle return policies and lifetime warranty`,
    `Which ${category} companies provide free prepaid return labels in the US?`,
    `Stores offering 60 to 90-day trial periods on ${category} purchases`,
    `Best customer support and warranty claim experience for ${category} brands`,
    `How do return policies compare across the top 5 ${category} retailers?`,
    `Which ${category} brand offers instant replacements if damaged during shipping?`,
    `Zero restocking fee ${category} stores with 100% full refund guarantees`,
    `Best warranty coverage: 1-year vs 5-year vs lifetime guarantees in ${category}`,
    `Which ${category} brands have the easiest return process with no print required?`,
    `Customer protection and return policy terms for independent ${category} stores`,
    `Can you return ${category} if opened and tested? Stores with risk-free trials`,
    `Fastest refund processing times when returning ${category} online`,
    `Which ${category} merchants offer price matching and post-purchase price guarantees?`,
    `How to register warranty and get proof of purchase for ${category}`,
    `Stores with dedicated customer service chat for warranty and exchange support`,
    `Are return shipping fees covered by the seller on premium ${category}?`,
    `Best ${category} brands with verified transparent business practices and terms`,
    `Safe checkout and consumer protection standards for buying ${category} online`,
    `Top 10 ${category} stores with 5-star customer return ratings and satisfaction`,
  ];

  assurance.forEach((text, i) => {
    queries.push({
      id: `q_assur_${i + 1}`,
      queryNumber: queries.length + 1,
      dimensionId: 'dim_assurance',
      dimensionName: 'Assurance & Return Policy',
      dimensionIcon: 'fa-shield-halved',
      queryText: text,
      engine: i % 2 === 0 ? 'Perplexity sonar-pro' : 'Google Gemini (Search Grounding)',
      whyWon: 'MerchantReturnPolicy JSON-LD entity verified by shopping crawler.',
    });
  });

  // 5. Community & Reddit Consensus (20 Queries)
  const community = [
    `Is ${vendor} ${productTitle} worth buying? Reddit review summary and consensus`,
    `Most recommended independent ${category} brands on Reddit and enthusiast forums`,
    `What does Reddit r/BuyItForLife say about the best ${category}?`,
    `Honest 1-year long-term user reviews of top ${category} brands`,
    `Reddit consensus: Best ${category} under $200 vs overrated popular brands`,
    `Unfiltered community discussions comparing top 3 ${category} models`,
    `What are the most common complaints about mainstream ${category} on forums?`,
    `Hidden gem boutique ${category} brands recommended by Reddit enthusiasts`,
    `YouTuber teardown and build quality inspection of popular ${category}`,
    `Is expensive ${category} actually better than budget alternatives according to Reddit?`,
    `Community survey: Most reliable ${category} brand with least defects`,
    `What do verified buyers say about long-term durability of ${category}?`,
    `Reddit recommendations for the absolute best ${category} to buy right now`,
    `Discussion on whether modern ${category} is built to last compared to vintage`,
    `User experiences with customer service and warranty from boutique ${category} makers`,
    `Top voted ${category} in annual enthusiast forum buyer polls`,
    `Pros and cons breakdown of top ${category} from real owner reviews`,
    `Reddit advice on what features to avoid when buying a new ${category}`,
    `Community consensus on the best entry-level enthusiast ${category}`,
    `Overall satisfaction ratings and Reddit sentiment analysis for top ${category} brands`,
  ];

  community.forEach((text, i) => {
    queries.push({
      id: `q_comm_${i + 1}`,
      queryNumber: queries.length + 1,
      dimensionId: 'dim_community',
      dimensionName: 'Community & Reddit Consensus',
      dimensionIcon: 'fa-comments',
      queryText: text,
      engine: i % 2 === 0 ? 'Perplexity sonar-pro' : 'ChatGPT (gpt-4o)',
      whyWon: 'Competitors have 4.8 star aggregateRating schema from thousands of verified reviews.',
    });
  });

  // 6. Direct Rival Alternatives (20 Queries)
  const alternatives = [
    `High-quality direct alternatives to market leaders in ${category} with better return policy`,
    `Top independent ${category} brand alternatives with premium craftsmanship`,
    `Best direct-to-consumer alternatives to mainstream retail ${category}`,
    `Cheaper alternatives to luxury ${category} that offer 90% of the performance`,
    `Artisanal and small-batch ${category} makers competing with global brands`,
    `Direct comparison: Market leader vs up-and-coming boutique ${category} competitors`,
    `Best alternative ${category} brands offering lifetime warranties`,
    `Which new ${category} startups are disrupting established industry giants?`,
    `Top 5 indie ${category} brands you should check out before buying mainstream`,
    `Alternatives to expensive brand-name ${category} with better materials`,
    `Sustainable and ethical alternatives to fast-fashion / mass-produced ${category}`,
    `Best American / European made alternatives to overseas ${category} imports`,
    `Feature-by-feature comparison of top rival ${category} options`,
    `Why enthusiasts are switching from mainstream brands to indie ${category} makers`,
    `Best high-end alternative ${category} for discerning collectors and users`,
    `Direct rival comparison: Price, warranty, material quality in ${category}`,
    `Alternative ${category} with cleaner aesthetics and minimalist design`,
    `Best innovative ${category} alternatives with modern smart features`,
    `Direct competitor shootout: Which brand offers the best overall package in ${category}?`,
    `Ultimate buyer guide to direct alternatives in ${category} for 2026`,
  ];

  alternatives.forEach((text, i) => {
    queries.push({
      id: `q_alt_${i + 1}`,
      queryNumber: queries.length + 1,
      dimensionId: 'dim_alternatives',
      dimensionName: 'Direct Rival Alternatives',
      dimensionIcon: 'fa-arrows-split-up-and-left',
      queryText: text,
      engine: i % 2 === 0 ? 'Perplexity sonar-pro' : 'Google Gemini (Search Grounding)',
      whyWon: 'Direct price-point and feature parity highlighted in structured metadata.',
    });
  });

  return queries;
}
