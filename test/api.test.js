import { describe, it, expect } from 'vitest';
import { validateImageBase64, stripDataUrl, isUuid } from '../api/_lib/validate.js';
import { rateLimit } from '../api/_lib/ratelimit.js';
import analyzeHandler from '../api/analyze.js';
import capturesHandler from '../api/captures/index.js';
import captureByIdHandler from '../api/captures/[id].js';

// A valid-looking base64 image payload (content doesn't matter for validation)
const FAKE_IMAGE = 'data:image/jpeg;base64,' + 'A'.repeat(200);

/* ── Mock Vercel req/res ─────────────────────────────────────── */
const mockRes = () => {
  const res = { statusCode: 200, headers: {}, body: undefined };
  res.status = (c) => ((res.statusCode = c), res);
  res.json = (b) => ((res.body = b), res);
  res.setHeader = (k, v) => (res.headers[k] = v);
  return res;
};
const call = async (handler, { method = 'GET', query = {}, body, headers = {} } = {}) => {
  const res = mockRes();
  await handler({ method, query, body, headers }, res);
  return res;
};

/* ── validate.js ─────────────────────────────────────────────── */
describe('validateImageBase64', () => {
  it('accepts a data-URL jpeg', () => {
    expect(validateImageBase64(FAKE_IMAGE)).toBeNull();
  });
  it('accepts raw base64 without data-URL prefix', () => {
    expect(validateImageBase64('A'.repeat(200))).toBeNull();
  });
  it('rejects non-strings and short strings', () => {
    expect(validateImageBase64(undefined)).toBeTruthy();
    expect(validateImageBase64(123)).toBeTruthy();
    expect(validateImageBase64('short')).toBeTruthy();
  });
  it('rejects oversized payloads', () => {
    const huge = 'data:image/jpeg;base64,' + 'A'.repeat(6_000_001);
    expect(validateImageBase64(huge)).toMatch(/too large/i);
  });
  it('rejects non-base64 content', () => {
    expect(validateImageBase64('data:image/jpeg;base64,' + '!@#$%^'.repeat(40))).toBeTruthy();
  });
});

describe('stripDataUrl', () => {
  it('strips the data-URL prefix', () => {
    expect(stripDataUrl('data:image/png;base64,abc123')).toBe('abc123');
  });
  it('passes through raw base64 unchanged', () => {
    expect(stripDataUrl('abc123')).toBe('abc123');
  });
});

describe('isUuid', () => {
  it('accepts a valid uuid', () => {
    expect(isUuid('00000000-0000-4000-8000-000000000000')).toBe(true);
  });
  it('rejects junk, injection attempts, and non-strings', () => {
    expect(isUuid('not-a-uuid')).toBe(false);
    expect(isUuid("1; DROP TABLE captures;--")).toBe(false);
    expect(isUuid(null)).toBe(false);
  });
});

/* ── ratelimit.js ────────────────────────────────────────────── */
describe('rateLimit', () => {
  it('allows requests within the limit and blocks beyond it', () => {
    const req = { headers: { 'x-forwarded-for': '203.0.113.7' } };
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(req, { limit: 5, windowMs: 60_000 })).toBe(true);
    }
    expect(rateLimit(req, { limit: 5, windowMs: 60_000 })).toBe(false);
  });
  it('tracks IPs independently', () => {
    const a = { headers: { 'x-forwarded-for': '203.0.113.8' } };
    const b = { headers: { 'x-forwarded-for': '203.0.113.9' } };
    expect(rateLimit(a, { limit: 1, windowMs: 60_000 })).toBe(true);
    expect(rateLimit(b, { limit: 1, windowMs: 60_000 })).toBe(true);
    expect(rateLimit(a, { limit: 1, windowMs: 60_000 })).toBe(false);
  });
});

/* ── Handler guard paths (no network/DB — all return before I/O) ── */
describe('POST /api/analyze guards', () => {
  it('rejects non-POST methods', async () => {
    const res = await call(analyzeHandler, { method: 'GET' });
    expect(res.statusCode).toBe(405);
  });
  it('rejects a missing image with 400', async () => {
    const res = await call(analyzeHandler, { method: 'POST', body: {} });
    expect(res.statusCode).toBe(400);
  });
});

describe('/api/captures guards', () => {
  it('rejects unsupported methods', async () => {
    const res = await call(capturesHandler, { method: 'PUT' });
    expect(res.statusCode).toBe(405);
  });
  it('rejects POST without an image', async () => {
    const res = await call(capturesHandler, { method: 'POST', body: { vibe_score: 80 } });
    expect(res.statusCode).toBe(400);
  });
  it('rejects POST with image but missing text fields', async () => {
    const res = await call(capturesHandler, {
      method: 'POST',
      body: { imageBase64: FAKE_IMAGE, vibe_score: 80 },
    });
    expect(res.statusCode).toBe(400);
  });
  it('rejects POST with non-array suggestions', async () => {
    const res = await call(capturesHandler, {
      method: 'POST',
      body: {
        imageBase64: FAKE_IMAGE,
        vibe_score: 80,
        verdict_quote: 'q',
        vibe_label: 'l',
        vibe_color: '#fff',
        suggestions: 'not-an-array',
      },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('/api/captures/:id guards', () => {
  it('rejects an invalid id with 400 before touching the DB', async () => {
    const res = await call(captureByIdHandler, { query: { id: 'not-a-uuid' } });
    expect(res.statusCode).toBe(400);
  });
  it('rejects unsupported methods on a valid id', async () => {
    // 405 check happens after id validation but before any query
    const res = await call(captureByIdHandler, {
      method: 'PATCH',
      query: { id: '00000000-0000-4000-8000-000000000000' },
    });
    expect(res.statusCode).toBe(405);
  });
});
