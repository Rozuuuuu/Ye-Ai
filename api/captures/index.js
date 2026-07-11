import { put } from '@vercel/blob';
import { sql } from '../_lib/db.js';
import { validateImageBase64, stripDataUrl } from '../_lib/validate.js';
import { rateLimit } from '../_lib/ratelimit.js';

/**
 * GET  /api/captures?limit=N  → { captures: [...], total }
 * POST /api/captures          → stores image in Vercel Blob + inserts record, returns the row
 */
export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
      const [captures, [{ total }]] = await Promise.all([
        sql`SELECT id, created_at, image_url, vibe_score, verdict_quote, vibe_label, vibe_color, suggestions, palette
            FROM captures ORDER BY created_at DESC LIMIT ${limit}`,
        sql`SELECT count(*)::int AS total FROM captures`,
      ]);
      return res.status(200).json({ captures, total });
    }

    if (req.method === 'POST') {
      if (!rateLimit(req, { limit: 20, windowMs: 60_000 })) {
        return res.status(429).json({ error: 'Too many requests — try again in a minute' });
      }

      const {
        imageBase64,
        vibe_score,
        verdict_quote,
        vibe_label,
        vibe_color,
        suggestions = [],
        palette = [],
      } = req.body || {};

      const imageError = validateImageBase64(imageBase64 || '');
      if (imageError) return res.status(400).json({ error: imageError });

      const textFields = [verdict_quote, vibe_label, vibe_color];
      if (!textFields.every((v) => typeof v === 'string' && v.length > 0 && v.length < 2000)) {
        return res.status(400).json({ error: 'verdict_quote, vibe_label and vibe_color are required strings' });
      }
      if (!Array.isArray(suggestions) || !Array.isArray(palette)) {
        return res.status(400).json({ error: 'suggestions and palette must be arrays' });
      }
      const score = Math.min(Math.max(Math.round(Number(vibe_score) || 0), 0), 100);

      const buffer = Buffer.from(stripDataUrl(imageBase64), 'base64');
      const { url } = await put(`outfits/outfit_${Date.now()}.jpg`, buffer, {
        access: 'public',
        contentType: 'image/jpeg',
      });

      const [capture] = await sql`
        INSERT INTO captures (image_url, vibe_score, verdict_quote, vibe_label, vibe_color, suggestions, palette)
        VALUES (${url}, ${score}, ${verdict_quote}, ${vibe_label}, ${vibe_color},
                ${JSON.stringify(suggestions)}::jsonb, ${JSON.stringify(palette)}::jsonb)
        RETURNING *`;
      return res.status(201).json(capture);
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('captures error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
