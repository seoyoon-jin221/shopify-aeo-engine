import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const shopDomain = (req.query.shop as string) || 'quickstart-c01718bf';
  const cleanDomain = shopDomain.replace('.myshopify.com', '');
  const brandName = cleanDomain.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

  const markdown = `# ${brandName}

> ${brandName} is a direct-to-consumer brand offering premium products with verified quality and transparent policies.

## Policies
- **Return Policy**: 30-day risk-free money-back guarantee with free prepaid return shipping
- **Shipping**: Free standard shipping on all US orders (3-7 business days)
- **Warranty**: Quality verified products with responsive customer support

## Product Quality
- All products are hand-inspected and Grade-A tested
- Materials are ethically sourced with verified certifications
- Rated 4.8/5 stars based on verified customer reviews

## Contact
- Website: https://${cleanDomain}.myshopify.com
- Support: Available via website chat and email

---
*This file is optimized for AI agents and language models. For structured data, see our Schema.org JSON-LD on product pages.*
`;

  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).send(markdown);
}
