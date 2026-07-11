import { del } from '@vercel/blob';
import { sql } from '../_lib/db.js';
import { isUuid } from '../_lib/validate.js';

/**
 * GET    /api/captures/:id → single capture
 * DELETE /api/captures/:id → removes DB row + stored image, returns { ok: true }
 */
export default async function handler(req, res) {
  const { id } = req.query;
  if (!isUuid(id)) return res.status(400).json({ error: 'Invalid capture id' });

  try {
    if (req.method === 'GET') {
      const [capture] = await sql`SELECT * FROM captures WHERE id = ${id}`;
      if (!capture) return res.status(404).json({ error: 'Capture not found' });
      return res.status(200).json(capture);
    }

    if (req.method === 'DELETE') {
      const [capture] = await sql`DELETE FROM captures WHERE id = ${id} RETURNING image_url`;
      if (!capture) return res.status(404).json({ error: 'Capture not found' });

      // Remove the stored image. Legacy Supabase URLs are skipped — those
      // files live in the old project and get cleaned up when it's deleted.
      if (capture.image_url?.includes('.blob.vercel-storage.com/')) {
        await del(capture.image_url).catch((err) => console.error('Blob delete failed:', err));
      }
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('capture error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
