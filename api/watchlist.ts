import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, memoryStore } from './lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const shopDomain =
    (req.query.shopDomain as string) ||
    (req.body && req.body.shopDomain) ||
    'quickstart-c01718bf';
  const cleanDomain = shopDomain.replace('.myshopify.com', '').replace('https://', '');

  // GET: List watchlist
  if (req.method === 'GET') {
    const sql = getDb();
    if (sql) {
      try {
        const rows = await sql`
          SELECT id, brand_name, website_url, canonical_domain, detected_schemas, last_scraped_at, status
          FROM competitor_watchlist
          WHERE shop_domain = ${cleanDomain}
          ORDER BY created_at DESC;
        `;
        const rivals = rows.map((r: any) => ({
          id: r.id,
          brandName: r.brand_name,
          url: r.website_url,
          domain: r.canonical_domain,
          schemaTypes: Array.isArray(r.detected_schemas)
            ? r.detected_schemas
            : JSON.parse(r.detected_schemas || '[]'),
          status: r.status,
          addedAt: r.last_scraped_at,
        }));
        res.status(200).json({ success: true, watchlist: rivals });
        return;
      } catch (err) {
        console.warn('[Watchlist] DB read error, using memory fallback:', err);
      }
    }

    const memoryList = memoryStore.watchlist.get(cleanDomain) || [];
    res.status(200).json({ success: true, watchlist: memoryList });
    return;
  }

  // POST: Add new rival
  if (req.method === 'POST') {
    try {
      const { url, domain, brandName, schemaTypes } = req.body || {};
      if (!url || !domain) {
        res.status(400).json({ success: false, error: 'Missing url or domain' });
        return;
      }

      const sql = getDb();
      if (sql) {
        try {
          await sql`
            INSERT INTO competitor_watchlist (shop_domain, brand_name, website_url, canonical_domain, detected_schemas, status)
            VALUES (${cleanDomain}, ${brandName || domain}, ${url}, ${domain}, ${JSON.stringify(schemaTypes || [])}::jsonb, 'TRACKED');
          `;
        } catch (dbErr) {
          console.warn('[Watchlist] DB write error, saving to memory fallback:', dbErr);
        }
      }

      const memoryList = memoryStore.watchlist.get(cleanDomain) || [];
      const newEntry = {
        brandName: brandName || domain,
        url,
        domain,
        schemaTypes: schemaTypes || [],
        status: 'tracked',
        addedAt: new Date().toISOString(),
      };
      memoryList.push(newEntry);
      memoryStore.watchlist.set(cleanDomain, memoryList);

      res.status(200).json({ success: true, entry: newEntry });
      return;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: errMsg });
      return;
    }
  }

  // DELETE: Remove rival
  if (req.method === 'DELETE') {
    const { domain } = req.body || req.query || {};
    if (!domain) {
      res.status(400).json({ success: false, error: 'Missing domain parameter' });
      return;
    }

    const sql = getDb();
    if (sql) {
      try {
        await sql`
          DELETE FROM competitor_watchlist
          WHERE shop_domain = ${cleanDomain} AND canonical_domain = ${domain as string};
        `;
      } catch (dbErr) {
        console.warn('[Watchlist] DB delete error:', dbErr);
      }
    }

    const memoryList = memoryStore.watchlist.get(cleanDomain) || [];
    const updated = memoryList.filter((item: any) => item.domain !== domain);
    memoryStore.watchlist.set(cleanDomain, updated);

    res.status(200).json({ success: true, removedDomain: domain });
  }
}
