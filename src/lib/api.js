/**
 * api.js — client for the Neon-backed API layer (Vercel serverless functions).
 *
 * Replaces the old direct Supabase client. Endpoint contract (Phase 2):
 *   GET    /api/captures?limit=N   → { captures: [...], total: number }
 *   GET    /api/captures/:id       → { ...capture }
 *   POST   /api/captures           → { ...capture }  (handles image storage server-side)
 *   DELETE /api/captures/:id       → { ok: true }    (removes DB row + stored image)
 *   POST   /api/analyze            → { vibeScore, verdict, positives, suggestions, colorMatches }
 *                                    (runs Lykdat tagging + Gemini server-side)
 *
 * Until those endpoints are deployed, every call rejects — callers already
 * handle failures (mock verdict fallback, empty archive, console warnings).
 */

const API_BASE = '/api';

const request = async (path, options = {}) => {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${detail || res.statusText}`);
  }
  return res.json();
};

export const fetchCaptures = (limit = 50) => request(`/captures?limit=${limit}`);

export const fetchCapture = (id) => request(`/captures/${id}`);

export const createCapture = (payload) =>
  request('/captures', { method: 'POST', body: JSON.stringify(payload) });

export const deleteCapture = (id) =>
  request(`/captures/${id}`, { method: 'DELETE' });

export const analyzeOutfit = (payload) =>
  request('/analyze', { method: 'POST', body: JSON.stringify(payload) });
