import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import TryOn from './pages/TryOn';
import StyleDNA from './pages/StyleDNA';
import Archive from './pages/Archive';
import ArchiveDetail from './pages/ArchiveDetail';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tryon" element={<TryOn />} />
        <Route path="/style" element={<StyleDNA />} />
        <Route path="/archive" element={<Archive />} />
        <Route path="/archive/:id" element={<ArchiveDetail />} />
      </Routes>
    </BrowserRouter>
  );
}
