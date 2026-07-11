// ~4.5 MB of base64 — aligns with Vercel's request body limit
const MAX_IMAGE_CHARS = 6_000_000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Returns an error message string, or null if the value is a usable base64 image. */
export function validateImageBase64(value) {
  if (typeof value !== 'string' || value.length < 100) {
    return 'imageBase64 must be a base64-encoded image string';
  }
  if (value.length > MAX_IMAGE_CHARS) {
    return 'Image too large (max ~4 MB)';
  }
  const raw = stripDataUrl(value);
  if (!/^[A-Za-z0-9+/=\s]+$/.test(raw.slice(0, 1000))) {
    return 'imageBase64 is not valid base64';
  }
  return null;
}

export function stripDataUrl(value) {
  return value.startsWith('data:') ? value.slice(value.indexOf(',') + 1) : value;
}

export function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}
