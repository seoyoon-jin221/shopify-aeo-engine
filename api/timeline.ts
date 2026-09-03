import type { VercelRequest, VercelResponse } from './types';
import { getDb, memoryStore } from './lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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

  // POST: Record a new drift data point
  if (req.method === 'POST') {
    try {
      const body = req.body || {};
      const readinessScore = typeof body.readinessScore === 'number' ? body.readinessScore : 18;
      const citedCount = typeof body.citedCount === 'number' ? body.citedCount : 0;
      const totalQueries = typeof body.totalQueries === 'number' ? body.totalQueries : 120;
      const citationRate = totalQueries > 0 ? (citedCount / totalQueries) * 100 : 0;
      const granularity = body.granularity || 'MONTHLY';
      const recordedAt = new Date().toISOString();

      const sql = getDb();
      if (sql) {
        try {
          await sql`
            INSERT INTO drift_timeline (shop_domain, recorded_at, readiness_score, citation_rate, cited_count, total_queries, granularity)
            VALUES (${cleanDomain}, ${recordedAt}, ${readinessScore}, ${citationRate}, ${citedCount}, ${totalQueries}, ${granularity});
          `;
        } catch (dbErr) {
          console.warn('[Timeline] DB write error, storing in memory fallback:', dbErr);
        }
      }

      // Memory fallback
      const existing = memoryStore.driftTimeline.get(cleanDomain) || [];
      existing.push({
        date: recordedAt,
        readinessScore,
        citationRate,
        citedCount,
        totalQueries,
        granularity,
        label: 'Live Scan',
      });
      memoryStore.driftTimeline.set(cleanDomain, existing);

      res.status(200).json({ success: true, recordedAt });
      return;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: errMsg });
      return;
    }
  }

  // GET: Retrieve drift history
  try {
    const granularity = (req.query.granularity as string) || 'monthly';
    const sql = getDb();

    if (sql) {
      try {
        const rows = await sql`
          SELECT recorded_at, readiness_score, citation_rate, cited_count, total_queries, granularity
          FROM drift_timeline
          WHERE shop_domain = ${cleanDomain}
          ORDER BY recorded_at ASC
          LIMIT 50;
        `;
        if (rows.length > 0) {
          const points = rows.map((r: any) => ({
            date: r.recorded_at,
            readinessScore: Number(r.readiness_score),
            citationRate: Number(r.citation_rate),
            citedCount: Number(r.cited_count),
            totalQueries: Number(r.total_queries),
            granularity: r.granularity,
            label: 'Sentinel Snapshot',
          }));
          res.status(200).json({ success: true, shopDomain: cleanDomain, timeline: points });
          return;
        }
      } catch (dbErr) {
        console.warn('[Timeline] DB read error, using memory fallback:', dbErr);
      }
    }

    // Memory fallback
    const points = memoryStore.driftTimeline.get(cleanDomain) || [];
    res.status(200).json({ success: true, shopDomain: cleanDomain, timeline: points });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: errMsg });
  }
}
