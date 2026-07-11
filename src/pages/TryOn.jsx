import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Webcam from 'react-webcam';

import TopAppBar from '../components/TopAppBar';
import BottomNavBar from '../components/BottomNavBar';
import ARTryOn from '../components/ARTryOn';

/* ── Info feature cards ── */
const FEATURES = [
  {
    accent: '#ffb3b0',
    label: 'Material Simulation',
    title: 'Real-time Silk',
    body: 'Our proprietary shaders calculate 240 physics steps per second to mimic the movement of high-end fabrics in real space.',
    borderTop: '2px solid rgba(255,107,107,0.25)',
  },
  {
    accent: '#d1bcff',
    label: 'Body Mapping',
    title: 'Precise Silhouette',
    body: 'AI-driven pose estimation ensures the garment contours perfectly to your unique body shape in any environment.',
    borderTop: '2px solid transparent',
  },
  {
    accent: '#ffdad8',
    label: 'Haptic Feed',
    title: 'Visual Weight',
    body: 'Dynamic lighting shows how colour interacts with your actual surroundings and the quality of light around you.',
    borderTop: '2px solid transparent',
  },
];

export default function TryOn() {
  const webcamRef = useRef(null);

  const [facingMode, setFacingMode] = useState('environment');
  const [flashOn,    setFlashOn]    = useState(false);
  const [webcamReady] = useState(true);
  const [flashScreen, setFlashScreen] = useState(false);
  const [showAssets, setShowAssets] = useState(false);

  // Update physical device Torch when flash is toggled
  useEffect(() => {
    if (!webcamRef.current?.video?.srcObject) return;
    const track = webcamRef.current.video.srcObject.getVideoTracks()[0];
    if (track && track.getCapabilities && track.getCapabilities().torch) {
      try {
        track.applyConstraints({ advanced: [{ torch: flashOn }] });
      } catch { /* Suppress constraint errors */ }
    }
  }, [flashOn, webcamReady, facingMode]);

  // Toggle camera direction
  const handleFlip = useCallback(() => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  }, []);

  // Fake capture flash
  const handleCapture = useCallback(() => {
    setFlashScreen(true);
    setTimeout(() => setFlashScreen(false), 200);
    // Real capture logic would go here
  }, []);

  // Toggle fake modal for "Assets"
  const handleAssets = useCallback(() => {
    setShowAssets((prev) => !prev);
  }, []);

  return (
    <div
      className="relative min-h-screen overflow-x-hidden"
      style={{ background: '#131313', color: '#e5e2e1', fontFamily: 'Inter, sans-serif' }}
    >
      {/* ── Decorative blobs ── */}
      <div
        className="fixed pointer-events-none z-0"
        style={{
          top: '20%', right: '-6rem',
          width: '24rem', height: '24rem',
          background: 'rgba(255,107,107,0.05)',
          borderRadius: '50%',
          filter: 'blur(100px)',
        }}
      />
      
      {/* Ambient Front Screen Light for selfie-flash effect */}
      {flashOn && facingMode === 'user' && (
        <div className="fixed inset-0 bg-[#ffd4a3]/15 mix-blend-screen pointer-events-none z-10" />
      )}

      {/* Capture flash */}
      <AnimatePresence>
        {flashScreen && (
          <motion.div
            className="fixed inset-0 bg-white pointer-events-none z-[70]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.85 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          />
        )}
      </AnimatePresence>

      <TopAppBar flashOn={flashOn} onToggleFlash={() => setFlashOn(!flashOn)} />

      <main className="min-h-screen pt-24 pb-32 px-6 flex flex-col items-center justify-start relative">
        <div className="w-full max-w-5xl z-10 flex flex-col items-center h-full">

          {/* ── Brutalist header ── */}
          <motion.div
            className="mb-8 w-full"
            style={{ borderLeft: '4px solid #ff6b6b', paddingLeft: '1.5rem' }}
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2
              className="font-black tracking-tighter uppercase leading-none"
              style={{
                fontSize: 'clamp(2.5rem, 8vw, 4.5rem)',
                color: '#e5e2e1',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              TRY IT{' '}
              <span style={{ color: '#ff6b6b' }}>ON</span>
            </h2>
            <p
              className="italic text-lg md:text-xl mt-2 max-w-xl"
              style={{ fontFamily: 'Newsreader, serif', color: 'rgba(229,226,225,0.55)' }}
            >
              Experience the digital drape.
            </p>
          </motion.div>

          {/* ── AR Viewfinder canvas ── */}
          <motion.div
            className="relative w-full overflow-hidden rounded-[8px]"
            style={{
              height: '65vh',
              minHeight: '400px',
              background: '#0e0e0e',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 }}
          >
            {/* 3D Model Viewer (AR) */}
            <ARTryOn />

            {/* Corner brackets */}
            {[
              { top: '2rem', left: '2rem',  borderTop: '2px solid #ffb3b0', borderLeft: '2px solid #ffb3b0'  },
              { top: '2rem', right: '2rem', borderTop: '2px solid #ffb3b0', borderRight: '2px solid #ffb3b0' },
              { bottom: '2rem', left: '2rem',  borderBottom: '2px solid #ffb3b0', borderLeft: '2px solid #ffb3b0'  },
              { bottom: '2rem', right: '2rem', borderBottom: '2px solid #ffb3b0', borderRight: '2px solid #ffb3b0' },
            ].map((style, i) => (
              <div
                key={i}
                className="absolute z-10 pointer-events-none"
                style={{ width: '24px', height: '24px', ...style }}
              />
            ))}

            {/* Viewfinder Center Target */}
            {webcamReady && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 mix-blend-overlay opacity-30">
                <div className="w-[60%] h-[70%] border-[1.5px] border-dashed border-[#ffb3b0] rounded-[100px] flex items-center justify-center">
                   <p className="text-[#ffb3b0] font-mono text-xs tracking-widest uppercase">Target Body</p>
                </div>
              </div>
            )}

            {/* Technical specs — desktop only */}
            <div
              className="absolute hidden md:block text-left space-y-1 z-20 pointer-events-none"
              style={{ top: '2rem', left: '4rem' }}
            >
              {[
                'Engine: v2.4.0_Vogue',
                'Tracking: Active_Optical',
                'Light_Source: Ambient_Detected',
              ].map((line) => (
                <p
                  key={line}
                  className="text-[10px] uppercase tracking-widest"
                  style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter, sans-serif' }}
                >
                  {line}
                </p>
              ))}
            </div>

            {/* Floating glass controls */}
            <div
              className="absolute flex items-center gap-8 px-6 py-4 shadow-2xl z-30"
              style={{
                bottom: '2rem',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(32, 31, 31, 0.45)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                boxShadow: '0 0 40px rgba(0,0,0,0.5)',
              }}
            >
              {/* Flip */}
              <button
                id="ar-flip-btn"
                onClick={handleFlip}
                className="flex flex-col items-center gap-1 group active:scale-90 transition-transform"
                style={{ color: '#e5e2e1' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ffb3b0')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#e5e2e1')}
              >
                <span
                  className="material-symbols-outlined transition-colors"
                  style={{ fontSize: '24px', color: 'inherit' }}
                >
                  flip_camera_ios
                </span>
                <span
                  className="text-[8px] uppercase tracking-tighter"
                  style={{ opacity: 0.6, fontFamily: 'Inter, sans-serif' }}
                >
                  Flip
                </span>
              </button>

              {/* Divider */}
              <div style={{ width: '1px', height: '2rem', background: 'rgba(255,255,255,0.12)' }} />

              {/* Shutter */}
              <button
                id="ar-capture-btn"
                onClick={handleCapture}
                className="flex items-center justify-center transition-all active:scale-95"
                style={{
                  width: '3.5rem', height: '3.5rem',
                  borderRadius: '50%',
                  border: '3px solid rgba(255,255,255,0.22)',
                }}
              >
                <div
                  style={{
                    width: '2.5rem', height: '2.5rem',
                    borderRadius: '50%',
                    background: '#ff6b6b',
                    boxShadow: '0 0 18px rgba(255,107,107,0.45)',
                  }}
                />
              </button>

              {/* Divider */}
              <div style={{ width: '1px', height: '2rem', background: 'rgba(255,255,255,0.12)' }} />

              {/* Assets Toggle */}
              <button
                id="ar-assets-btn"
                onClick={handleAssets}
                className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
                style={{ color: showAssets ? '#ffb3b0' : '#e5e2e1' }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '24px', color: 'inherit' }}
                >
                  gallery_thumbnail
                </span>
                <span
                  className="text-[8px] uppercase tracking-tighter"
                  style={{ opacity: 0.6, fontFamily: 'Inter, sans-serif' }}
                >
                  Assets
                </span>
              </button>
            </div>
            
            {/* Overlay Panel for 'Assets' */}
            <AnimatePresence>
              {showAssets && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-4 top-4 bg-[#131313]/80 backdrop-blur-md p-4 rounded-[4px] border border-white/5 z-40 w-48 shadow-2xl"
                >
                  <p className="text-[10px] tracking-widest uppercase font-bold text-[#ffb3b0] mb-3">Model Library</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className=" aspect-square bg-white/5 rounded-[2px] flex items-center justify-center hover:bg-white/10 cursor-pointer text-xs font-mono text-white/30">N/A</div>
                    <div className=" aspect-square bg-white/5 rounded-[2px] flex items-center justify-center hover:bg-white/10 cursor-pointer text-xs font-mono text-white/30">N/A</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── Feature cards grid ── */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.28 }}
          >
            {FEATURES.map(({ accent, label, title, body, borderTop }, i) => (
              <div
                key={i}
                className="p-8 space-y-4 rounded-[4px]"
                style={{
                  background: '#201f1f',
                  borderTop,
                }}
              >
                <span
                  className="block text-[10px] font-bold tracking-[0.22em] uppercase"
                  style={{ color: accent, fontFamily: 'Inter, sans-serif' }}
                >
                  {label}
                </span>
                <h4
                  className="italic text-2xl"
                  style={{ fontFamily: 'Newsreader, serif', color: '#e5e2e1' }}
                >
                  {title}
                </h4>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: 'rgba(229,226,225,0.55)', fontFamily: 'Inter, sans-serif' }}
                >
                  {body}
                </p>
              </div>
            ))}
          </motion.div>

        </div>
      </main>

      <BottomNavBar />
    </div>
  );
}
