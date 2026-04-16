import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useMediaPipe } from '../hooks/useMediaPipe';
import { createPositionFilters, createScalarFilter } from '../utils/OneEuroFilter';

const MODELS = [
  { id: 'tshirt',  label: 'T-Shirt', src: '/models/t_shirt.glb' },
  { id: 'jacket',  label: 'Jacket',  src: '/models/clothing_jacket.glb' },
  { id: 'hoodie',  label: 'Hoodie',  src: '/models/HoodieJacket.glb' },
];

// ── Mobile / Desktop detection ──────────────────────────────────────────────
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const CONFIG = isMobile
  ? { modelComplexity: 0, lerpFactor: 0.25, minCutoff: 0.8, beta: 0.01, gracePeriodFrames: 10 }
  : { modelComplexity: 1, lerpFactor: 0.15, minCutoff: 1.0, beta: 0.007, gracePeriodFrames: 15 };

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

  // ── Body tracking ─────────────────────────────────────────────────────────
  const { landmarks, isLoaded } = useMediaPipe(videoElement);

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

  // ── Bootstrap Three.js ────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    if (!canvas || !video) return;

    let stream;

    // 1. Camera stream
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
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

          // --- 1. Torso Center (MediaPipe normalized 0–1) ---
          const torsoMidX = (leftShoulder.x + rightShoulder.x + leftHip.x + rightHip.x) / 4;
          const torsoMidY = (leftShoulder.y + rightShoulder.y + leftHip.y + rightHip.y) / 4;
          
          // --- 2. Shoulder Width (normalized) ---
          const shoulderWidthMP = Math.sqrt(
            Math.pow(rightShoulder.x - leftShoulder.x, 2) +
            Math.pow(rightShoulder.y - leftShoulder.y, 2)
          );

          // --- 3. Focal Length Depth (inverse square law) ---
          const referenceShoulderWidthMP = 0.2;
          const referenceDistanceWorldUnits = 2.0;
          const minDist = 0.5;
          const maxDist = 5.0;

          let currentDist;
          if (shoulderWidthMP > 0.01) {
            currentDist = referenceDistanceWorldUnits * (referenceShoulderWidthMP / shoulderWidthMP);
            currentDist = Math.max(minDist, Math.min(maxDist, currentDist));
          } else {
            currentDist = maxDist;
          }

          const depthZParam = Math.max(0, Math.min(1,
            (currentDist - camera.near) / (camera.far - camera.near)
          ));

          // --- 4. NDC + Unproject ---
          const ndcX = (torsoMidX * 2) - 1;
          const ndcY = -(torsoMidY * 2) + 1;
          
          const targetVector = new THREE.Vector3(ndcX, ndcY, depthZParam);
          targetVector.unproject(camera);

          // --- 5. Offsets (tweak per model) ---
          const offsetX = 0.0;
          const offsetY = -0.3;
          const offsetZ = 0.0;
          targetVector.x += offsetX;
          targetVector.y += offsetY;
          targetVector.z += offsetZ;

          // --- 6. One-Euro Filtered Position (replaces simple lerp) ---
          const fx = filters.position.x.filter(targetVector.x, now);
          const fy = filters.position.y.filter(targetVector.y, now);
          const fz = filters.position.z.filter(targetVector.z, now);
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
          const baseScaleFactor = 0.8;
          const rawScale = baseScaleFactor * currentDist;
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden" style={{ zIndex: 15 }}>

      {/* Camera background */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        muted playsInline
        style={{ zIndex: 0 }}
      />

      {/* Three.js canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 1 }}
      />

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
            background: 'rgba(255,107,107,0.12)',
            color: '#ffb3b0',
            border: '1px solid rgba(255,107,107,0.25)',
            borderRadius: '2px',
            backdropFilter: 'blur(6px)',
          }}
        >
          Stand back · Full torso visible
        </div>
      )}
    </div>
  );
}
