import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMediaQuery } from 'react-responsive';

/* ─────────────────────────────────────────────────── */
/*  Canvas-based palette extractor (no external dep)  */
/* ─────────────────────────────────────────────────── */
const extractPalette = (src, count = 5) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const SIZE = 120;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const { data } = ctx.getImageData(0, 0, SIZE, SIZE);

        // Collect opaque pixels
        const pixels = [];
        for (let i = 0; i < data.length; i += 16) {
          if (data[i + 3] > 128) pixels.push([data[i], data[i + 1], data[i + 2]]);
        }
        if (!pixels.length) return resolve([]);

        // Sort by perceived luminance
        pixels.sort(
          ([r1, g1, b1], [r2, g2, b2]) =>
            0.299 * r1 + 0.587 * g1 + 0.114 * b1 -
            (0.299 * r2 + 0.587 * g2 + 0.114 * b2)
        );

        // Divide into `count` buckets and average each
        const bucket = Math.max(1, Math.floor(pixels.length / count));
        const hex = pixels
          .filter((_, i) => i % bucket === Math.floor(bucket / 2))
          .slice(0, count)
          .map(([r, g, b]) =>
            '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')
          );
        resolve(hex);
      } catch {
        resolve([]);
      }
    };
    img.onerror = () => resolve([]);
    img.src = src;
  });

/* ─────────────────────────────────────────────────── */
/*  SuggestionCard                                     */
/* ─────────────────────────────────────────────────── */
function SuggestionCard({ suggestion }) {
  const { icon, label, title, description, active } = suggestion;
  return (
    <div
      className="flex-none w-72 p-6 flex flex-col gap-4"
      style={{
        background: active ? 'rgba(42, 42, 42, 0.65)' : 'rgba(28, 27, 27, 0.4)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '4px',
        backdropFilter: 'blur(12px)',
        opacity: active ? 1 : 0.5,
      }}
    >
      <div className="flex justify-between items-start">
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: '22px',
            color: active ? '#ff6b6b' : 'rgba(255,255,255,0.28)',
            fontVariationSettings: "'FILL' 1",
          }}
        >
          {icon}
        </span>
        <span
          className="text-[9px] font-bold tracking-[0.22em] uppercase"
          style={{
            color: active ? '#ff6b6b' : 'rgba(255,255,255,0.25)',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {label}
        </span>
      </div>

      <p
        className="text-lg leading-snug"
        style={{
          fontFamily: 'Newsreader, serif',
          color: active ? '#e5e2e1' : 'rgba(229,226,225,0.4)',
        }}
      >
        {title}
      </p>

      <p
        className="text-xs leading-relaxed"
        style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Inter, sans-serif' }}
      >
        {description}
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────── */
/*  VerdictDrawer                                      */
/*  Mobile/Tablet → bottom sheet (82 vh)               */
/*  Desktop       → bottom-anchored modal (max-w-3xl)  */
/* ─────────────────────────────────────────────────── */
export default function VerdictDrawer({ isOpen, onClose, capturedImage, verdict }) {
  const isDesktop = useMediaQuery({ minWidth: 1024 });
  const [palette, setPalette] = useState([]);

  /* Extract palette whenever a new image arrives */
  useEffect(() => {
    if (!capturedImage || !isOpen) return;
    setPalette([]);
    extractPalette(capturedImage, 5).then(setPalette);
  }, [capturedImage, isOpen]);

  if (!verdict) return null;

  /* Framer Motion sheet variants */
  const sheetVariants = isDesktop
    ? {
        hidden:  { opacity: 0, scale: 0.94, y: 20 },
        visible: { opacity: 1, scale: 1,    y: 0  },
        exit:    { opacity: 0, scale: 0.94, y: 20 },
      }
    : {
        hidden:  { y: '100%' },
        visible: { y: 0      },
        exit:    { y: '100%' },
      };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Blurred captured-image backdrop ── */}
          <motion.div
            className="fixed inset-0"
            style={{ zIndex: 95 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {capturedImage && (
              <img
                src={capturedImage}
                alt=""
                aria-hidden
                className="w-full h-full object-cover"
                style={{
                  filter: 'blur(12px) brightness(0.42) grayscale(0.2)',
                  transform: 'scale(1.06)',
                }}
              />
            )}
            {/* Dark tint */}
            <div
              className="absolute inset-0"
              style={{ background: 'rgba(13,13,13,0.58)' }}
            />
            {/* Tap-outside to dismiss */}
            <div className="absolute inset-0" onClick={onClose} />
          </motion.div>

          {/* ── Sheet / Modal ── */}
          <div
            className={
              isDesktop
                ? 'fixed inset-0 flex items-end justify-center'
                : 'fixed inset-x-0 bottom-0 flex items-end'
            }
            style={{ zIndex: 96 }}
          >
            <motion.section
              className={isDesktop ? 'w-full max-w-3xl' : 'w-full'}
              style={{
                background:
                  'linear-gradient(to bottom, rgba(32,31,31,0.84), rgba(13,13,13,0.98))',
                backdropFilter: 'blur(28px)',
                WebkitBackdropFilter: 'blur(28px)',
                borderTop: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '1.5rem 1.5rem 0 0',
                boxShadow: '0 -24px 64px rgba(0,0,0,0.6)',
                maxHeight: isDesktop ? '85vh' : '82vh',
                overflowY: 'auto',
              }}
              variants={sheetVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ type: 'spring', damping: 28, stiffness: 270 }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div
                  className="w-12 h-1.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.15)' }}
                />
              </div>

              <div className="px-6 pt-6 pb-28 space-y-8 max-w-3xl mx-auto">

                {/* ── Analyzed Image Thumbnail ── */}
                {capturedImage && (
                  <div className="flex justify-center -mb-2">
                    <div 
                      className="relative w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden shadow-2xl"
                      style={{ 
                        border: '2px solid rgba(255,107,107,0.3)',
                        boxShadow: '0 0 30px rgba(255,107,107,0.15)'
                      }}
                    >
                      <img
                        src={capturedImage}
                        alt="Analyzed outfit"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 rounded-full shadow-[inset_0_0_15px_rgba(0,0,0,0.6)] pointer-events-none" />
                    </div>
                  </div>
                )}

                {/* ── Vibe Score pill ── */}
                <div className="flex justify-center">
                  <div
                    className="px-6 py-2 rounded-full"
                    style={{
                      background: 'rgba(255,107,107,0.12)',
                      border: '1px solid rgba(255,107,107,0.3)',
                    }}
                  >
                    <span
                      className="font-bold text-[12px] tracking-[0.28em] uppercase"
                      style={{ color: '#ff6b6b', fontFamily: 'Inter, sans-serif' }}
                    >
                      VIBE SCORE: {verdict.score}% ✨
                    </span>
                  </div>
                </div>

                {/* ── Main editorial quote ── */}
                <div className="text-center px-2 md:px-8">
                  <p
                    className="italic leading-tight"
                    style={{
                      fontFamily: 'Newsreader, serif',
                      fontSize: 'clamp(1.55rem, 5vw, 2.75rem)',
                      color: '#e5e2e1',
                      lineHeight: 1.22,
                    }}
                  >
                    "{verdict.quote}"
                  </p>

                  {/* Vibe label with rules */}
                  <div className="flex items-center justify-center gap-3 mt-5">
                    <div
                      className="h-px flex-1 max-w-[4rem]"
                      style={{ background: 'rgba(255,255,255,0.1)' }}
                    />
                    <span
                      className="text-[10px] tracking-[0.28em] uppercase font-bold"
                      style={{ color: verdict.vibeColor, fontFamily: 'Inter, sans-serif', opacity: 0.85 }}
                    >
                      {verdict.vibe}
                    </span>
                    <div
                      className="h-px flex-1 max-w-[4rem]"
                      style={{ background: 'rgba(255,255,255,0.1)' }}
                    />
                  </div>
                </div>

                {/* ── Dominant Colors ── */}
                <div className="space-y-4">
                  <h3
                    className="text-[10px] tracking-[0.22em] uppercase font-bold text-center"
                    style={{ color: 'rgba(255,255,255,0.32)', fontFamily: 'Inter, sans-serif' }}
                  >
                    Dominant Colors
                  </h3>

                  {palette.length > 0 ? (
                    <div className="flex justify-center gap-5 flex-wrap">
                      {palette.map((color) => (
                        <div key={color} className="group flex flex-col items-center gap-2">
                          <div
                            className="w-12 h-12 rounded-full shadow-lg transition-transform duration-200 group-hover:scale-110"
                            style={{
                              backgroundColor: color,
                              boxShadow: `0 4px 18px ${color}60`,
                            }}
                          />
                          <span
                            className="text-[8px] tracking-wider font-mono"
                            style={{ color: 'rgba(255,255,255,0.28)' }}
                          >
                            {color}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Skeleton while extracting */
                    <div className="flex justify-center gap-5">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className="w-12 h-12 rounded-full animate-pulse"
                          style={{ background: 'rgba(255,255,255,0.07)', animationDelay: `${i * 0.1}s` }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Refinement Suggestion cards ── */}
                {verdict.suggestions?.length > 0 && (
                  <div className="space-y-4">
                    <h3
                      className="text-[10px] tracking-[0.22em] uppercase font-bold"
                      style={{ color: 'rgba(255,255,255,0.32)', fontFamily: 'Inter, sans-serif' }}
                    >
                      Refinement Suggestions
                    </h3>

                    <div
                      className="flex gap-4 overflow-x-auto pb-3 -mx-2 px-2"
                      style={{ scrollbarWidth: 'none' }}
                    >
                      {verdict.suggestions.map((s, i) => (
                        <SuggestionCard key={i} suggestion={s} />
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Generate Shopping List CTA ── */}
                <div className="flex justify-center pt-2">
                  <button
                    id="verdict-shop-btn"
                    className="w-full max-w-sm py-4 font-bold tracking-[0.22em] uppercase text-xs transition-all active:scale-[0.98]"
                    style={{
                      background: 'rgba(255,107,107,0.9)',
                      color: '#131313',
                      fontFamily: 'Inter, sans-serif',
                      borderRadius: '2px',
                      boxShadow: '0 0 36px rgba(255,107,107,0.3)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#ff6b6b')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,107,107,0.9)')}
                  >
                    GENERATE SHOPPING LIST
                  </button>
                </div>

                {/* ── Judge Again ── */}
                <div className="flex justify-center -mt-4">
                  <button
                    id="verdict-close-btn"
                    onClick={onClose}
                    className="py-3 px-8 text-[11px] tracking-widest uppercase font-bold transition-all active:scale-[0.97]"
                    style={{
                      background: 'transparent',
                      color: 'rgba(255,179,176,0.68)',
                      border: '1px solid rgba(255,179,176,0.2)',
                      borderRadius: '2px',
                      fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    Judge Again
                  </button>
                </div>

              </div>
            </motion.section>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
