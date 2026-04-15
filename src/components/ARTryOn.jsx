import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useMediaPipe } from '../hooks/useMediaPipe';

const MODELS = [
  { id: 'tshirt',  label: 'T-Shirt', src: '/models/t_shirt.glb' },
  { id: 'jacket',  label: 'Jacket',  src: '/models/clothing_jacket.glb' },
  { id: 'hoodie',  label: 'Hoodie',  src: '/models/HoodieJacket.glb' },
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
          // --- 1. Calculate Torso Center in MediaPipe Normalized Space (0 to 1) ---
          const torsoMidX = (leftShoulder.x + rightShoulder.x + leftHip.x + rightHip.x) / 4;
          const torsoMidY = (leftShoulder.y + rightShoulder.y + leftHip.y + rightHip.y) / 4;
          
          // --- 2. Calculate Shoulder Width in Normalized Space ---
          const shoulderWidthMP = Math.sqrt(
            Math.pow(rightShoulder.x - leftShoulder.x, 2) +
            Math.pow(rightShoulder.y - leftShoulder.y, 2)
          );

          // --- 3. Auto-Depth: Focal Length Scaling (Inverse Square Law) ---
          // CALIBRATION: Stand at a comfortable distance, console.log(shoulderWidthMP),
          // and set that value as referenceShoulderWidthMP.
          const referenceShoulderWidthMP = 0.2;    // Shoulder width at reference distance
          const referenceDistanceWorldUnits = 2.0; // World units at that reference width
          const minDistanceWorldUnits = 0.5;       // Closest allowed (prevents clipping)
          const maxDistanceWorldUnits = 5.0;       // Farthest allowed (prevents disappearing)

          let currentDistanceWorldUnits;
          if (shoulderWidthMP > 0.01) {
            // Inverse relationship: wider shoulders = closer distance
            currentDistanceWorldUnits = referenceDistanceWorldUnits * (referenceShoulderWidthMP / shoulderWidthMP);
            currentDistanceWorldUnits = Math.max(minDistanceWorldUnits, Math.min(maxDistanceWorldUnits, currentDistanceWorldUnits));
          } else {
            currentDistanceWorldUnits = maxDistanceWorldUnits;
          }

          // Convert world distance to NDC Z parameter (0 to 1) for unproject
          const near = camera.near;
          const far = camera.far;
          const depthZParam = (currentDistanceWorldUnits - near) / (far - near);
          const clampedDepthZParam = Math.max(0, Math.min(1, depthZParam));

          // --- 4. Convert to Normalized Device Coordinates (NDC) (-1 to 1) ---
          const ndcX = (torsoMidX * 2) - 1;
          const ndcY = -(torsoMidY * 2) + 1;
          
          // --- 5. Unproject to 3D World Space ---
          const targetVector = new THREE.Vector3(ndcX, ndcY, clampedDepthZParam);
          targetVector.unproject(camera);

          // --- 6. Apply Position with Smoothing and Model Offset ---
          if (!wrapper.userData.targetPos) {
            wrapper.userData.targetPos = new THREE.Vector3();
          }
          wrapper.userData.targetPos.copy(targetVector);
          
          // TWEAK THESE OFFSETS (in world units)
          const offsetX = 0.0;  // Horizontal alignment
          const offsetY = -0.3; // Vertical alignment (negative = down)
          const offsetZ = 0.0;  // Depth alignment (negative = toward camera)

          wrapper.userData.targetPos.x += offsetX;
          wrapper.userData.targetPos.y += offsetY;
          wrapper.userData.targetPos.z += offsetZ;

          wrapper.position.lerp(wrapper.userData.targetPos, 0.15);

          // --- 7. Calculate and Apply Rotation ---
          const dx = rightShoulder.x - leftShoulder.x;
          const dy = rightShoulder.y - leftShoulder.y;
          const angleZ = Math.atan2(-dy, dx); 
          
          const initialXRotation = Math.PI; // 180° fix for Y-up GLTF convention
          const targetQuaternion = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(initialXRotation, 0, angleZ, 'XYZ') 
          );
          wrapper.quaternion.slerp(targetQuaternion, 0.15);
          
          // --- 8. Scale proportional to estimated world distance ---
          // At referenceDistance the model should look correct with baseScaleFactor.
          // As distance increases, scale increases proportionally (perspective compensation).
          const baseScaleFactor = 0.8; // Scale at 1 world unit distance
          const targetScale = baseScaleFactor * currentDistanceWorldUnits;
          
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

        // --- Initial rotation fix for upside-down models ---
        // If your model is consistently upside down, uncomment and adjust:
        // rawModel.rotation.x = Math.PI; // Rotate 180° around X-axis
        // rawModel.rotation.y = Math.PI; // Rotate 180° around Y-axis if needed

        // Auto-scale raw model
        const box    = new THREE.Box3().setFromObject(rawModel);
        const size   = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale  = 1.6 / maxDim; // This initial scale might need adjustment
        rawModel.scale.setScalar(scale);

        // Centre the raw geometry at the origin (0,0,0)
        const center = box.getCenter(new THREE.Vector3());
        rawModel.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

        // CREATE A WRAPPER GROUP
        // All MediaPipe body tracking transforms are applied to the wrapper,
        // preserving the model's internal centering.
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
              style={{ background: !isLoaded ? '#fbbf24' : (landmarks?.poseLandmarks ? '#4ade80' : '#ff6b6b') }}
            />
            {!isLoaded ? 'Loading AI Model…' : (landmarks?.poseLandmarks ? 'Body Tracked' : 'Scanning…')}
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
