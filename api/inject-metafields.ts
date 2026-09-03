import type { VercelRequest, VercelResponse } from './types';

function parseRefundPolicy(bodyHtml: string) {
  if (!bodyHtml) return null;
  const lowerBody = bodyHtml.toLowerCase();
  
  let returnDays: number | null = null;
  const daysMatch = lowerBody.match(/(\d+)\s*days/);
  if (daysMatch) {
    returnDays = parseInt(daysMatch[1], 10);
  } else if (lowerBody.includes('30 days')) {
    returnDays = 30;
  } else if (lowerBody.includes('60 days')) {
    returnDays = 60;
  } else if (lowerBody.includes('14 days')) {
    returnDays = 14;
  } else if (lowerBody.includes('90 days')) {
    returnDays = 90;
  }

  const freeReturns = lowerBody.includes('free return') || lowerBody.includes('no cost') || lowerBody.includes('prepaid');
  
  let returnMethod: string | null = null;
  if (lowerBody.includes('mail')) returnMethod = 'https://schema.org/ReturnByMail';
  else if (lowerBody.includes('in-store')) returnMethod = 'https://schema.org/ReturnInStore';
  else if (lowerBody.includes('drop-off')) returnMethod = 'https://schema.org/ReturnAtKiosk';
  else if (returnDays) returnMethod = 'https://schema.org/ReturnByMail'; // Default if applicable

  return { returnDays, freeReturns, returnMethod };
}

function parseShippingPolicy(bodyHtml: string) {
  if (!bodyHtml) return null;
  const lowerBody = bodyHtml.toLowerCase();
  
  const freeShipping = lowerBody.includes('free shipping') || lowerBody.includes('free standard shipping') || lowerBody.includes('complimentary shipping');
  
  let transitDays: { min: number, max: number } | null = null;
  const transitMatch = lowerBody.match(/(\d+)-(\d+)\s*(?:business\s*)?days/);
  if (transitMatch) {
    transitDays = { min: parseInt(transitMatch[1], 10), max: parseInt(transitMatch[2], 10) };
  } else if (lowerBody.includes('3-5 business days')) {
    transitDays = { min: 3, max: 5 };
  } else if (lowerBody.includes('5-7 days')) {
    transitDays = { min: 5, max: 7 };
  }
  
  return { freeShipping, transitDays, country: 'US' };
}

function findReviewData(metafields: Array<{namespace: string, key: string, value: string}>) {
  if (!metafields || metafields.length === 0) return null;
  
  for (const mf of metafields) {
    if (['judgeme', 'yotpo', 'stamped'].includes(mf.namespace)) {
      if (mf.key === 'reviews_average') {
        const countMf = metafields.find(m => m.namespace === mf.namespace && m.key === 'reviews_count');
        if (countMf) return { ratingValue: mf.value, reviewCount: countMf.value };
      }
    } else if (mf.namespace === 'reviews') {
      if (mf.key === 'rating') {
        try {
          const parsed = JSON.parse(mf.value);
          const ratingValue = parsed.value || mf.value;
          const countMf = metafields.find(m => m.namespace === mf.namespace && m.key === 'rating_count');
          if (countMf) return { ratingValue: ratingValue.toString(), reviewCount: countMf.value.toString() };
        } catch {
          const countMf = metafields.find(m => m.namespace === mf.namespace && m.key === 'rating_count');
          if (countMf) return { ratingValue: mf.value, reviewCount: countMf.value };
        }
      }
    } else if (mf.namespace === 'loox') {
      if (mf.key === 'avg_rating') {
        const countMf = metafields.find(m => m.namespace === mf.namespace && m.key === 'num_reviews');
        if (countMf) return { ratingValue: mf.value, reviewCount: countMf.value };
      }
    }
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Shopify-Access-Token');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const body = req.body || {};
  const shopDomain = body.shopDomain || req.query.shopDomain;
  let targetProductId = body.productId;

  const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || req.headers['x-shopify-access-token'];
  
  if (!accessToken || !shopDomain) {
    res.status(401).json({ success: false, error: 'Missing Shopify access token' });
    return;
  }

  const endpoint = `https://${shopDomain}/admin/api/2026-01/graphql.json`;

  try {
    const shopQuery = `
      {
        shop {
          name
          description
          currencyCode
          primaryDomain { url host }
          refundPolicy { body title url }
          shippingPolicy { body title url }
        }
      }
    `;

    const productQuery = targetProductId ? `
      query($productId: ID!) {
        product(id: $productId) {
          id
          title
          description
          descriptionHtml
          productType
          vendor
          tags
          variants(first: 1) {
            edges {
              node { price compareAtPrice inventoryQuantity sku }
            }
          }
          metafields(first: 30) {
            edges {
              node { namespace key value type }
            }
          }
        }
      }
    ` : `
      {
        products(first: 1) {
          edges {
            node {
              id
              title
              description
              descriptionHtml
              productType
              vendor
              tags
              variants(first: 1) {
                edges {
                  node { price compareAtPrice inventoryQuantity sku }
                }
              }
              metafields(first: 30) {
                edges {
                  node { namespace key value type }
                }
              }
            }
          }
        }
      }
    `;

    const variables = targetProductId ? { productId: targetProductId } : undefined;

    const [shopRes, productRes] = await Promise.all([
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': accessToken as string },
        body: JSON.stringify({ query: shopQuery }),
      }),
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': accessToken as string },
        body: JSON.stringify({ query: productQuery, variables }),
      })
    ]);

    if (!shopRes.ok || !productRes.ok) {
      res.status(500).json({ success: false, error: 'Failed to fetch store data' });
      return;
    }

    const shopData: any = await shopRes.json();
    const productData: any = await productRes.json();

    if (shopData.errors || productData.errors) {
      res.status(500).json({ success: false, error: 'Failed to fetch store data' });
      return;
    }

    const shop = shopData.data?.shop;
    let product = targetProductId ? productData.data?.product : productData.data?.products?.edges?.[0]?.node;

    if (!shop || !product) {
      res.status(404).json({ success: false, error: 'Shop or product not found' });
      return;
    }
    
    targetProductId = product.id;

    const refundPolicyParsed = parseRefundPolicy(shop.refundPolicy?.body || '');
    const shippingPolicyParsed = parseShippingPolicy(shop.shippingPolicy?.body || '');
    
    const metafields = product.metafields?.edges?.map((e: any) => e.node) || [];
    const reviewData = findReviewData(metafields);

    const variant = product.variants?.edges?.[0]?.node;
    const price = variant?.price || '0.00';
    const inventory = variant?.inventoryQuantity || 0;
    
    const additionalProperties = [];
    if (product.tags && product.tags.length > 0) {
      for (const tag of product.tags) {
        additionalProperties.push({ '@type': 'PropertyValue', 'name': 'Tag', 'value': tag });
      }
    }

    const structuredData: any = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      'name': product.title,
      'category': product.productType || 'Uncategorized',
      'brand': {
        '@type': 'Brand',
        'name': shop.name,
        'url': shop.primaryDomain?.url || `https://${shopDomain}`,
      },
      'offers': {
        '@type': 'Offer',
        'priceCurrency': shop.currencyCode || 'USD',
        'price': price,
        'availability': inventory > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        'itemCondition': 'https://schema.org/NewCondition',
      }
    };

    if (product.description) {
      structuredData.description = product.description;
    }

    if (reviewData) {
      structuredData.aggregateRating = {
        '@type': 'AggregateRating',
        'ratingValue': reviewData.ratingValue,
        'reviewCount': reviewData.reviewCount,
      };
    }

    if (refundPolicyParsed && refundPolicyParsed.returnDays) {
      structuredData.offers.hasMerchantReturnPolicy = {
        '@type': 'MerchantReturnPolicy',
        'applicableCountry': 'US',
        'returnPolicyCategory': 'https://schema.org/MerchantReturnFiniteReturnWindow',
        'merchantReturnDays': refundPolicyParsed.returnDays,
      };
      if (refundPolicyParsed.returnMethod) {
        structuredData.offers.hasMerchantReturnPolicy.returnMethod = refundPolicyParsed.returnMethod;
      }
      if (refundPolicyParsed.freeReturns) {
        structuredData.offers.hasMerchantReturnPolicy.returnFees = 'https://schema.org/FreeReturn';
      }
    }

    if (shippingPolicyParsed) {
      structuredData.offers.shippingDetails = {
        '@type': 'OfferShippingDetails',
        'shippingRate': {
          '@type': 'MonetaryAmount',
          'value': shippingPolicyParsed.freeShipping ? '0' : undefined,
          'currency': shop.currencyCode || 'USD',
        },
        'shippingDestination': {
          '@type': 'DefinedRegion',
          'addressCountry': shippingPolicyParsed.country,
        },
      };
      if (shippingPolicyParsed.transitDays) {
        structuredData.offers.shippingDetails.deliveryTime = {
          '@type': 'ShippingDeliveryTime',
          'transitTime': { 
            '@type': 'QuantitativeValue', 
            'minValue': shippingPolicyParsed.transitDays.min, 
            'maxValue': shippingPolicyParsed.transitDays.max, 
            'unitCode': 'DAY' 
          },
        };
      }
    }

    if (additionalProperties.length > 0) {
      structuredData.additionalProperty = additionalProperties;
    }

    const faqQuestions = [];

    if (refundPolicyParsed && refundPolicyParsed.returnDays) {
      const freeStr = refundPolicyParsed.freeReturns ? 'with free returns' : '';
      faqQuestions.push({
        '@type': 'Question',
        'name': `What is the return policy for ${product.title}?`,
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': `We offer a ${refundPolicyParsed.returnDays}-day return policy ${freeStr}.`,
        },
      });
    }

    if (shippingPolicyParsed) {
      const freeStr = shippingPolicyParsed.freeShipping ? 'We offer free shipping. ' : '';
      const timeStr = shippingPolicyParsed.transitDays ? `Orders typically arrive in ${shippingPolicyParsed.transitDays.min}-${shippingPolicyParsed.transitDays.max} days.` : '';
      if (freeStr || timeStr) {
        faqQuestions.push({
          '@type': 'Question',
          'name': `What are the shipping options for ${product.title}?`,
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': `${freeStr}${timeStr}`.trim(),
          },
        });
      }
    }

    if (reviewData) {
      faqQuestions.push({
        '@type': 'Question',
        'name': `What do customers say about ${product.title}?`,
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': `Our product is rated ${reviewData.ratingValue} out of 5 stars based on ${reviewData.reviewCount} verified customer reviews.`,
        },
      });
    }

    const faqData = faqQuestions.length > 0 ? {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': faqQuestions,
    } : null;

    const mutation = `
      mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { id namespace key value }
          userErrors { field message }
        }
      }
    `;

    const metafieldsToSet = [
      {
        ownerId: targetProductId,
        namespace: 'geo_engine',
        key: 'structured_data',
        type: 'json',
        value: JSON.stringify(structuredData),
      }
    ];

    if (faqData) {
      metafieldsToSet.push({
        ownerId: targetProductId,
        namespace: 'geo_engine',
        key: 'faq_data',
        type: 'json',
        value: JSON.stringify(faqData),
      });
    }

    const variablesMutation = { metafields: metafieldsToSet };

    const gqlRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken as string,
      },
      body: JSON.stringify({ query: mutation, variables: variablesMutation }),
    });

    if (!gqlRes.ok) {
      res.status(500).json({ success: false, error: 'Failed to write data to Shopify' });
      return;
    }
    
    const graphQlResult: any = await gqlRes.json();
    
    if (graphQlResult.errors || graphQlResult.data?.metafieldsSet?.userErrors?.length > 0) {
       res.status(500).json({ success: false, error: 'Failed to write data to Shopify', details: graphQlResult.data?.metafieldsSet?.userErrors });
       return;
    }

    res.status(200).json({
      success: true,
      shopDomain,
      productTitle: product.title,
      targetProductId,
      injectedMetafields: metafieldsToSet.map(m => ({ namespace: m.namespace, key: m.key, type: m.type })),
      structuredData,
      faqData,
      graphQlMutation: 'EXECUTED_LIVE',
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: errMsg });
  }
}
