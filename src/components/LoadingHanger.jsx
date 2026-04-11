import { motion } from 'framer-motion';

/**
 * LoadingHanger — animated clothes hanger SVG that swings,
 * shown during the 2-second AI analysis simulation.
 */
export default function LoadingHanger() {
  return (
    <div className="flex flex-col items-center gap-5">
      {/* Swinging hanger */}
      <motion.div
        animate={{ rotate: [-14, 14, -14] }}
        transition={{ duration: 0.85, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '50% 0%', display: 'inline-block' }}
      >
        <svg
          width="68"
          height="68"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Hook */}
          <path
            d="M32 7 C32 7 36 7 36 11 C36 15 32 15 32 19"
            stroke="#ffb3b0"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          {/* Triangle body */}
          <path
            d="M32 19 L9 48 L55 48 Z"
            stroke="#ffb3b0"
            strokeWidth="2"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Bottom bar */}
          <line
            x1="9"
            y1="48"
            x2="55"
            y2="48"
            stroke="#ffb3b0"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </motion.div>

      {/* Pulsing dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: '#ffb3b0' }}
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.22 }}
          />
        ))}
      </div>

      {/* Label */}
      <p
        className="text-[10px] tracking-[0.35em] uppercase"
        style={{ color: 'rgba(255,179,176,0.55)', fontFamily: 'Inter, sans-serif' }}
      >
        Analyzing your fit…
      </p>
    </div>
  );
}
