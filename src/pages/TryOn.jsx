import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import TopAppBar from '../components/TopAppBar';
import BottomNavBar from '../components/BottomNavBar';

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
  const navigate = useNavigate();

  return (
    <div
      className="relative min-h-screen overflow-x-hidden"
      style={{ background: '#131313', color: '#e5e2e1', fontFamily: 'Inter, sans-serif' }}
    >
      {/* ── Decorative blobs ── */}
      <div
        className="fixed pointer-events-none"
        style={{
          top: '20%', right: '-6rem',
          width: '24rem', height: '24rem',
          background: 'rgba(255,107,107,0.05)',
          borderRadius: '50%',
          filter: 'blur(100px)',
        }}
      />
      <div
        className="fixed pointer-events-none"
        style={{
          bottom: '20%', left: '-6rem',
          width: '24rem', height: '24rem',
          background: 'rgba(79,59,122,0.07)',
          borderRadius: '50%',
          filter: 'blur(100px)',
        }}
      />

      <TopAppBar />

      <main className="min-h-screen pt-24 pb-32 px-6 flex flex-col items-center justify-center relative">
        <div className="w-full max-w-5xl z-10">

          {/* ── Brutalist header ── */}
          <motion.div
            className="mb-10"
            style={{ borderLeft: '4px solid #ff6b6b', paddingLeft: '1.5rem' }}
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2
              className="font-black tracking-tighter uppercase leading-none"
              style={{
                fontSize: 'clamp(3.5rem, 10vw, 6rem)',
                color: '#e5e2e1',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              TRY IT{' '}
              <span style={{ color: '#ff6b6b' }}>ON</span>
            </h2>
            <p
              className="italic text-xl mt-4 max-w-xl"
              style={{ fontFamily: 'Newsreader, serif', color: 'rgba(229,226,225,0.55)' }}
            >
              Experience the digital drape. Our high-precision AR engine calculates
              physics and texture in real-time.
            </p>
          </motion.div>

          {/* ── AR Viewfinder canvas ── */}
          <motion.div
            className="relative w-full overflow-hidden"
            style={{
              aspectRatio: window.innerWidth >= 768 ? '16/9' : '4/5',
              background: '#0e0e0e',
            }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 }}
          >
            {/* Corner brackets */}
            {[
              { top: '2rem', left: '2rem',  borderTop: '2px solid #ffb3b0', borderLeft: '2px solid #ffb3b0'  },
              { top: '2rem', right: '2rem', borderTop: '2px solid #ffb3b0', borderRight: '2px solid #ffb3b0' },
              { bottom: '2rem', left: '2rem',  borderBottom: '2px solid #ffb3b0', borderLeft: '2px solid #ffb3b0'  },
              { bottom: '2rem', right: '2rem', borderBottom: '2px solid #ffb3b0', borderRight: '2px solid #ffb3b0' },
            ].map((style, i) => (
              <div
                key={i}
                className="absolute"
                style={{ width: '24px', height: '24px', ...style }}
              />
            ))}

            {/* Center placeholder */}
            <div
              className="w-full h-full flex flex-col items-center justify-center text-center px-12"
              style={{ cursor: 'crosshair' }}
            >
              <div className="relative mb-6">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'rgba(255,179,176,0.15)',
                    filter: 'blur(40px)',
                    transform: 'scale(1.8)',
                  }}
                />
                <span
                  className="material-symbols-outlined block"
                  style={{
                    fontSize: '72px',
                    color: '#ffb3b0',
                    fontVariationSettings: "'FILL' 1",
                    position: 'relative',
                  }}
                >
                  camera
                </span>
              </div>

              <h3
                className="font-bold text-2xl tracking-widest uppercase mb-5"
                style={{ color: '#ffb3b0', fontFamily: 'Inter, sans-serif' }}
              >
                Web AR Engine
              </h3>

              <div
                className="text-sm tracking-[0.28em] uppercase max-w-md py-6"
                style={{
                  color: 'rgba(229,226,225,0.45)',
                  borderTop: '1px solid rgba(255,255,255,0.07)',
                  borderBottom: '1px solid rgba(255,255,255,0.07)',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                Web AR will load here
                <br />
                <span
                  className="block mt-2 text-xs"
                  style={{ opacity: 0.4 }}
                >
                  (8th Wall / Model-Viewer Implementation)
                </span>
              </div>
            </div>

            {/* Technical specs — desktop only */}
            <div
              className="absolute hidden md:block text-left space-y-1"
              style={{ bottom: '3rem', left: '3rem' }}
            >
              {[
                'Engine: v2.4.0_Vogue',
                'Tracking: Active_Optical',
                'Light_Source: Ambient_Detected',
              ].map((line) => (
                <p
                  key={line}
                  className="text-[10px] uppercase tracking-widest"
                  style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'Inter, sans-serif' }}
                >
                  {line}
                </p>
              ))}
            </div>

            {/* Floating glass controls */}
            <div
              className="absolute flex items-center gap-8 px-6 py-4 shadow-2xl"
              style={{
                bottom: '2rem',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(53, 53, 52, 0.65)',
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
                className="flex flex-col items-center gap-1 group"
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
                  style={{ opacity: 0.45, fontFamily: 'Inter, sans-serif' }}
                >
                  Flip
                </span>
              </button>

              {/* Divider */}
              <div style={{ width: '1px', height: '2rem', background: 'rgba(255,255,255,0.12)' }} />

              {/* Shutter */}
              <button
                id="ar-capture-btn"
                className="flex items-center justify-center transition-all active:scale-95"
                style={{
                  width: '3.5rem', height: '3.5rem',
                  borderRadius: '50%',
                  border: '3px solid rgba(255,255,255,0.18)',
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

              {/* Assets */}
              <button
                id="ar-assets-btn"
                className="flex flex-col items-center gap-1"
                style={{ color: '#e5e2e1' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ffb3b0')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#e5e2e1')}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '24px', color: 'inherit' }}
                >
                  gallery_thumbnail
                </span>
                <span
                  className="text-[8px] uppercase tracking-tighter"
                  style={{ opacity: 0.45, fontFamily: 'Inter, sans-serif' }}
                >
                  Assets
                </span>
              </button>
            </div>
          </motion.div>

          {/* ── Feature cards grid ── */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.28 }}
          >
            {FEATURES.map(({ accent, label, title, body, borderTop }, i) => (
              <div
                key={i}
                className="p-8 space-y-4"
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
