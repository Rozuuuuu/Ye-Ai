import { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { motion, AnimatePresence } from 'framer-motion';

import TopAppBar from '../components/TopAppBar';
import BottomNavBar from '../components/BottomNavBar';
import ViewfinderOverlay from '../components/ViewfinderOverlay';
import VerdictDrawer from '../components/VerdictDrawer';
import LoadingHanger from '../components/LoadingHanger';
import { getRandomVerdict } from '../data/verdicts';

const LS_IMAGE = 'afj-last-capture';
const LS_COUNT = 'afj-capture-count';

const VIDEO_CONSTRAINTS = {
  facingMode: { ideal: 'environment' },
  width:  { ideal: 1280 },
  height: { ideal: 720 },
};

export default function Home() {
  const webcamRef = useRef(null);

  // ── State ───────────────────────────────────────────────
  const [webcamReady, setWebcamReady] = useState(false);
  const [webcamError, setWebcamError] = useState(false);
  const [isLoading,   setIsLoading]   = useState(false);
  const [showDrawer,  setShowDrawer]  = useState(false);
  const [capturedImg, setCapturedImg] = useState(null);
  const [verdict,     setVerdict]     = useState(null);
  const [lastThumb,   setLastThumb]   = useState(null);
  const [captureCount, setCaptureCount] = useState(0);

  // Load persisted thumbnail + count on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_IMAGE);
      if (saved) setLastThumb(saved);
      const count = parseInt(localStorage.getItem(LS_COUNT) || '0', 10);
      setCaptureCount(count);
    } catch { /* localStorage not available */ }
  }, []);

  // ── Capture handler ─────────────────────────────────────
  const handleCapture = useCallback(() => {
    if (isLoading || showDrawer) return;

    let img = null;

    // Attempt webcam screenshot
    if (webcamRef.current && webcamReady) {
      img = webcamRef.current.getScreenshot();
    }

    // Fallback: reuse last thumbnail
    if (!img && lastThumb) img = lastThumb;

    // Persist to localStorage
    if (img) {
      try {
        localStorage.setItem(LS_IMAGE, img);
        const newCount = captureCount + 1;
        localStorage.setItem(LS_COUNT, String(newCount));
        setCaptureCount(newCount);
        setLastThumb(img);
      } catch {
        // Storage quota exceeded — proceed without persisting
      }
    }

    setCapturedImg(img);
    setVerdict(getRandomVerdict());
    setIsLoading(true);

    // Simulate 2.2 s AI analysis
    setTimeout(() => {
      setIsLoading(false);
      setShowDrawer(true);
    }, 2200);
  }, [isLoading, showDrawer, webcamReady, lastThumb, captureCount]);

  const handleClose = () => {
    setShowDrawer(false);
    setCapturedImg(null);
  };

  // Reopen last capture result
  const handleThumbnailClick = () => {
    if (!lastThumb || isLoading || showDrawer) return;
    setCapturedImg(lastThumb);
    setVerdict(getRandomVerdict());
    setShowDrawer(true);
  };

  // ── Render ──────────────────────────────────────────────
  return (
    <div className="relative h-screen w-screen overflow-hidden">

      {/* ═══ Camera background layer ═══ */}
      <div className="fixed inset-0 z-0 bg-black">
        {!webcamError ? (
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            screenshotQuality={0.72}
            videoConstraints={VIDEO_CONSTRAINTS}
            onUserMedia={() => setWebcamReady(true)}
            onUserMediaError={() => setWebcamError(true)}
            className="w-full h-full object-cover"
            style={{ filter: 'brightness(0.78) contrast(1.12)', display: 'block' }}
          />
        ) : (
          /* No-camera fallback gradient */
          <div
            className="w-full h-full"
            style={{
              background:
                'radial-gradient(ellipse at 35% 55%, rgba(255,107,107,0.07) 0%, transparent 55%), radial-gradient(ellipse at 70% 30%, rgba(209,188,255,0.05) 0%, transparent 50%), #0e0e0e',
            }}
          />
        )}

        {/* Vignette / gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, rgba(13,13,13,0.92) 0%, transparent 38%, rgba(13,13,13,0.45) 100%)',
          }}
        />
      </div>

      {/* ═══ Header ═══ */}
      <TopAppBar />

      {/* ═══ Desktop side-data panel ═══ */}
      <aside
        className="hidden lg:flex fixed left-8 top-1/2 -translate-y-1/2 flex-col gap-7 z-10"
        style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.35 }}
      >
        {[
          { label: 'System Status',  value: 'Neural Engine: Online'    },
          { label: 'Calibration',    value: 'Spectral Sensitivity: 98%' },
          { label: 'Captures',       value: `${String(captureCount).padStart(4, '0')} Analyzed` },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-1">
            <span style={{ color: '#ff6b6b' }}>{label}</span>
            <span style={{ color: 'rgba(229,226,225,0.55)' }}>{value}</span>
          </div>
        ))}
      </aside>

      {/* ═══ Viewfinder (center) ═══ */}
      <main className="relative z-10 h-screen flex flex-col items-center justify-center pointer-events-none">
        <ViewfinderOverlay />
      </main>

      {/* ═══ Bottom interface ═══ */}
      <div className="fixed bottom-0 left-0 w-full z-20 px-6 pb-24 pt-6">
        <div className="max-w-md mx-auto flex flex-col items-center">

          {/* PRIMARY ACTION BUTTON */}
          <motion.button
            id="judge-btn"
            onClick={handleCapture}
            disabled={isLoading || showDrawer}
            className="relative w-full mb-6 disabled:cursor-not-allowed"
            whileTap={{ scale: 0.97 }}
          >
            {/* Ambient glow */}
            <div
              className="absolute inset-0 blur-[22px] opacity-35"
              style={{ background: 'rgba(255,107,107,0.9)', borderRadius: '2px' }}
            />
            {/* Glass face */}
            <div
              className="relative flex items-center justify-center py-5 px-10 transition-opacity"
              style={{
                background: 'rgba(255, 107, 107, 0.18)',
                backdropFilter: 'blur(22px)',
                WebkitBackdropFilter: 'blur(22px)',
                borderLeft: '2px solid rgba(255,179,176,0.7)',
                boxShadow: '0 0 48px rgba(255,107,107,0.12), inset 0 0 24px rgba(255,107,107,0.06)',
                opacity: isLoading || showDrawer ? 0.55 : 1,
              }}
            >
              <span
                className="font-extrabold tracking-[0.28em] text-lg uppercase"
                style={{ color: '#6d0010', fontFamily: 'Inter, sans-serif' }}
              >
                JUDGE THIS FIT
              </span>
            </div>
          </motion.button>

          {/* Powered-by label */}
          <p
            className="text-[10px] font-medium tracking-widest uppercase mb-7"
            style={{ color: 'rgba(255,255,255,0.32)', fontFamily: 'Inter, sans-serif' }}
          >
            Powered by{' '}
            <span style={{ color: '#ffb3b0', fontFamily: 'Newsreader, serif', fontStyle: 'italic' }}>
              AI Stylist
            </span>
          </p>

          {/* Bottom tool row */}
          <div className="w-full flex justify-between items-center">
            {/* Last capture thumbnail */}
            <motion.button
              id="last-photo-btn"
              onClick={handleThumbnailClick}
              className="relative"
              whileTap={{ scale: 0.92 }}
              aria-label="View last analyzed photo"
            >
              <div
                className="w-14 h-14 rounded-full p-[3px] overflow-hidden"
                style={{ border: '1px solid rgba(255,179,176,0.22)' }}
              >
                {lastThumb ? (
                  <img
                    src={lastThumb}
                    alt="Last analyzed"
                    className="w-full h-full object-cover rounded-full"
                    style={{ filter: 'grayscale(80%)' }}
                    onMouseEnter={(e) => (e.target.style.filter = 'grayscale(0%)')}
                    onMouseLeave={(e) => (e.target.style.filter = 'grayscale(80%)')}
                  />
                ) : (
                  <div
                    className="w-full h-full rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(255,179,176,0.05)' }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: '18px', color: 'rgba(255,179,176,0.3)' }}
                    >
                      photo_camera
                    </span>
                  </div>
                )}
              </div>

              {captureCount > 0 && (
                <div
                  className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full text-[8px] font-bold"
                  style={{ background: '#ffb3b0', color: '#131313', fontFamily: 'Inter, sans-serif' }}
                >
                  {captureCount > 99 ? '99+' : captureCount}
                </div>
              )}
            </motion.button>

            {/* Aspect ratio selector */}
            <div
              className="flex gap-4 text-[11px] tracking-tight"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              <span className="font-bold" style={{ color: '#ffb3b0' }}>9:16</span>
              <span style={{ color: 'rgba(255,255,255,0.28)' }}>3:4</span>
              <span style={{ color: 'rgba(255,255,255,0.28)' }}>1:1</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Loading overlay ═══ */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center"
            style={{ background: 'rgba(13,13,13,0.88)', backdropFilter: 'blur(10px)', zIndex: 80 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <LoadingHanger />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Verdict Drawer ═══ */}
      <VerdictDrawer
        isOpen={showDrawer}
        onClose={handleClose}
        capturedImage={capturedImg}
        verdict={verdict}
      />

      {/* ═══ Bottom Nav ═══ */}
      <BottomNavBar />
    </div>
  );
}
