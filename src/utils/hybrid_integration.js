/**
 * Hybrid Integration — Kornia Warp Backend Communication
 * 
 * Sends garment image + body landmarks to the FastAPI backend
 * and returns the TPS-warped garment as a data URL.
 * 
 * Used by ARTryOn.jsx in "warp" mode.
 */

const WARP_ENDPOINT = 'http://localhost:8000/warp';
const HEALTH_ENDPOINT = 'http://localhost:8000/health';

/**
 * Check if the warp backend is running and healthy.
 * @returns {Promise<{ok: boolean, info: object|null}>}
 */
export const checkBackendHealth = async () => {
  try {
    const response = await fetch(HEALTH_ENDPOINT, { 
      method: 'GET',
      signal: AbortSignal.timeout(3000), // 3s timeout
    });
    if (!response.ok) return { ok: false, info: null };
    const info = await response.json();
    return { ok: true, info };
  } catch {
    return { ok: false, info: null };
  }
};

/**
 * Send a garment image and body landmarks to the Kornia warp backend.
 * 
 * @param {string} garmentBase64 - Base64-encoded garment image (PNG with alpha)
 * @param {Array} landmarks - Full MediaPipe poseLandmarks array (33 landmarks)
 * @param {Array<Array<number>>} [anchorPoints] - Optional custom anchor points for the garment
 * @returns {Promise<string|null>} - Data URL of warped image, or null on error
 */
export const getWarpedGarment = async (garmentBase64, landmarks, anchorPoints) => {
  // Extract specific landmarks for upper body try-on
  // MediaPipe Indices: 11: L_Shoulder, 12: R_Shoulder, 23: L_Hip, 24: R_Hip
  const targetIndices = [11, 12, 23, 24];
  const bodyPoints = targetIndices.map(idx => ({
    x: landmarks[idx].x,
    y: landmarks[idx].y,
    z: landmarks[idx].z || 0
  }));

  try {
    const payload = {
      garment_image_b64: garmentBase64,
      landmarks: bodyPoints,
    };

    // Include custom anchor points if provided
    if (anchorPoints) {
      payload.anchor_points = anchorPoints;
    }

    const response = await fetch(WARP_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000), // 10s timeout for GPU processing
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Warp backend error:', errorData);
      throw new Error(errorData.detail || 'Warping failed');
    }

    const data = await response.json();
    return `data:image/png;base64,${data.warped_image}`;
  } catch (error) {
    console.error("Hybrid Warp Error:", error);
    return null;
  }
};

/**
 * Load a garment image from a URL and convert to base64.
 * @param {string} imageUrl - URL or path to the garment image (e.g. /models/t_shirt_flat.png)
 * @returns {Promise<string>} - Base64 string of the image
 */
export const loadGarmentAsBase64 = async (imageUrl) => {
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
