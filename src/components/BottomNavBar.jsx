import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { id: 'nav-camera', icon: 'camera', label: 'Camera', path: '/' },
  { id: 'nav-tryon',  icon: 'auto_awesome', label: 'Try On', path: '/tryon' },
  { id: 'nav-style',  icon: 'styler', label: 'Style', path: '/style' },
];

/**
 * BottomNavBar — fixed bottom navigation bar.
 * Active route icon gets a coral pill highlight with glow.
 */
export default function BottomNavBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-8 pb-8 pt-4"
      style={{
        background: 'rgba(32, 31, 31, 0.65)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 -8px 32px rgba(255, 107, 107, 0.04)',
      }}
    >
      {NAV_ITEMS.map(({ id, icon, label, path }) => {
        const isActive = pathname === path;
        return (
          <motion.button
            key={id}
            id={id}
            onClick={() => navigate(path)}
            whileTap={{ scale: 0.85 }}
            className="flex items-center justify-center w-12 h-12 rounded-full transition-colors duration-200"
            style={
              isActive
                ? {
                    background: '#ff6b6b',
                    color: '#131313',
                    boxShadow: '0 0 20px rgba(255, 107, 107, 0.55)',
                  }
                : { color: 'rgba(255,255,255,0.35)' }
            }
            aria-label={label}
          >
            <span className="material-symbols-outlined">{icon}</span>
          </motion.button>
        );
      })}
    </nav>
  );
}
