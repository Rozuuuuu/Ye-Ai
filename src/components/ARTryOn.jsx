import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useMediaPipe } from '../hooks/useMediaPipe';

const MODELS = [
  { id: 'jacket', label: 'Jacket', src: '/models/clothing_jacket.glb' },
  { id: 'hoodie', label: 'Hoodie', src: '/models/HoodieJacket.glb' },
];

export default function ARTryOn() {
  const canvasRef    = useRef(null);
  const videoRef     = useRef(null);
  const sceneRef     = useRef(null);
  const rendererRef  = useRef(null);
  const cameraRef    = useRef(null);
  const modelRef     = useRef(null);
  const animFrameRef = useRef(null);

  // videoElement is set once the camera stream is playing,
  // so useMediaPipe only starts when there is real video data.
  const [videoElement, setVideoElement] = useState(null);
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [status, setStatus]               = useState('Initializing…');
  const [loaded, setLoaded]               = useState(false);

  // ── Body tracking (reads landmarksRef every frame with zero re-renders) ──
  const { landmarks, isLoaded } = useMediaPipe(videoElement);

  // ✅ Milestone 2 Checkpoint – visible in browser DevTools console
  useEffect(() => {
    if (landmarks) {
      console.log('Real-time Pose Landmarks:', landmarks);
    }
  }, [landmarks]);

  // Keep a ref so the Three.js animate loop always reads the latest value
  // without stale-closure issues (no re-render needed inside rAF).
  const landmarksRef = useRef(null);
  useEffect(() => {
    landmarksRef.current = landmarks;
  }, [landmarks]);

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
          // Pass the live element to useMediaPipe
          setVideoElement(video);
          setStatus('');
        });
      })
      .catch(() => setStatus('Camera access denied'));

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.shadowMap.enabled = true;
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
    dir.castShadow = true;
    scene.add(dir);

    // 6. Render loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      
      const wrapper = modelRef.current;
      const lms = landmarksRef.current;

      if (wrapper && lms && lms.poseLandmarks) {
        const leftShoulder = lms.poseLandmarks[11];
        const rightShoulder = lms.poseLandmarks[12];
        const leftHip = lms.poseLandmarks[23];
        const rightHip = lms.poseLandmarks[24];

        if (leftShoulder && rightShoulder && leftHip && rightHip) {
          // --- 1. Calculate Target Position in MediaPipe Normalized Space (0 to 1) ---
          // We use the center of the torso (between shoulders and hips)
          const targetX = (leftShoulder.x + rightShoulder.x + leftHip.x + rightHip.x) / 4;
          const targetY = (leftShoulder.y + rightShoulder.y + leftHip.y + rightHip.y) / 4;
          
          // --- 2. Convert to Normalized Device Coordinates (NDC) (-1 to 1) ---
          // MediaPipe X is 0 (left) to 1 (right). NDC X is -1 (left) to 1 (right).
          const ndcX = (targetX * 2) - 1;
          // MediaPipe Y is 0 (top) to 1 (bottom). NDC Y is 1 (top) to -1 (bottom). INVERTED!
          const ndcY = -(targetY * 2) + 1; 
          
          // --- 3. Unproject to 3D World Space ---
          // Create a vector with the NDC coordinates and a chosen depth (Z).
          // 0.9 pushes it away slightly. Adjust if it looks too small/large.
          const depthZ = 0.9; 
          const targetVector = new THREE.Vector3(ndcX, ndcY, depthZ);
          
          // Convert the 2D screen point to a 3D world point
          targetVector.unproject(camera);

          // --- 4. Apply Position with Smoothing ---
          if (!wrapper.userData.targetPos) {
            wrapper.userData.targetPos = new THREE.Vector3();
          }
          wrapper.userData.targetPos.copy(targetVector);
          
          // Offset to align model neck with actual neck
          const offsetY = -0.5; 
          wrapper.userData.targetPos.y += offsetY;

          wrapper.position.lerp(wrapper.userData.targetPos, 0.15);

          // --- 5. Calculate and Apply Rotation ---
          const dx = rightShoulder.x - leftShoulder.x;
          const dy = rightShoulder.y - leftShoulder.y;
          // Calculate angle. dy is inverted because MediaPipe Y is down, Three.js Y is up.
          const angle = Math.atan2(-dy, dx); 
          
          // Smooth rotation using slerp (Spherical Linear Interpolation) to prevent gimbal lock / erratic spinning
          const targetQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, angle));
          wrapper.quaternion.slerp(targetQuaternion, 0.15);
          
          // --- 6. Scale based on shoulder width ---
          const shoulderWidth = Math.sqrt(dx * dx + dy * dy);
          
          // Base size and growth rate multipliers
          const baseScale = 0.5;
          const scaleMultiplier = 5.0; 
          const targetScale = baseScale + (shoulderWidth * scaleMultiplier); 
          
          const currentScale = wrapper.scale.x;
          wrapper.scale.setScalar(currentScale + (targetScale - currentScale) * 0.15);
        }
      } else if (wrapper && (!lms || !lms.poseLandmarks)) {
        // Gentle auto-rotate when no body is detected
        wrapper.rotation.y += 0.004;
      }

      renderer.render(scene, camera);
    };
    animate();

    // 7. Resize support
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

    const loader = new GLTFLoader();
    loader.load(
      selectedModel.src,
      (gltf) => {
        const rawModel = gltf.scene;

        // Auto-scale raw model
        const box    = new THREE.Box3().setFromObject(rawModel);
        const size   = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale  = 1.6 / maxDim;
        rawModel.scale.setScalar(scale);

        // Centre the raw geometry at the origin (0,0,0)
        const center = box.getCenter(new THREE.Vector3());
        rawModel.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

        // CREATE A WRAPPER GROUP
        // We will apply all MediaPipe Body Tracking movement to this wrapper. 
        // This stops the tracking from destroying the model's precise geometric centering.
        const wrapper = new THREE.Group();
        wrapper.add(rawModel);

        scene.add(wrapper);
        modelRef.current = wrapper; // Set the wrapper as the target for our animate loop
        
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

      {/* Three.js canvas (transparent — model composites over camera) */}
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
              style={{ background: landmarks?.poseLandmarks ? '#4ade80' : '#ff6b6b' }}
            />
            {landmarks?.poseLandmarks ? 'Body Tracked' : 'Scanning…'}
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
