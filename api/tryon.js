import { validateImageBase64, stripDataUrl } from './_lib/validate.js';
import { rateLimit } from './_lib/ratelimit.js';

// Gemini's image-editing model ("nano banana"). Provider is isolated behind
// this endpoint — swapping to a dedicated try-on model (FASHN, IDM-VTON)
// later only changes this file.
const GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image';

const TRYON_PROMPT =
  'Virtual try-on. The first image is a photo of a person; the second image ' +
  'is a garment product photo. Edit the first photo so the person is wearing ' +
  'the garment from the second image: replace their current upper-body ' +
  'clothing with it, fitted naturally to their body with realistic drape, ' +
  'folds, and lighting that matches the scene. Keep the person\'s face, ' +
  'hair, pose, body proportions, and the background exactly as they are. ' +
  'Output only the edited photo.';

const mimeOf = (dataUrl, fallback) =>
  dataUrl.startsWith('data:image/png') ? 'image/png'
  : dataUrl.startsWith('data:image/webp') ? 'image/webp'
  : dataUrl.startsWith('data:image/jpeg') ? 'image/jpeg'
  : fallback;

/**
 * POST /api/tryon { personImageBase64, garmentImageBase64 }
 *   → { imageBase64 } — data URL of the person wearing the garment
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  // Image generation is the most expensive endpoint — keep the limit tight
  if (!rateLimit(req, { limit: 5, windowMs: 60_000 })) {
    return res.status(429).json({ error: 'Too many try-ons — wait a minute and try again' });
  }

  const { personImageBase64, garmentImageBase64 } = req.body || {};
  const personError = validateImageBase64(personImageBase64 || '');
  if (personError) return res.status(400).json({ error: `person image: ${personError}` });
  const garmentError = validateImageBase64(garmentImageBase64 || '');
  if (garmentError) return res.status(400).json({ error: `garment image: ${garmentError}` });

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    console.error('GEMINI_API_KEY is not set');
    return res.status(500).json({ error: 'AI try-on is not configured' });
  }

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: TRYON_PROMPT },
              { inlineData: { mimeType: mimeOf(personImageBase64, 'image/jpeg'), data: stripDataUrl(personImageBase64) } },
              { inlineData: { mimeType: mimeOf(garmentImageBase64, 'image/png'), data: stripDataUrl(garmentImageBase64) } },
            ],
          }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
        }),
        signal: AbortSignal.timeout(55_000),
      }
    );

    if (!geminiRes.ok) {
      const detail = await geminiRes.text().catch(() => '');
      console.error('Gemini image error:', geminiRes.status, detail.slice(0, 500));
      return res.status(502).json({
        error: geminiRes.status === 429
          ? 'AI try-on quota exceeded — try again later'
          : 'AI try-on failed',
      });
    }

    const data = await geminiRes.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p) => p.inlineData?.data);
    if (!imagePart) {
      // Model replied with text only (e.g. a refusal) — surface something useful
      const text = parts.find((p) => p.text)?.text || '';
      console.error('Gemini returned no image:', text.slice(0, 300) || JSON.stringify(data).slice(0, 300));
      return res.status(502).json({ error: 'AI returned no image — try a clearer, well-lit photo' });
    }

    const mime = imagePart.inlineData.mimeType || 'image/png';
    return res.status(200).json({ imageBase64: `data:${mime};base64,${imagePart.inlineData.data}` });
  } catch (err) {
    console.error('tryon error:', err);
    const timedOut = err.name === 'TimeoutError' || err.name === 'AbortError';
    return res.status(timedOut ? 504 : 500).json({
      error: timedOut ? 'AI try-on timed out — please try again' : 'Internal server error',
    });
  }
}
