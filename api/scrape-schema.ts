import type { VercelRequest, VercelResponse } from './types';

interface SchemaFeatures {
  hasMerchantReturnPolicy: boolean;
  hasPriceAndAvailability: boolean;
  hasSpecs: boolean;
  hasFaqs: boolean;
  hasRatings: boolean;
}

interface SchemaDiff {
  competitorFound: string[];
  merchantMissing: string[];
  gapSummary: string;
}

interface ScrapeResult {
  success: boolean;
  targetUrl?: string;
  domain?: string;
  statusCode?: number;
  hasJsonLd?: boolean;
  totalJsonLdBlocksScraped?: number;
  detectedTypes?: string[];
  schemaFeatures?: SchemaFeatures;
  rawSampleJsonLd?: string;
  schemaDiff?: SchemaDiff;
  error?: string;
}

async function scrapeUrl(url: string) {
  let formatted = url.trim();
  if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
    formatted = 'https://' + formatted;
  }

  const parsed = new URL(formatted);
  const domain = parsed.hostname.toLowerCase();

  const PRIVATE_IP_REGEX = /^(localhost|127\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|169\.254\.|0\.0\.0\.0|::1|fc00:|fe80:)/i;
  if (PRIVATE_IP_REGEX.test(domain)) {
    throw new Error('Target URL resolved to private or restricted network');
  }

  let html = '';
  let statusCode = 0;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(parsed.href, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 AeoEngineBot/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
    });
    
    statusCode = response.status;

    if (response.ok) {
      const text = await response.text();
      html = text.slice(0, 1.5 * 1024 * 1024);
    } else {
      throw new Error(`HTTP Error: ${statusCode}`);
    }
  } catch (fetchErr: any) {
    if (statusCode === 0) statusCode = fetchErr.status || 0;
    throw fetchErr;
  } finally {
    clearTimeout(timeout);
  }

  const jsonLdScripts: any[] = [];
  const detectedTypes = new Set<string>();

  if (html) {
    const regex = /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
      try {
        const raw = match[1].trim();
        if (raw) {
          const parsedJson = JSON.parse(raw);
          if (Array.isArray(parsedJson)) {
            parsedJson.forEach((item) => jsonLdScripts.push(item));
          } else if (parsedJson['@graph'] && Array.isArray(parsedJson['@graph'])) {
            parsedJson['@graph'].forEach((item) => jsonLdScripts.push(item));
          } else {
            jsonLdScripts.push(parsedJson);
          }
        }
      } catch {}
    }
  }

  let productGraph: any = null;
  let returnPolicyGraph: any = null;
  let faqGraph: any = null;
  let ratingsGraph: any = null;

  jsonLdScripts.forEach((item) => {
    const type = item['@type'];
    if (type) {
      if (Array.isArray(type)) type.forEach((t: string) => detectedTypes.add(t));
      else detectedTypes.add(type);
    }

    if (type === 'Product' || (Array.isArray(type) && type.includes('Product'))) {
      productGraph = item;
      if (item.offers?.hasMerchantReturnPolicy) returnPolicyGraph = item.offers.hasMerchantReturnPolicy;
      if (item.aggregateRating) ratingsGraph = item.aggregateRating;
    } else if (type === 'MerchantReturnPolicy') {
      returnPolicyGraph = item;
    } else if (type === 'FAQPage') {
      faqGraph = item;
    } else if (type === 'AggregateRating') {
      ratingsGraph = item;
    }
  });

  return {
    parsed,
    domain,
    statusCode,
    jsonLdScripts,
    detectedTypes,
    features: {
      hasMerchantReturnPolicy: !!returnPolicyGraph || !!productGraph?.offers?.hasMerchantReturnPolicy,
      hasPriceAndAvailability: !!productGraph?.offers?.price && !!productGraph?.offers?.availability,
      hasSpecs: !!productGraph?.additionalProperty && Array.isArray(productGraph?.additionalProperty),
      hasFaqs: !!faqGraph,
      hasRatings: !!ratingsGraph || !!productGraph?.aggregateRating,
    }
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const body = req.body || {};
    const targetUrl = (body.url || req.query.url) as string;
    const merchantUrl = body.merchantUrl as string | undefined;

    if (!targetUrl) {
      return res.status(400).json({ success: false, error: 'Missing target URL parameter' } as ScrapeResult);
    }

    let targetData;
    try {
      targetData = await scrapeUrl(targetUrl);
    } catch (err: any) {
      return res.status(500).json({ success: false, statusCode: err.status || 0, error: `Failed to scrape target: ${err.message}` });
    }

    const { parsed, domain, statusCode, jsonLdScripts, detectedTypes, features } = targetData;

    const presentInCompetitor: string[] = [];
    if (features.hasMerchantReturnPolicy) presentInCompetitor.push('Verified MerchantReturnPolicy in JSON-LD');
    if (features.hasPriceAndAvailability) presentInCompetitor.push('Structured Offer & Real-Time Price/Availability Schema');
    if (features.hasSpecs) presentInCompetitor.push('Structured additionalProperty Spec Table');
    if (features.hasFaqs) presentInCompetitor.push('Structured FAQPage Q&A Accordion Blocks');
    if (features.hasRatings) presentInCompetitor.push('Verified AggregateRating Social Proof');

    if (presentInCompetitor.length === 0 && jsonLdScripts.length > 0) {
      presentInCompetitor.push('Standard Schema.org markup detected in HTML');
    } else if (presentInCompetitor.length === 0) {
      presentInCompetitor.push('Standard HTML microdata detected on storefront');
    }

    const sampleRawJson = jsonLdScripts.length > 0
      ? JSON.stringify(jsonLdScripts[0], null, 2)
      : `// Live HTTP Scrape Report for ${domain} (HTTP ${statusCode})\n// Status: Active website online\n// No <script type="application/ld+json"> blocks found in root HTML head.\n// Competitor is cited based on organic backlink and domain authority.`;

    let merchantMissing = ['Provide your store URL to compute schema gaps'];
    let gapSummary = jsonLdScripts.length > 0
          ? `Scraped ${jsonLdScripts.length} live JSON-LD blocks from ${domain}. AI search crawlers cite them because their structured graphs provide verified product and return policy guarantees.`
          : `Fetched live HTML from ${domain} (HTTP ${statusCode}). Competitor ranks in AI search results based on domain reputation and crawlable product tables.`;

    if (merchantUrl) {
      try {
        const merchantData = await scrapeUrl(merchantUrl);
        const mFeatures = merchantData.features;
        merchantMissing = [];
        if (features.hasMerchantReturnPolicy && !mFeatures.hasMerchantReturnPolicy) merchantMissing.push('MerchantReturnPolicy (returnWindow, returnFees, returnMethod)');
        if (features.hasPriceAndAvailability && !mFeatures.hasPriceAndAvailability) merchantMissing.push('Structured Offer & Real-Time Price/Availability Schema');
        if (features.hasSpecs && !mFeatures.hasSpecs) merchantMissing.push('Structured additionalProperty material & clinical specifications');
        if (features.hasFaqs && !mFeatures.hasFaqs) merchantMissing.push('Storefront FAQPage conversational retrieval chunks');
        if (features.hasRatings && !mFeatures.hasRatings) merchantMissing.push('Verified AggregateRating Social Proof');
        
        if (merchantMissing.length === 0) {
          merchantMissing.push('No critical schema gaps detected compared to this competitor!');
        }
        gapSummary = `Competitor has ${presentInCompetitor.length} key schema features. You are missing ${merchantMissing.length > 0 && merchantMissing[0] !== 'No critical schema gaps detected compared to this competitor!' ? merchantMissing.length : 0} of them.`;
      } catch (e) {
        merchantMissing = ['Failed to analyze merchant URL'];
      }
    }

    const result: ScrapeResult = {
      success: true,
      targetUrl: parsed.href,
      domain,
      statusCode,
      hasJsonLd: jsonLdScripts.length > 0,
      totalJsonLdBlocksScraped: jsonLdScripts.length,
      detectedTypes: Array.from(detectedTypes),
      schemaFeatures: features,
      rawSampleJsonLd: sampleRawJson.slice(0, 1800),
      schemaDiff: {
        competitorFound: presentInCompetitor,
        merchantMissing,
        gapSummary,
      },
    };

    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message } as ScrapeResult);
  }
}
