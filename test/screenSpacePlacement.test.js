import { describe, it, expect } from 'vitest';
import { videoToScreen, screenToWorld } from '../src/utils/screenSpacePlacement.js';

describe('videoToScreen (object-cover crop mapping)', () => {
  it('is the identity when video and container aspects match', () => {
    const p = videoToScreen({ x: 0.3, y: 0.7 }, 640, 480, 320, 240);
    expect(p.x).toBeCloseTo(0.3);
    expect(p.y).toBeCloseTo(0.7);
  });

  it('keeps the frame centre at the container centre under any crop', () => {
    const wide = videoToScreen({ x: 0.5, y: 0.5 }, 640, 480, 1024, 499);
    const tall = videoToScreen({ x: 0.5, y: 0.5 }, 640, 480, 375, 600);
    expect(wide.x).toBeCloseTo(0.5);
    expect(wide.y).toBeCloseTo(0.5);
    expect(tall.x).toBeCloseTo(0.5);
    expect(tall.y).toBeCloseTo(0.5);
  });

  it('corrects vertical positions when a 4:3 video fills a wide container', () => {
    // 640x480 in 1024x499: video scales to 1024x768, (768-499)/2 = 134.5px cropped
    // top and bottom. Video y=0.35 → 268.8px in scaled frame → (268.8-134.5)/499
    const p = videoToScreen({ x: 0.5, y: 0.35 }, 640, 480, 1024, 499);
    expect(p.y).toBeCloseTo((0.35 * 768 - 134.5) / 499, 5);
    expect(p.y).toBeLessThan(0.35); // the old code placed it too low by this delta
  });

  it('corrects horizontal positions when a landscape video fills a portrait container', () => {
    // 640x480 in 375x600: video scales to 800x600, (800-375)/2 = 212.5px cropped
    // left and right. Video x=0.4 → 320px in scaled frame → (320-212.5)/375
    const p = videoToScreen({ x: 0.4, y: 0.5 }, 640, 480, 375, 600);
    expect(p.x).toBeCloseTo((0.4 * 800 - 212.5) / 375, 5);
    expect(p.x).toBeLessThan(0.4);
  });

  it('mirroring in video space equals mirroring in screen space', () => {
    // The useMediaPipe hook flips x in video space; verify that is equivalent
    // to flipping the mapped screen coordinate, so the CSS-mirrored video and
    // the garment overlay stay aligned.
    const raw = { x: 0.3, y: 0.4 };
    const mirroredFirst = videoToScreen({ x: 1 - raw.x, y: raw.y }, 640, 480, 1024, 499);
    const mappedFirst = videoToScreen(raw, 640, 480, 1024, 499);
    expect(mirroredFirst.x).toBeCloseTo(1 - mappedFirst.x, 10);
  });
});

describe('screenToWorld (fixed-plane projection)', () => {
  const FOV = 50, DEPTH = 3, CAMERA_Z = 3;

  it('maps the screen centre to the camera axis on the plane', () => {
    const w = screenToWorld({ x: 0.5, y: 0.5 }, FOV, 2, DEPTH, CAMERA_Z);
    expect(w.x).toBeCloseTo(0);
    expect(w.y).toBeCloseTo(0);
    expect(w.z).toBeCloseTo(0); // camera z 3 - depth 3
  });

  it('maps screen edges to frustum edges', () => {
    const aspect = 2;
    const frustumH = 2 * DEPTH * Math.tan((FOV * Math.PI) / 360);
    const topRight = screenToWorld({ x: 1, y: 0 }, FOV, aspect, DEPTH, CAMERA_Z);
    expect(topRight.x).toBeCloseTo((frustumH * aspect) / 2);
    expect(topRight.y).toBeCloseTo(frustumH / 2);
  });

  it('screen distances scale linearly (garment sticks to the body as it moves)', () => {
    const a = screenToWorld({ x: 0.2, y: 0.5 }, FOV, 2, DEPTH, CAMERA_Z);
    const b = screenToWorld({ x: 0.4, y: 0.5 }, FOV, 2, DEPTH, CAMERA_Z);
    const c = screenToWorld({ x: 0.8, y: 0.5 }, FOV, 2, DEPTH, CAMERA_Z);
    expect(c.x - b.x).toBeCloseTo(2 * (b.x - a.x), 10);
  });
});

describe('end-to-end placement (the two reported bugs)', () => {
  const FOV = 50, DEPTH = 3, CAMERA_Z = 3;
  const cw = 1024, ch = 499, vw = 640, vh = 480;
  const aspect = cw / ch;
  const frustumH = 2 * DEPTH * Math.tan((FOV * Math.PI) / 360);
  const frustumW = frustumH * aspect;

  const project = (p) => screenToWorld(videoToScreen(p, vw, vh, cw, ch), FOV, aspect, DEPTH, CAMERA_Z);

  it('garment lands exactly on the body anchor (no drift)', () => {
    const shoulderMid = { x: 0.5, y: 0.35 };
    const world = project(shoulderMid);
    const screen = videoToScreen(shoulderMid, vw, vh, cw, ch);
    // Convert back: world x/y should map to the same screen fraction
    expect(world.x / frustumW + 0.5).toBeCloseTo(screen.x, 10);
    expect(0.5 - world.y / frustumH).toBeCloseTo(screen.y, 10);
  });

  it('garment covers a sensible fraction of the screen, not the whole camera', () => {
    const WIDTH_FACTOR = 1.25;
    // Shoulders 25% of the video frame apart (typical webcam distance)
    const sL = project({ x: 0.625, y: 0.35 });
    const sR = project({ x: 0.375, y: 0.35 });
    const garmentWidth = Math.hypot(sR.x - sL.x, sR.y - sL.y) * WIDTH_FACTOR;
    const screenFraction = garmentWidth / frustumW;
    // Old formula produced ~95-150% screen height; new one must stay body-sized
    expect(screenFraction).toBeGreaterThan(0.15);
    expect(screenFraction).toBeLessThan(0.5);
  });
});
