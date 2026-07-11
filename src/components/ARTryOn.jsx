import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useMediaPipe } from '../hooks/useMediaPipe';
import { createPositionFilters, createScalarFilter } from '../utils/OneEuroFilter';
import { getWarpedGarment, loadGarmentAsBase64, checkBackendHealth } from '../utils/hybrid_integration';

// ── Garment definitions ─────────────────────────────────────────────────────
const MODELS = [
  { id: 'tshirt',  label: 'T-Shirt', src: '/models/t_shirt.glb' },
  { id: 'jacket',  label: 'Jacket',  src: '/models/clothing_jacket.glb' },
  { id: 'hoodie',  label: 'Hoodie',  src: '/models/HoodieJacket.glb' },
];

// Garment anchor map for TPS warp mode (loaded from JSON at runtime)
const DEFAULT_ANCHORS = [[0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]];

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

  // ── Body tracking (throttleMs: 0 for 3D, but we throttle warp sends separately) ──
  const { landmarks, isLoaded } = useMediaPipe(videoElement, CONFIG);

  const landmarksRef = useRef(null);
  useEffect(() => { landmarksRef.current = landmarks; }, [landmarks]);

  // ── Initialize One-Euro Filters ───────────────────────────────────────────
  useEffect(() => {
    filtersRef.current = {
      position: createPositionFilters(CONFIG.minCutoff, CONFIG.beta),
      scale:    createScalarFilter(CONFIG.minCutoff, CONFIG.beta),
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

      if (wrapper && lms && lms.poseLandmarks && filters) {
        const leftShoulder  = lms.poseLandmarks[11];
        const rightShoulder = lms.poseLandmarks[12];
        const leftHip       = lms.poseLandmarks[23];
        const rightHip      = lms.poseLandmarks[24];

        if (leftShoulder && rightShoulder && leftHip && rightHip) {
          // ── Reset grace period counter (tracking is active) ──
          lostFramesRef.current = 0;
          wrapper.visible = true;

          // --- 1. Anchor to Neck/Shoulders (instead of full torso) ---
          const anchorX = (leftShoulder.x + rightShoulder.x) / 2;
          const anchorY = (leftShoulder.y + rightShoulder.y) / 2;
          
          // --- 2. Shoulder Width (normalized) ---
          const shoulderWidthMP = Math.sqrt(
            Math.pow(rightShoulder.x - leftShoulder.x, 2) +
            Math.pow(rightShoulder.y - leftShoulder.y, 2)
          );

          // --- 3. Distance Estimation ---
          const referenceShoulderWidthMP = 0.25; 
          const referenceDistanceWorldUnits = 3.5; 
          const minDist = 1.5; // Prevent getting too close
          const maxDist = 8.0;

          let currentDist = maxDist;
          if (shoulderWidthMP > 0.01) {
            currentDist = referenceDistanceWorldUnits * (referenceShoulderWidthMP / shoulderWidthMP);
            currentDist = Math.max(minDist, Math.min(maxDist, currentDist));
          }

          // --- 4. Unproject using Ray-Casting ---
          const ndcX = (anchorX * 2) - 1;
          const ndcY = -(anchorY * 2) + 1;
          
          // Project to a plane at Z = 0.5 (mid-frustum)
          const targetVector = new THREE.Vector3(ndcX, ndcY, 0.5);
          targetVector.unproject(camera);

          // Calculate direction from camera to unprojected point
          const dirVec = targetVector.sub(camera.position).normalize();
          
          // Place model along that ray exactly at currentDist
          const finalPos = camera.position.clone().add(dirVec.multiplyScalar(currentDist));

          // --- 5. Offsets ---
          // Offset Y slightly down from the shoulder line to the chest
          const verticalOffset = 0.15 * (currentDist / referenceDistanceWorldUnits);
          finalPos.y -= verticalOffset;

          // --- 6. One-Euro Filtered Position ---
          const fx = filters.position.x.filter(finalPos.x, now);
          const fy = filters.position.y.filter(finalPos.y, now);
          const fz = filters.position.z.filter(finalPos.z, now);
          wrapper.position.set(fx, fy, fz);

          // --- 7. One-Euro Filtered Rotation ---
          const dx = rightShoulder.x - leftShoulder.x;
          const dy = rightShoulder.y - leftShoulder.y;
          const rawAngleZ = Math.atan2(-dy, dx);
          const filteredAngleZ = filters.angleZ.filter(rawAngleZ, now);

          const initialXRotation = Math.PI;
          const targetQ = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(initialXRotation, 0, filteredAngleZ, 'XYZ')
          );
          wrapper.quaternion.slerp(targetQ, CONFIG.lerpFactor);

          // --- 8. One-Euro Filtered Scale ---
          // Scale model relative to shoulder width in pixels/MP units
          const baseScale = 2.2; // Adjust based on model's internal size
          const rawScale = baseScale * shoulderWidthMP * currentDist;
          const filteredScale = filters.scale.filter(rawScale, now);
          wrapper.scale.setScalar(filteredScale);
        }
      } else if (wrapper) {
        // ── Graceful Degradation ──────────────────────────────────────────
        // Keep model visible for a grace period, then hide
        lostFramesRef.current += 1;

        if (lostFramesRef.current <= CONFIG.gracePeriodFrames) {
          // Grace period: keep last known position, no spinning
          wrapper.visible = true;
        } else {
          // Past grace period: gently fade model or auto-rotate
          wrapper.visible = true;
          wrapper.rotation.y += 0.004;
        }
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
      filtersRef.current.angleZ.reset();
    }

    const loader = new GLTFLoader();
    loader.load(
      selectedModel.src,
      (gltf) => {
        const rawModel = gltf.scene;

        // Initial rotation fix (uncomment if model is upside down at rest)
        // rawModel.rotation.x = Math.PI;

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

        scene.add(wrapper);
        modelRef.current = wrapper;
        
        setLoaded(true);
        setStatus('');
      },
      (p) => setStatus(`Loading… ${Math.round((p.loaded / p.total) * 100)}%`),
      (e) => { console.error(e); setStatus('Failed to load model'); }
    );
  }, [selectedModel]);

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
    </div>
  );
}
