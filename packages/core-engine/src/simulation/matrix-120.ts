export interface MatrixQuery {
  id: string;
  queryNumber: number;
  dimensionId: string;
  dimensionName: string;
  dimensionIcon: string;
  queryText: string;
  engine: 'Perplexity sonar-pro' | 'Google Gemini (Search Grounding)' | 'ChatGPT (gpt-4o)';
  whyWon: string;
}

export class FullMatrixEngine120 {
  static generate120Queries(params: {
    category?: string;
    productTitle?: string;
    vendor?: string;
    tag1?: string;
    tag2?: string;
  }): MatrixQuery[] {
    const category = params.category || 'Specialty Goods';
    const productTitle = params.productTitle || 'Featured SKU';
    const vendor = params.vendor || 'Your Store';
    const tag1 = params.tag1 || 'premium quality';
    const tag2 = params.tag2 || 'durable';

    const queries: MatrixQuery[] = [];

    // 1. Direct Commercial Intent (20 Queries: Q1 - Q20)
    const commercialTemplates = [
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

    commercialTemplates.forEach((text, i) => {
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

    // 2. Material & Technical Specs (20 Queries: Q21 - Q40)
    const specTemplates = [
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

    specTemplates.forEach((text, i) => {
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

    // 3. Problem-Solving & Persona Match (20 Queries: Q41 - Q60)
    const personaTemplates = [
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

    personaTemplates.forEach((text, i) => {
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

    // 4. Assurance & Return Policy (20 Queries: Q61 - Q80)
    const assuranceTemplates = [
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

    assuranceTemplates.forEach((text, i) => {
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

    // 5. Community & Reddit Consensus (20 Queries: Q81 - Q100)
    const communityTemplates = [
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

    communityTemplates.forEach((text, i) => {
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

    // 6. Direct Rival Alternatives (20 Queries: Q101 - Q120)
    const alternativeTemplates = [
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

    alternativeTemplates.forEach((text, i) => {
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
}
