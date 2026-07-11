// Best-effort per-instance rate limiter. State lives in the warm function
// instance (resets on cold start) — enough to blunt casual quota abuse.
// For hard guarantees, move to a Postgres/KV-backed counter later.
const hits = new Map();

export function rateLimit(req, { limit = 10, windowMs = 60_000 } = {}) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded || 'unknown')
    .split(',')[0]
    .trim();

  const now = Date.now();
  const entry = hits.get(ip) || { count: 0, windowStart: now };
  if (now - entry.windowStart > windowMs) {
    entry.count = 0;
    entry.windowStart = now;
  }
  entry.count += 1;
  hits.set(ip, entry);

  // Opportunistic cleanup so the map doesn't grow unbounded
  if (hits.size > 5000) {
    for (const [key, value] of hits) {
      if (now - value.windowStart > windowMs) hits.delete(key);
    }
  }

  return entry.count <= limit;
}
