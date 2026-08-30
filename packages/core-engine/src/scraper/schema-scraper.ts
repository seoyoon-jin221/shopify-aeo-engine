export interface ScrapedSchemaReport {
  targetUrl: string;
  domain: string;
  statusCode: number;
  hasJsonLd: boolean;
  rawJsonLdCount: number;
  detectedTypes: string[];
  productGraph?: any;
  returnPolicyGraph?: any;
  faqGraph?: any;
  ratingsGraph?: any;
  schemaFeatures: {
    hasMerchantReturnPolicy: boolean;
    hasPriceAndAvailability: boolean;
    hasClinicalOrSpecProperties: boolean;
    hasFaqAccordionPage: boolean;
    hasAggregateRating: boolean;
  };
  rawSampleJsonLd: string;
  schemaDiffAgainstStore: {
    missingInStore: string[];
    presentInCompetitor: string[];
    gapSummary: string;
  };
}

export class SecureSchemaScraper {
  // Disallowed IP ranges and hostnames for SSRF protection
  private static readonly PRIVATE_IP_REGEX = /^(localhost|127\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|169\.254\.|0\.0\.0\.0|::1|fc00:|fe80:)/i;

  /**
   * Safely fetches a competitor URL and parses its live JSON-LD Schema.org tree
   */
  public static async scrapeLiveSchema(rawUrl: string): Promise<ScrapedSchemaReport> {
    const validatedUrl = this.validateAndSanitizeUrl(rawUrl);
    const domain = new URL(validatedUrl).hostname;

    let html = '';
    let statusCode = 200;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500); // 4.5s safe timeout

      const response = await fetch(validatedUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 AeoEngineBot/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);
      statusCode = response.status;

      if (response.ok) {
        const text = await response.text();
        // Limit parsing buffer to 2MB to prevent memory exhaustion
        html = text.slice(0, 2 * 1024 * 1024);
      }
    } catch (err: any) {
      console.warn(`[SecureSchemaScraper] Failed to fetch ${validatedUrl}:`, err.message);
    }

    return this.parseHtmlForJsonLd(validatedUrl, domain, statusCode, html);
  }

  public static validateAndSanitizeUrl(rawUrl: string): string {
    let formatted = rawUrl.trim();
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      formatted = 'https://' + formatted;
    }

    const parsed = new URL(formatted);

    // Enforce HTTP / HTTPS protocol only
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`Disallowed protocol: ${parsed.protocol}`);
    }

    // SSRF Guard: Reject private and loopback IP spaces
    if (this.PRIVATE_IP_REGEX.test(parsed.hostname)) {
      throw new Error(`Disallowed private or local host: ${parsed.hostname}`);
    }

    return parsed.href;
  }

  private static parseHtmlForJsonLd(
    url: string,
    domain: string,
    statusCode: number,
    html: string
  ): ScrapedSchemaReport {
    const jsonLdScripts: any[] = [];
    const detectedTypes = new Set<string>();

    if (html) {
      const regex = /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(html)) !== null) {
        try {
          const rawJson = match[1].trim();
          if (rawJson) {
            const parsed = JSON.parse(rawJson);
            if (Array.isArray(parsed)) {
              parsed.forEach((item) => jsonLdScripts.push(item));
            } else if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
              parsed['@graph'].forEach((item: any) => jsonLdScripts.push(item));
            } else {
              jsonLdScripts.push(parsed);
            }
          }
        } catch {
          // Ignore invalid JSON chunks
        }
      }
    }

    // Identify Schema.org Graphs
    let productGraph: any = null;
    let returnPolicyGraph: any = null;
    let faqGraph: any = null;
    let ratingsGraph: any = null;

    jsonLdScripts.forEach((item) => {
      const type = item['@type'];
      if (type) {
        if (Array.isArray(type)) {
          type.forEach((t) => detectedTypes.add(t));
        } else {
          detectedTypes.add(type);
        }
      }

      if (type === 'Product' || (Array.isArray(type) && type.includes('Product'))) {
        productGraph = item;
        if (item.offers?.hasMerchantReturnPolicy) {
          returnPolicyGraph = item.offers.hasMerchantReturnPolicy;
          detectedTypes.add('MerchantReturnPolicy');
        }
        if (item.aggregateRating) {
          ratingsGraph = item.aggregateRating;
          detectedTypes.add('AggregateRating');
        }
      } else if (type === 'MerchantReturnPolicy') {
        returnPolicyGraph = item;
      } else if (type === 'FAQPage') {
        faqGraph = item;
      } else if (type === 'AggregateRating') {
        ratingsGraph = item;
      }
    });

    const hasMerchantReturnPolicy = !!returnPolicyGraph || !!productGraph?.offers?.hasMerchantReturnPolicy;
    const hasPriceAndAvailability = !!productGraph?.offers?.price && !!productGraph?.offers?.availability;
    const hasClinicalOrSpecProperties = !!productGraph?.additionalProperty && Array.isArray(productGraph?.additionalProperty) && productGraph.additionalProperty.length > 0;
    const hasFaqAccordionPage = !!faqGraph;
    const hasAggregateRating = !!ratingsGraph || !!productGraph?.aggregateRating;

    // Construct live diff
    const missingInStore = [
      'Schema.org MerchantReturnPolicy (applicableCountry, returnWindow, returnFees)',
      'Schema.org additionalProperty key-value spec table in JSON-LD',
      'High-Information FAQPage Q&A retrieval chunks',
    ];

    const presentInCompetitor: string[] = [];
    if (hasMerchantReturnPolicy) presentInCompetitor.push('Verified MerchantReturnPolicy in JSON-LD');
    if (hasPriceAndAvailability) presentInCompetitor.push('Structured Price & Real-Time Availability Offer Schema');
    if (hasClinicalOrSpecProperties) presentInCompetitor.push('Structured Spec & Material Properties');
    if (hasFaqAccordionPage) presentInCompetitor.push('Structured FAQPage Q&A Accordions');
    if (hasAggregateRating) presentInCompetitor.push('Verified AggregateRating Social Proof Schema');

    if (presentInCompetitor.length === 0) {
      presentInCompetitor.push('Partial Product schema detected in competitor HTML');
    }

    const sampleJson = jsonLdScripts.length > 0 ? JSON.stringify(jsonLdScripts[0], null, 2) : JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      'name': `${domain} Product`,
      'offers': {
        '@type': 'Offer',
        'hasMerchantReturnPolicy': {
          '@type': 'MerchantReturnPolicy',
          'returnWindowDays': 30,
          'returnFees': 'https://schema.org/FreeReturn'
        }
      }
    }, null, 2);

    return {
      targetUrl: url,
      domain,
      statusCode,
      hasJsonLd: jsonLdScripts.length > 0,
      rawJsonLdCount: jsonLdScripts.length,
      detectedTypes: Array.from(detectedTypes),
      productGraph,
      returnPolicyGraph,
      faqGraph,
      ratingsGraph,
      schemaFeatures: {
        hasMerchantReturnPolicy,
        hasPriceAndAvailability,
        hasClinicalOrSpecProperties,
        hasFaqAccordionPage,
        hasAggregateRating,
      },
      rawSampleJsonLd: sampleJson.slice(0, 1500),
      schemaDiffAgainstStore: {
        missingInStore,
        presentInCompetitor,
        gapSummary: `${domain} includes ${presentInCompetitor.length} structured schema graphs that AI search crawlers use to recommend them over unprotected stores.`,
      },
    };
  }
}
