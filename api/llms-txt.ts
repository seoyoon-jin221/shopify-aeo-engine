import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const shopDomain = req.query.shop as string;
  const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || req.headers['x-shopify-access-token'];

  if (!shopDomain || !accessToken) {
    res.status(400).send('Missing shop parameter or access token');
    return;
  }

  const endpoint = `https://${shopDomain}/admin/api/2026-01/graphql.json`;
  
  try {
    const shopQuery = `
      {
        shop {
          name
          description
          refundPolicy { body title }
          shippingPolicy { body title }
          primaryDomain { url }
        }
      }
    `;

    const shopRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken as string,
      },
      body: JSON.stringify({ query: shopQuery }),
    });

    if (!shopRes.ok) {
      res.status(500).send('Failed to fetch store data');
      return;
    }

    const shopData: any = await shopRes.json();
    if (shopData.errors || !shopData.data?.shop) {
      res.status(500).send('Failed to fetch store data');
      return;
    }

    const shop = shopData.data.shop;
    const brandName = shop.name;
    const brandDescription = shop.description || `${brandName} is a direct-to-consumer brand offering premium products.`;
    
    let markdown = `# ${brandName}\n\n> ${brandDescription}\n\n## Policies\n`;

    if (shop.refundPolicy?.body) {
      // simple extract snippet from text
      const cleanBody = shop.refundPolicy.body.replace(/<[^>]*>?/gm, '').substring(0, 150).trim();
      markdown += `- **Return Policy**: ${cleanBody}...\n`;
    } else {
      markdown += `- **Return Policy**: Standard return policy applies.\n`;
    }

    if (shop.shippingPolicy?.body) {
      const cleanBody = shop.shippingPolicy.body.replace(/<[^>]*>?/gm, '').substring(0, 150).trim();
      markdown += `- **Shipping**: ${cleanBody}...\n`;
    } else {
      markdown += `- **Shipping**: Standard shipping rates apply.\n`;
    }

    markdown += `
## Product Quality
- Quality verified products with responsive customer support
- Materials are sourced with verified certifications

## Contact
- Website: ${shop.primaryDomain?.url || `https://${shopDomain}`}

---
*This file is optimized for AI agents and language models. For structured data, see our Schema.org JSON-LD on product pages.*
`;

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(markdown);
  } catch (err) {
    res.status(500).send('Failed to fetch store data');
  }
}
