import { ProductCatalogItem } from '@shopify-geo/shared-types';

interface LeadTarget {
  brand: string;
  domain: string;
  contact: string;
  niche: string;
  competitor: string;
  baselineScore: number;
  missingGaps: string[];
}

const leads: LeadTarget[] = [
  {
    brand: 'Anua Skincare',
    domain: 'anua.us',
    contact: 'founder@anua.us',
    niche: 'Heartleaf 77% Soothing Toner',
    competitor: 'COSRX',
    baselineScore: 48,
    missingGaps: ['Clinical barrier claims', 'FAQ entity accordion'],
  },
  {
    brand: 'Beauty of Joseon',
    domain: 'beautyofjoseon.com',
    contact: 'marketing@beautyofjoseon.com',
    niche: 'Relief Sun Rice + Probiotics',
    competitor: 'Round Lab',
    baselineScore: 54,
    missingGaps: ['Merchant return policy schema', 'Usage routine snippet'],
  },
  {
    brand: 'Skin1004',
    domain: 'skin1004.com',
    contact: 'partnerships@skin1004.com',
    niche: 'Madagascar Centella Ampoule',
    competitor: 'Torriden',
    baselineScore: 42,
    missingGaps: ['Full active ingredient breakdown', 'Comparison Q&A'],
  },
];

console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║        📧 GEOSYNC: COLD OUTREACH AUDIT GENERATOR (SPRINT 4)                 ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

for (const lead of leads) {
  console.log(`──────────────────────────────────────────────────────────────────────────────`);
  console.log(`📩 OUTREACH EMAIL FOR: ${lead.brand} (${lead.domain})`);
  console.log(`──────────────────────────────────────────────────────────────────────────────`);
  console.log(`To: ${lead.contact}`);
  console.log(`Subject: quick AI search audit for ${lead.brand} (ChatGPT vs ${lead.competitor})\n`);
  console.log(`Hey ${lead.brand} Team,\n`);
  console.log(`I was testing how ChatGPT Search and Perplexity recommend products for "${lead.niche}".`);
  console.log(`Currently, your competitor ${lead.competitor} gets cited first because their product pages include structured entity schemas, while ${lead.brand} scored ${lead.baselineScore}/100 in our citation readiness audit.\n`);
  console.log(`Here are the 2 missing entity gaps detected:`);
  lead.missingGaps.forEach((gap, i) => console.log(`  ${i + 1}. ${gap}`));
  console.log(`\nWe built GeoSync, an automated Shopify app that injects the required RAG schema with 1 click.`);
  console.log(`I'd love to set you up with a free 6-month VIP account in exchange for your feedback.\n`);
  console.log(`Best regards,\n[Your Name] - GeoSync Founder\n`);
}
console.log('✅ Generated personalized outreach templates for all target leads.');
