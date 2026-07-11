/**
 * extractPalette — canvas-based dominant color extraction (no dependencies).
 * Single source of truth — used by Home (analysis input) and VerdictDrawer (swatches).
 *
 * @param {string} src - Image source (data URL or URL)
 * @param {number} count - Number of colors to extract
 * @returns {Promise<string[]>} - Hex colors, spread across the luminance range
 */
export const extractPalette = (src, count = 5) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const SIZE = 120; // Scale down for fast pixel parsing
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const { data } = ctx.getImageData(0, 0, SIZE, SIZE);

        // Collect opaque pixels, sampling every 4th pixel
        const pixels = [];
        for (let i = 0; i < data.length; i += 16) {
          if (data[i + 3] > 128) pixels.push([data[i], data[i + 1], data[i + 2]]);
        }
        if (!pixels.length) return resolve([]);

        // Sort by perceived luminance
        pixels.sort(
          ([r1, g1, b1], [r2, g2, b2]) =>
            0.299 * r1 + 0.587 * g1 + 0.114 * b1 -
            (0.299 * r2 + 0.587 * g2 + 0.114 * b2)
        );

        // Pick the middle pixel of each luminance bucket
        const bucket = Math.max(1, Math.floor(pixels.length / count));
        const hex = pixels
          .filter((_, i) => i % bucket === Math.floor(bucket / 2))
          .slice(0, count)
          .map(([r, g, b]) =>
            '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')
          );
        resolve(hex);
      } catch {
        resolve([]);
      }
    };
    img.onerror = () => resolve([]);
    img.src = src;
  });
