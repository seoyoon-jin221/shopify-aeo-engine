import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');

  if (!process.env.CRON_SECRET) {
    return res.status(200).json({ status: 'UNCONFIGURED', message: 'Set CRON_SECRET environment variable' });
  }

  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const shopDomain = 'default-shop.myshopify.com'; // Hardcoded or fetch from DB if needed
    const perplexityKey = process.env.PERPLEXITY_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!perplexityKey && !geminiKey) {
      return res.status(200).json({
        status: 'NO_API_KEYS',
        message: 'Configure PERPLEXITY_API_KEY or GEMINI_API_KEY to enable sentinel checks'
      });
    }

    const category = 'ecommerce';
    const queries = [
      `best ${category} products to buy online 2026`,
      `where to buy ${shopDomain} products with free shipping`,
      `${shopDomain} product reviews and return policy`
    ];

    let citedInQueries = 0;

    for (const query of queries) {
      let content = '';
      if (perplexityKey) {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${perplexityKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3-sonar-small-32k-online',
            messages: [{ role: 'user', content: query }]
          })
        });
        if (response.ok) {
          const data = await response.json();
          content = data.choices?.[0]?.message?.content || '';
          const citations = data.citations || [];
          if (citations.some((c: string) => c.includes(shopDomain))) {
            citedInQueries++;
            continue;
          }
        }
      } else if (geminiKey) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: query }] }]
          })
        });
        if (response.ok) {
          const data = await response.json();
          content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      }
      
      if (content.toLowerCase().includes(shopDomain.toLowerCase())) {
        citedInQueries++;
      }
    }

    return res.status(200).json({
      citedInQueries,
      totalQueriesChecked: 3,
      citationFound: citedInQueries > 0,
      lastChecked: new Date().toISOString(),
      status: 'SUCCESS'
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
