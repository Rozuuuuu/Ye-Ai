import { validateImageBase64, stripDataUrl } from './_lib/validate.js';
import { rateLimit } from './_lib/ratelimit.js';

// 'gemini-flash-latest' tracks the current stable Flash model — the previously
// pinned gemini-2.0-flash has zero free-tier quota on this key
const GEMINI_MODEL = 'gemini-flash-latest';

// Structured output schema — Gemini returns exactly this JSON shape,
// replacing the old regex-extraction + hardcoded-fallback approach.
const VERDICT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    vibeScore: { type: 'INTEGER', description: 'Style score from 1 to 100' },
    verdict: { type: 'STRING', description: 'A stylish, witty one-sentence critique' },
    positives: { type: 'ARRAY', items: { type: 'STRING' } },
    suggestions: { type: 'ARRAY', items: { type: 'STRING' } },
    colorMatches: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['vibeScore', 'verdict', 'positives', 'suggestions', 'colorMatches'],
};

/**
 * Best-effort Lykdat call — returns null on any failure so analysis can proceed without tags.
 * Per https://apidocs.lykdat.com/: multipart form data with an `image` file,
 * publishable key in the `x-api-key` header. Services: 'items' | 'tags'.
 */
async function lykdat(service, imageBase64, apiKey) {
  try {
    const form = new FormData();
    form.append(
      'image',
      new Blob([Buffer.from(imageBase64, 'base64')], { type: 'image/jpeg' }),
      'outfit.jpg'
    );
    const response = await fetch(`https://cloudapi.lykdat.com/v1/detection/${service}`, {
      method: 'POST',
      headers: { 'x-api-key': apiKey },
      body: form,
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.error(`Lykdat ${service} error (${response.status}):`, await response.text().catch(() => ''));
      return null;
    }
    return await response.json();
  } catch (err) {
    console.error(`Lykdat ${service} failed:`, err.message);
    return null;
  }
}

/**
 * POST /api/analyze { imageBase64, colors? }
 *   → { vibeScore, verdict, positives, suggestions, colorMatches }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!rateLimit(req, { limit: 10, windowMs: 60_000 })) {
    return res.status(429).json({ error: 'Too many requests — try again in a minute' });
  }

  const { imageBase64, colors = [] } = req.body || {};
  const imageError = validateImageBase64(imageBase64 || '');
  if (imageError) return res.status(400).json({ error: imageError });

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    console.error('GEMINI_API_KEY is not set');
    return res.status(500).json({ error: 'AI analysis is not configured' });
  }

  const base64Data = stripDataUrl(imageBase64);

  try {
    // 1. Clothing tagging (both Lykdat services in parallel, fail-soft)
    let clothingTags = null;
    if (process.env.LYKDAT_API_KEY) {
      const [items, tags] = await Promise.all([
        lykdat('items', base64Data, process.env.LYKDAT_API_KEY),
        lykdat('tags', base64Data, process.env.LYKDAT_API_KEY),
      ]);
      if (items || tags) clothingTags = { items, tags };
    }

    // 2. Gemini analysis with structured JSON output
    const colorContext = Array.isArray(colors) && colors.length
      ? `\nDominant hex colors extracted from image: ${colors.slice(0, 10).join(', ')}`
      : '';
    const lykdatContext = clothingTags
      ? `\nLykdat AI clothing detection data for extra accuracy: ${JSON.stringify(clothingTags)}`
      : '';

    const prompt = `You are an expert fashion stylist AI. Analyze this outfit image and provide feedback.${colorContext}${lykdatContext}

Provide: vibeScore (1-100), verdict (a stylish, witty one-sentence critique), positives (things that work), suggestions (actionable improvement tips), colorMatches (suggested color palettes).`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
            ],
          }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: VERDICT_SCHEMA,
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      console.error('Gemini error:', geminiRes.status, await geminiRes.text().catch(() => ''));
      return res.status(502).json({ error: 'AI analysis failed' });
    }

    const geminiData = await geminiRes.json();
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error('Gemini returned no content:', JSON.stringify(geminiData).slice(0, 500));
      return res.status(502).json({ error: 'AI returned an empty response' });
    }

    return res.status(200).json(JSON.parse(text));
  } catch (err) {
    console.error('analyze error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
