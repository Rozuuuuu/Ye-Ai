/**
 * screenSpacePlacement — pure math for anchoring AR garments to the body.
 *
 * The try-on video is rendered with CSS `object-cover`, which crops the camera
 * frame to fill the container. MediaPipe landmarks are normalized to the
 * UNCROPPED camera frame, so they must be mapped through the crop before they
 * can be used as screen positions. Skipping this mapping is what made the
 * garment drift away from the body.
 */

/**
 * Map a video-normalized landmark (0..1 in the camera frame) to container
 * fraction coordinates (0..1 across the visible viewport), accounting for
 * the object-cover crop of the <video> element.
 */
export function videoToScreen(lm, videoW, videoH, containerW, containerH) {
  const scale = Math.max(containerW / videoW, containerH / videoH);
  const dispW = videoW * scale;
  const dispH = videoH * scale;
  const offX = (dispW - containerW) / 2;
  const offY = (dispH - containerH) / 2;
  return {
    x: (lm.x * dispW - offX) / containerW,
    y: (lm.y * dispH - offY) / containerH,
  };
}

/**
 * Convert container-fraction coordinates to world coordinates on a plane
 * `depth` units in front of a centered perspective camera looking down -Z.
 * Working on a fixed plane (instead of estimating a world distance from
 * landmark sizes) keeps placement stable — screen position maps 1:1.
 */
export function screenToWorld(s, fovDeg, aspect, depth, cameraZ = 0) {
  const frustumH = 2 * depth * Math.tan((fovDeg * Math.PI) / 360);
  const frustumW = frustumH * aspect;
  return {
    x: (s.x - 0.5) * frustumW,
    y: (0.5 - s.y) * frustumH,
    z: cameraZ - depth,
  };
}
