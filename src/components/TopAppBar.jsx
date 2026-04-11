import { useState } from 'react';
import { motion } from 'framer-motion';

/**
 * TopAppBar — branded header with menu + flash toggle.
 * Positioned fixed at the top, transparent over the camera feed.
 */
export default function TopAppBar() {
  const [flashOn, setFlashOn] = useState(false);

  return (
    <header className="flex justify-between items-center w-full px-6 py-4 fixed top-0 z-50">
      {/* Left: Menu */}
      <motion.button
        id="menu-btn"
        className="flex items-center justify-center"
        style={{ color: 'rgba(255,255,255,0.5)' }}
        whileTap={{ scale: 0.88 }}
        whileHover={{ color: '#ffb3b0' }}
        aria-label="Open menu"
      >
        <span className="material-symbols-outlined">menu</span>
      </motion.button>

      {/* Center: Brand wordmark */}
      <div className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none">
        <h1
          className="italic text-2xl leading-none"
          style={{ fontFamily: 'Newsreader, serif', color: '#ffb3b0' }}
        >
          THE ATELIER
        </h1>
        <p
          className="tracking-[0.22em] uppercase text-[9px] font-bold mt-0.5"
          style={{ color: '#ffb3b0', fontFamily: 'Inter, sans-serif', opacity: 0.8 }}
        >
          AI FASHION JUDGE
        </p>
      </div>

      {/* Right: Flash toggle */}
      <motion.button
        id="flash-btn"
        onClick={() => setFlashOn((v) => !v)}
        style={{ color: flashOn ? '#ffb3b0' : 'rgba(255,255,255,0.5)' }}
        whileTap={{ scale: 0.88 }}
        aria-label={flashOn ? 'Flash on' : 'Flash off'}
        transition={{ duration: 0.15 }}
      >
        <span className="material-symbols-outlined">
          {flashOn ? 'flash_on' : 'flash_off'}
        </span>
      </motion.button>
    </header>
  );
}
