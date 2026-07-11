import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useMediaPipe } from '../hooks/useMediaPipe';
import { createPositionFilters, createScalarFilter } from '../utils/OneEuroFilter';
import { videoToScreen, screenToWorld } from '../utils/screenSpacePlacement';
import { kolorsTryOn } from '../utils/kolorsTryOn';
import { getWarpedGarment, loadGarmentAsBase64, checkBackendHealth } from '../utils/hybrid_integration';

// ── Garment definitions ─────────────────────────────────────────────────────
// torsoFrac: fraction of the model's bounding-box width that is the wearable
// torso (the rest is spread-out sleeves). Measured from the GLB geometry with
// db/render-glb-silhouettes.mjs — the jacket is in A-pose so its bbox is
// mostly sleeves. Used to match the garment's CHEST width to shoulder width.
// yawFix: the t-shirt is authored turned 29.4° on its vertical axis (measured
// with db/measure-glb-rotation.mjs); this bakes it back to camera-facing.
const MODELS = [
  { id: 'tshirt',  label: 'T-Shirt', src: '/models/t_shirt.glb',         flatSrc: '/models/t_shirt_flat.png', torsoFrac: 0.86, yawFix: 29.4 * Math.PI / 180 },
  { id: 'jacket',  label: 'Jacket',  src: '/models/clothing_jacket.glb', flatSrc: '/models/jacket_flat.png',  torsoFrac: 0.36 },
  { id: 'hoodie',  label: 'Hoodie',  src: '/models/HoodieJacket.glb',    flatSrc: '/models/hoodie_flat.png',  torsoFrac: 0.70 },
];

// Garment anchor map for TPS warp mode (loaded from JSON at runtime)
const DEFAULT_ANCHORS = [[0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]];

// ── Screen-space placement (3D mode) ────────────────────────────────────────
// The garment lives on a fixed plane in front of the camera; position comes
// straight from crop-corrected landmark screen coords, and scale from shoulder
// width. No world-distance estimation — that approach drifted (see git log).
const GARMENT_DEPTH = 3.0;          // camera is at z=3, so the garment plane is z=0
const GARMENT_WIDTH_FACTOR = 1.35;  // garment chest width ÷ shoulder-joint width
const GARMENT_LENGTH_FACTOR = 1.25; // garment length (collar→hem) ÷ shoulder-to-hip distance

// ── Mobile / Desktop detection ──────────────────────────────────────────────
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// Enable selfie mirroring (mirrored: true) to ensure left/right match the user's reflection
const CONFIG = isMobile
  ? { modelComplexity: 0, lerpFactor: 0.25, minCutoff: 0.8, beta: 0.01, gracePeriodFrames: 10, mirrored: true }
  : { modelComplexity: 1, lerpFactor: 0.15, minCutoff: 1.0, beta: 0.007, gracePeriodFrames: 15, mirrored: true };

export default function ARTryOn() {
  const canvasRef     = useRef(null);
  const videoRef      = useRef(null);
  const sceneRef      = useRef(null);
  const rendererRef   = useRef(null);
  const cameraRef     = useRef(null);
  const modelRef      = useRef(null);
  const animFrameRef  = useRef(null);
  const filtersRef    = useRef(null); // One-Euro filters
  const lostFramesRef = useRef(0);    // Graceful degradation counter

  const [videoElement, setVideoElement] = useState(null);
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [status, setStatus]               = useState('Initializing…');
  const [loaded, setLoaded]               = useState(false);

  // ── Hybrid Warp State ───────────────────────────────────────────────────
  const [viewMode, setViewMode]           = useState('3d'); // '3d' | 'warp'
  const [warpedImageUrl, setWarpedImageUrl] = useState(null);
  const [isWarping, setIsWarping]         = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);
  const garmentBase64Ref = useRef(null);
  const garmentAnchorsRef = useRef(null);
  const warpIntervalRef = useRef(null);
  const isWarpingRef = useRef(false); // in-flight guard (ref, so the poll interval isn't rebuilt per request)

  // ── AI Photo Try-On (Snap & Try) ────────────────────────────────────────
  const [aiImageUrl, setAiImageUrl] = useState(null);
  const [aiLoading, setAiLoading]   = useState(false);
  const [aiStatus, setAiStatus]     = useState('');
  const [aiError, setAiError]       = useState(null);

  // ── Body tracking (throttleMs: 0 for 3D, but we throttle warp sends separately) ──
  const { landmarks, isLoaded } = useMediaPipe(videoElement, CONFIG);

  const landmarksRef = useRef(null);
  useEffect(() => { landmarksRef.current = landmarks; }, [landmarks]);

  // ── Initialize One-Euro Filters ───────────────────────────────────────────
  useEffect(() => {
    filtersRef.current = {
      position: createPositionFilters(CONFIG.minCutoff, CONFIG.beta),
      scale:    createScalarFilter(CONFIG.minCutoff, CONFIG.beta),
      scaleY:   createScalarFilter(CONFIG.minCutoff, CONFIG.beta),
      angleZ:   createScalarFilter(CONFIG.minCutoff, CONFIG.beta),
    };
  }, []);

  // ── Check backend health on mount ─────────────────────────────────────────
  useEffect(() => {
    checkBackendHealth().then(({ ok }) => setBackendOnline(ok));
  }, []);

  // ── Load garment anchors JSON ─────────────────────────────────────────────
  useEffect(() => {
    fetch('/models/garment_anchors.json')
      .then(r => r.json())
      .then(data => { garmentAnchorsRef.current = data; })
      .catch(() => { garmentAnchorsRef.current = null; });
  }, []);

  // ── Load 2D garment image when model or mode changes ──────────────────────
  useEffect(() => {
    if (viewMode !== 'warp') return;
    
    const anchors = garmentAnchorsRef.current;
    const garmentConfig = anchors?.[selectedModel.id];
    
    if (!garmentConfig) {
      console.warn(`No warp config for garment: ${selectedModel.id}`);
      return;
    }

    loadGarmentAsBase64(garmentConfig.image)
      .then(b64 => { garmentBase64Ref.current = b64; })
      .catch(err => {
        console.error('Failed to load garment image:', err);
        garmentBase64Ref.current = null;
      });
  }, [viewMode, selectedModel]);

  // ── Warp loop: send landmarks to backend every 200ms in warp mode ─────────
  const sendWarpRequest = useCallback(async () => {
    const lms = landmarksRef.current;
    const garmentB64 = garmentBase64Ref.current;
    const anchors = garmentAnchorsRef.current?.[selectedModel.id]?.anchors;

    if (!lms?.poseLandmarks || !garmentB64 || isWarpingRef.current) return;

    isWarpingRef.current = true;
    setIsWarping(true);
    try {
      const result = await getWarpedGarment(
        garmentB64,
        lms.poseLandmarks,
        anchors || DEFAULT_ANCHORS
      );
      if (result) {
        setWarpedImageUrl(result);
      }
    } catch (err) {
      console.error('Warp request failed:', err);
    } finally {
      isWarpingRef.current = false;
      setIsWarping(false);
    }
  }, [selectedModel]);

  useEffect(() => {
    if (viewMode === 'warp' && backendOnline) {
      // Send warp requests every 200ms
      warpIntervalRef.current = setInterval(sendWarpRequest, 200);
    }
    return () => {
      if (warpIntervalRef.current) {
        clearInterval(warpIntervalRef.current);
        warpIntervalRef.current = null;
      }
    };
  }, [viewMode, backendOnline, sendWarpRequest]);

  // ── Clear warped image when switching to 3D mode ──────────────────────────
  useEffect(() => {
    if (viewMode === '3d') {
      setWarpedImageUrl(null);
    }
  }, [viewMode]);

  // ── Bootstrap Three.js ────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    if (!canvas || !video) return;

    let stream;

    // 1. Camera stream - Use selfie camera for AR Try-On
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((s) => {
        stream = s;
        video.srcObject = stream;
        video.playsInline = true;
        video.play().then(() => {
          setVideoElement(video);
          setStatus('');
        });
      })
      .catch(() => setStatus('Camera access denied'));

    // Version marker so we can tell which placement code a device is running
    console.info('[tryon] screen-space placement v4 (yaw-corrected models)');

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 2 : 3));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.shadowMap.enabled = !isMobile; // skip shadows on mobile for perf
    rendererRef.current = renderer;

    // 3. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 4. Camera
    const camera = new THREE.PerspectiveCamera(
      50,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 3);
    cameraRef.current = camera;

    // 5. Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dir = new THREE.DirectionalLight(0xffffff, 1.5);
    dir.position.set(2, 5, 2);
    dir.castShadow = !isMobile;
    scene.add(dir);

    // 6. Render loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      
      const wrapper = modelRef.current;
      const lms     = landmarksRef.current;
      const filters = filtersRef.current;
      const now     = performance.now() / 1000; // seconds

      const lm = lms?.poseLandmarks;
      const tracked =
        wrapper && filters &&
        lm && lm[11] && lm[12] && lm[23] && lm[24] &&
        video.videoWidth > 0;

      if (tracked) {
        // ── Reset grace period counter (tracking is active) ──
        lostFramesRef.current = 0;
        wrapper.visible = true;

        // --- 1. Landmarks → world coords on the garment plane ---
        // videoToScreen corrects for the object-cover crop of the <video>;
        // screenToWorld maps screen fractions onto the fixed plane at z=0.
        const cw = canvas.clientWidth,  ch = canvas.clientHeight;
        const vw = video.videoWidth,    vh = video.videoHeight;
        const project = (point) => screenToWorld(
          videoToScreen(point, vw, vh, cw, ch),
          camera.fov, camera.aspect, GARMENT_DEPTH, camera.position.z
        );

        const sL = project(lm[11]); // left shoulder
        const sR = project(lm[12]); // right shoulder
        const hL = project(lm[23]); // left hip
        const hR = project(lm[24]); // right hip

        // --- 2. Anchor at the torso centre (shoulder line ↔ hip line) ---
        const finalPos = new THREE.Vector3(
          (sL.x + sR.x + hL.x + hR.x) / 4,
          (sL.y + sR.y + hL.y + hR.y) / 4,
          (sL.z + sR.z + hL.z + hR.z) / 4
        );

        // --- 3. One-Euro Filtered Position ---
        const fx = filters.position.x.filter(finalPos.x, now);
        const fy = filters.position.y.filter(finalPos.y, now);
        const fz = filters.position.z.filter(finalPos.z, now);
        wrapper.position.set(fx, fy, fz);

        // --- 4. One-Euro Filtered Z tilt from the shoulder line ---
        const rawAngleZ = Math.atan2(sR.y - sL.y, sR.x - sL.x);
        const filteredAngleZ = filters.angleZ.filter(rawAngleZ, now);

        // glTF models are Y-up and front-facing by spec; the silhouettes in
        // db/render-glb-silhouettes.mjs confirm all three are authored
        // upright, so only the shoulder-line tilt is applied.
        const targetQ = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(0, 0, filteredAngleZ, 'XYZ')
        );
        wrapper.quaternion.slerp(targetQ, CONFIG.lerpFactor);

        // --- 5. Two-axis fit: width from shoulders, length from torso ---
        // Independent axes so the garment matches both the wearer's frame
        // width and torso length instead of being right in only one of them.
        const shoulderWorldWidth = Math.hypot(sR.x - sL.x, sR.y - sL.y);
        const torsoWorldLength = Math.hypot(
          (sL.x + sR.x) / 2 - (hL.x + hR.x) / 2,
          (sL.y + sR.y) / 2 - (hL.y + hR.y) / 2
        );
        const { chestWidth = 1.6, bodyHeight = 1.6 } = wrapper.userData;
        const scaleX = filters.scale.filter(
          (shoulderWorldWidth * GARMENT_WIDTH_FACTOR) / chestWidth, now);
        const scaleY = filters.scaleY.filter(
          (torsoWorldLength * GARMENT_LENGTH_FACTOR) / bodyHeight, now);
        // Depth follows the average so the garment doesn't go paper-thin
        wrapper.scale.set(scaleX, scaleY, (scaleX + scaleY) / 2);
      } else if (wrapper) {
        // ── Graceful degradation: hold the last pose briefly, then hide.
        // Never idle-spin — a visible spinning garment reads as "floating".
        lostFramesRef.current += 1;
        wrapper.visible = lostFramesRef.current <= CONFIG.gracePeriodFrames;
      }

      renderer.render(scene, camera);
    };
    animate();

    // 7. Resize
    const onResize = () => {
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
      window.removeEventListener('resize', onResize);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ── Load / switch GLB model ───────────────────────────────────────────────
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (modelRef.current) {
      scene.remove(modelRef.current);
      modelRef.current = null;
    }
    setLoaded(false);
    setStatus('Loading model…');

    // Reset filters when switching models
    if (filtersRef.current) {
      filtersRef.current.position.x.reset();
      filtersRef.current.position.y.reset();
      filtersRef.current.position.z.reset();
      filtersRef.current.scale.reset();
      filtersRef.current.scaleY.reset();
      filtersRef.current.angleZ.reset();
    }

    const loader = new GLTFLoader();
    loader.load(
      selectedModel.src,
      (gltf) => {
        const rawModel = gltf.scene;

        // Undo any authored rotation BEFORE measuring the bounding box, so
        // centring, chest width, and body height are all camera-facing values
        if (selectedModel.yawFix) rawModel.rotation.y = selectedModel.yawFix;

        // Auto-scale
        const box    = new THREE.Box3().setFromObject(rawModel);
        const size   = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale  = 1.6 / maxDim;
        rawModel.scale.setScalar(scale);

        // Centre at origin
        const center = box.getCenter(new THREE.Vector3());
        rawModel.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

        // Wrapper group (tracking applies here, not to raw mesh)
        const wrapper = new THREE.Group();
        wrapper.add(rawModel);

        // Record the model's normalized CHEST width (bbox width minus sleeve
        // spread) so the render loop can match it to shoulder width — bbox
        // width alone shrinks wide-sleeved models (jacket) to a tiny torso
        wrapper.userData.chestWidth = size.x * scale * (selectedModel.torsoFrac ?? 1);
        // Normalized garment height, for fitting length to the wearer's torso
        wrapper.userData.bodyHeight = size.y * scale;

        scene.add(wrapper);
        modelRef.current = wrapper;
        
        setLoaded(true);
        setStatus('');
      },
      (p) => setStatus(`Loading… ${Math.round((p.loaded / p.total) * 100)}%`),
      (e) => { console.error(e); setStatus('Failed to load model'); }
    );
  }, [selectedModel]);

  // ── AI Photo Try-On: capture a frame, send with the garment image ────────
  // Primary provider: Kolors on Hugging Face (free, browser-direct).
  // Fallback: our /api/tryon Gemini endpoint (needs paid-tier key).
  const handleSnapAndTry = async () => {
    const video = videoRef.current;
    if (!video?.videoWidth || aiLoading) return;
    setAiError(null);
    setAiLoading(true);
    setAiStatus('Capturing…');
    try {
      // Capture the current frame, mirrored to match the on-screen preview
      const cap = document.createElement('canvas');
      cap.width = video.videoWidth;
      cap.height = video.videoHeight;
      const ctx = cap.getContext('2d');
      ctx.translate(cap.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0);
      const personBlob = await new Promise((resolve) => cap.toBlob(resolve, 'image/jpeg', 0.9));
      const garmentBlob = await (await fetch(selectedModel.flatSrc)).blob();

      try {
        setAiStatus('Generating…');
        setAiImageUrl(await kolorsTryOn(personBlob, garmentBlob, setAiStatus));
      } catch (kolorsErr) {
        console.warn('Kolors try-on failed, falling back to Gemini:', kolorsErr);
        setAiStatus('Free GPU busy · trying backup…');
        const personImageBase64 = cap.toDataURL('image/jpeg', 0.9);
        const garmentImageBase64 = await loadGarmentAsBase64(selectedModel.flatSrc);
        const resp = await fetch('/api/tryon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personImageBase64, garmentImageBase64 }),
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(data.error || kolorsErr.message || 'AI try-on failed');
        setAiImageUrl(data.imageBase64);
      }
    } catch (err) {
      setAiError(err.message || 'AI try-on failed');
    } finally {
      setAiLoading(false);
      setAiStatus('');
    }
  };

  // ── Toggle handler ────────────────────────────────────────────────────────
  const handleModeToggle = () => {
    if (viewMode === '3d') {
      if (!backendOnline) {
        // Re-check backend before switching
        checkBackendHealth().then(({ ok }) => {
          setBackendOnline(ok);
          if (ok) {
            setViewMode('warp');
          } else {
            setStatus('Warp backend offline — start ml-backend server');
            setTimeout(() => setStatus(''), 3000);
          }
        });
        return;
      }
      setViewMode('warp');
    } else {
      setViewMode('3d');
    }
  };

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden" style={{ zIndex: 15 }}>

      {/* Camera background (Mirror effect if facingMode is 'user') */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        muted playsInline
        style={{ zIndex: 0, transform: 'scaleX(-1)' }}
      />

      {/* Three.js canvas — hidden in warp mode */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ 
          zIndex: 1, 
          opacity: viewMode === '3d' ? 1 : 0,
          pointerEvents: viewMode === '3d' ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* ── Warped Garment Overlay (Warp Mode) ─────────────────────────── */}
      {viewMode === 'warp' && warpedImageUrl && (
        <img
          src={warpedImageUrl}
          alt="Warped garment"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{
            zIndex: 2,
            transform: 'scaleX(-1)', // Mirror to match video
            mixBlendMode: 'normal',
          }}
        />
      )}

      {/* ── Warp Processing Indicator ──────────────────────────────────── */}
      {viewMode === 'warp' && isWarping && !warpedImageUrl && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div
            className="px-4 py-2 text-[9px] font-bold tracking-widest uppercase animate-pulse"
            style={{
              background: 'rgba(20,20,20,0.7)',
              color: '#a78bfa',
              border: '1px solid rgba(167,139,250,0.3)',
              borderRadius: '4px',
              backdropFilter: 'blur(8px)',
            }}
          >
            Warping…
          </div>
        </div>
      )}

      {/* Loading / error status */}
      {status && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
          <span className="material-symbols-outlined animate-pulse text-[#ffb3b0] text-5xl">view_in_ar</span>
          <p className="mt-3 text-[10px] uppercase tracking-widest text-white/50">{status}</p>
        </div>
      )}

      {/* Tracking badge */}
      {loaded && (
        <div className="absolute top-4 left-4 z-30">
          <div
            className="flex items-center gap-2 px-3 py-1 text-[9px] font-bold tracking-widest uppercase"
            style={{
              background: 'rgba(20,20,20,0.65)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,179,176,0.2)',
              borderRadius: '2px',
              color: '#ffb3b0',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: !isLoaded ? '#fbbf24' : (landmarks?.poseLandmarks ? '#4ade80' : '#ff6b6b') }}
            />
            {!isLoaded ? 'Loading AI Model…' : (landmarks?.poseLandmarks ? 'Body Tracked' : 'Scanning…')}
          </div>
          {/* Device badge */}
          <div
            className="mt-1 px-3 py-0.5 text-[7px] tracking-widest uppercase"
            style={{
              background: 'rgba(20,20,20,0.45)',
              color: 'rgba(255,255,255,0.3)',
              borderRadius: '2px',
            }}
          >
            {isMobile ? '📱 Mobile Mode' : '🖥️ Desktop Mode'}
          </div>
        </div>
      )}

      {/* ── Mode Toggle (3D ↔ Warp) ──────────────────────────────────── */}
      {loaded && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
          <button
            onClick={handleModeToggle}
            className="flex items-center gap-2 px-4 py-1.5 text-[9px] font-bold tracking-widest uppercase rounded-full transition-all duration-300"
            style={{
              background: viewMode === 'warp'
                ? 'linear-gradient(135deg, rgba(167,139,250,0.8), rgba(139,92,246,0.8))'
                : 'rgba(20,20,20,0.75)',
              color: viewMode === 'warp' ? '#fff' : 'rgba(255,255,255,0.6)',
              backdropFilter: 'blur(10px)',
              border: viewMode === 'warp'
                ? '1px solid rgba(167,139,250,0.5)'
                : '1px solid rgba(255,255,255,0.1)',
              boxShadow: viewMode === 'warp'
                ? '0 4px 15px rgba(139,92,246,0.3)'
                : 'none',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
              {viewMode === '3d' ? 'view_in_ar' : 'auto_fix_high'}
            </span>
            {viewMode === '3d' ? '3D Mode' : 'Warp Mode'}
            {!backendOnline && viewMode === '3d' && (
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: '#ff6b6b' }}
                title="Warp backend offline"
              />
            )}
          </button>
        </div>
      )}

      {/* Model switcher */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-30">
        {MODELS.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelectedModel(m)}
            className="px-3 py-1 text-[9px] font-bold tracking-widest uppercase rounded-[2px] transition-all"
            style={{
              background: selectedModel.id === m.id ? '#ff6b6b' : 'rgba(20,20,20,0.75)',
              color: selectedModel.id === m.id ? '#131313' : 'rgba(255,255,255,0.5)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Hint */}
      {loaded && (
        <div
          className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 px-4 py-1 text-[9px] font-bold tracking-widest uppercase whitespace-nowrap"
          style={{
            background: viewMode === 'warp'
              ? 'rgba(139,92,246,0.12)'
              : 'rgba(255,107,107,0.12)',
            color: viewMode === 'warp' ? '#c4b5fd' : '#ffb3b0',
            border: viewMode === 'warp'
              ? '1px solid rgba(139,92,246,0.25)'
              : '1px solid rgba(255,107,107,0.25)',
            borderRadius: '2px',
            backdropFilter: 'blur(6px)',
          }}
        >
          {viewMode === 'warp'
            ? 'Hybrid Warp · Stand back · Full torso visible'
            : 'Stand back · Full torso visible'}
        </div>
      )}

      {/* ── AI Snap & Try button ─────────────────────────────────────────── */}
      {loaded && viewMode === '3d' && !aiImageUrl && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2">
          <button
            onClick={handleSnapAndTry}
            disabled={aiLoading}
            className="flex items-center gap-2 px-5 py-2 text-[10px] font-bold tracking-widest uppercase rounded-full transition-all duration-300"
            style={{
              background: aiLoading
                ? 'rgba(20,20,20,0.75)'
                : 'linear-gradient(135deg, rgba(255,107,107,0.9), rgba(255,143,120,0.9))',
              color: aiLoading ? '#ffb3b0' : '#131313',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,107,107,0.5)',
              boxShadow: aiLoading ? 'none' : '0 4px 18px rgba(255,107,107,0.35)',
              cursor: aiLoading ? 'wait' : 'pointer',
            }}
          >
            <span
              className={`material-symbols-outlined ${aiLoading ? 'animate-spin' : ''}`}
              style={{ fontSize: '15px' }}
            >
              {aiLoading ? 'progress_activity' : 'auto_awesome'}
            </span>
            {aiLoading ? (aiStatus || 'Generating your fit…') : 'Snap & Try (AI)'}
          </button>
          {aiError && (
            <button
              onClick={() => setAiError(null)}
              className="px-3 py-1 text-[9px] font-bold tracking-widest uppercase"
              style={{
                background: 'rgba(255,80,80,0.15)',
                color: '#ff9d9a',
                border: '1px solid rgba(255,80,80,0.35)',
                borderRadius: '2px',
                backdropFilter: 'blur(6px)',
              }}
            >
              {aiError} · tap to dismiss
            </button>
          )}
        </div>
      )}

      {/* ── AI result overlay ───────────────────────────────────────────── */}
      {aiImageUrl && (
        <div className="absolute inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(10,10,10,0.92)' }}>
          <img
            src={aiImageUrl}
            alt="AI try-on result"
            className="max-w-full max-h-full object-contain"
          />
          <div className="absolute top-4 right-4 flex gap-2">
            <a
              href={aiImageUrl}
              download="yeai-tryon.png"
              className="flex items-center gap-1.5 px-4 py-1.5 text-[9px] font-bold tracking-widest uppercase rounded-full"
              style={{
                background: 'rgba(255,107,107,0.9)',
                color: '#131313',
                border: '1px solid rgba(255,107,107,0.5)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>download</span>
              Save
            </a>
            <button
              onClick={() => { setAiImageUrl(null); handleSnapAndTry(); }}
              className="flex items-center gap-1.5 px-4 py-1.5 text-[9px] font-bold tracking-widest uppercase rounded-full"
              style={{
                background: 'rgba(20,20,20,0.75)',
                color: 'rgba(255,255,255,0.8)',
                border: '1px solid rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>replay</span>
              Retake
            </button>
            <button
              onClick={() => setAiImageUrl(null)}
              className="flex items-center px-3 py-1.5 rounded-full"
              style={{
                background: 'rgba(20,20,20,0.75)',
                color: 'rgba(255,255,255,0.8)',
                border: '1px solid rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
              }}
              aria-label="Close AI try-on result"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
