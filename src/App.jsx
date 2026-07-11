import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';

// Lazy-loaded routes — keeps Three.js/AR code out of the landing bundle
const TryOn = lazy(() => import('./pages/TryOn'));
const StyleDNA = lazy(() => import('./pages/StyleDNA'));
const Archive = lazy(() => import('./pages/Archive'));
const ArchiveDetail = lazy(() => import('./pages/ArchiveDetail'));

const RouteFallback = () => (
  <div className="min-h-screen w-full flex items-center justify-center" style={{ background: '#131313' }}>
    <span
      className="text-[10px] font-bold tracking-widest uppercase animate-pulse"
      style={{ color: 'rgba(255,179,176,0.55)', fontFamily: 'Inter, sans-serif' }}
    >
      Loading…
    </span>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tryon" element={<TryOn />} />
          <Route path="/style" element={<StyleDNA />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/archive/:id" element={<ArchiveDetail />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
