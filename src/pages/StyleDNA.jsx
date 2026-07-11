import { useState } from 'react';
import { motion } from 'framer-motion';
import TopAppBar from '../components/TopAppBar';
import BottomNavBar from '../components/BottomNavBar';

export default function StyleDNA() {
  const [riskLevel, setRiskLevel] = useState(85);

  return (
    <div className="relative min-h-screen bg-background text-on-background selection:bg-primary-container selection:text-on-primary-container">
      {/* ── Background Decorative Elements ── */}
      <div className="fixed pointer-events-none top-0 right-0 w-96 h-96 bg-primary-container/5 rounded-full blur-[120px] -z-10"></div>
      <div className="fixed pointer-events-none bottom-0 left-0 w-96 h-96 bg-secondary-container/5 rounded-full blur-[120px] -z-10"></div>
      
      {/* ── Visual Noise ── */}
      <div 
        className="fixed inset-0 pointer-events-none z-[100] opacity-[0.03]"
        style={{ backgroundImage: "url('/images/noise.svg')" }}
      />

      <TopAppBar />

      <main className="pt-24 pb-32 px-6 max-w-5xl mx-auto relative z-10 overflow-x-hidden">
        {/* ── Hero Branding ── */}
        <motion.section 
          className="mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-baseline gap-2 mb-2">
            <span className="font-label text-[10px] tracking-[0.3em] text-primary-container uppercase font-bold">
              Identity Module v.04
            </span>
          </div>
          <h1 className="font-headline text-6xl md:text-8xl lg:text-9xl font-bold tracking-tighter leading-none mb-4 uppercase">
            STYLE <span className="italic font-light">DNA</span>
          </h1>
          <p className="font-label text-sm text-on-surface-variant max-w-md uppercase tracking-widest leading-relaxed">
            Configure your aesthetic parameters for high-precision algorithmic curation.
          </p>
        </motion.section>

        {/* ── Viewfinder Aesthetics Grid (Bento Style) ── */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-20">
          {/* Card 1: Cyber-Chic */}
          <motion.div 
            className="md:col-span-8 group relative overflow-hidden bg-surface-container-high aspect-[16/10] md:aspect-auto"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="absolute inset-0 z-10 opacity-40 mix-blend-overlay bg-primary-container"></div>
            <img 
              alt="Cyber-Chic" 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
              src="/images/style-cyber-chic.jpg"
            />
            {/* Brackets */}
            <div className="absolute top-6 left-6 w-6 h-6 border-t-[1.5px] border-l-[1.5px] border-primary-container z-20"></div>
            <div className="absolute top-6 right-6 w-6 h-6 border-t-[1.5px] border-r-[1.5px] border-primary-container z-20"></div>
            <div className="absolute bottom-6 left-6 w-6 h-6 border-b-[1.5px] border-l-[1.5px] border-primary-container z-20"></div>
            <div className="absolute bottom-6 right-6 w-6 h-6 border-b-[1.5px] border-r-[1.5px] border-primary-container z-20"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10"></div>
            <div className="absolute bottom-0 left-0 p-8 z-20">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
                <h3 className="font-headline text-4xl italic text-white">Cyber-Chic</h3>
              </div>
              <p className="font-body text-xs text-white/70 tracking-widest uppercase max-w-xs">
                Neon-noir meets high-performance synthetic textiles.
              </p>
            </div>
            <div className="absolute top-8 right-8 z-20">
              <div className="bg-primary-container text-[#131313] px-4 py-1 text-[10px] font-bold tracking-[0.2em] uppercase">
                Selected
              </div>
            </div>
          </motion.div>

          {/* Card 2: Old Money */}
          <motion.div 
            className="md:col-span-4 group relative overflow-hidden bg-surface-container-low aspect-square"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <img 
              alt="Old Money" 
              className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" 
              src="/images/style-old-money.jpg"
            />
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors z-10"></div>
            <div className="absolute bottom-0 left-0 p-6 z-20 w-full">
              <h3 className="font-headline text-2xl text-white mb-1">Old Money</h3>
              <p className="font-body text-[10px] text-white/60 tracking-wider uppercase">
                Heritage silhouettes & natural fibers.
              </p>
            </div>
          </motion.div>

          {/* Card 3: Quiet Luxury */}
          <motion.div 
            className="md:col-span-4 group relative overflow-hidden bg-surface-container-low aspect-square"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <img 
              alt="Quiet Luxury" 
              className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" 
              src="/images/style-quiet-luxury.jpg"
            />
            <div className="absolute inset-0 bg-surface-container-lowest/40 z-10"></div>
            <div className="absolute bottom-0 left-0 p-6 z-20">
              <h3 className="font-headline text-2xl text-white mb-1">Quiet Luxury</h3>
              <p className="font-body text-[10px] text-white/60 tracking-wider uppercase">
                Logoless excellence. If you know, you know.
              </p>
            </div>
          </motion.div>

          {/* Card 4: Techwear */}
          <motion.div 
            className="md:col-span-8 group relative overflow-hidden bg-surface-container-high aspect-[16/10] md:aspect-auto"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <img 
              alt="Techwear" 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
              src="/images/style-techwear.jpg"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background to-transparent z-10"></div>
            <div className="absolute inset-0 flex items-center p-8 md:p-12 z-20">
              <div className="max-w-xs">
                <h3 className="font-headline text-4xl text-white mb-2">Techwear</h3>
                <p className="font-body text-[10px] text-white/60 tracking-[0.2em] uppercase leading-relaxed">
                  Urban utility. Water-repellent. Modular. Tactical precision for the city dweller.
                </p>
                <button className="mt-6 border-b border-primary-container text-primary-container text-[10px] font-bold tracking-[0.3em] uppercase py-1 active:opacity-50">
                  Explore Module
                </button>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ── Risk Level Slider ── */}
        <motion.section 
          className="bg-surface-container p-8 md:p-12 relative overflow-hidden rounded-lg"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="absolute top-0 right-0 p-8">
            <span className="material-symbols-outlined text-white/5 text-8xl md:text-[160px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              warning
            </span>
          </div>
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
              <div>
                <h2 className="font-headline text-4xl mb-2">RISK LEVEL</h2>
                <p className="font-label text-[10px] tracking-widest text-on-surface-variant uppercase">
                  How far do you want the AI to push your boundaries?
                </p>
              </div>
              <div className="text-left md:text-right">
                <span className="font-headline text-5xl italic text-primary-container">
                  {riskLevel >= 80 ? 'DANGEROUS' : riskLevel >= 40 ? 'EXPERIMENTAL' : 'SAFE'}
                </span>
                <p className="text-primary-container/60 text-xs font-mono mt-1">{riskLevel}%</p>
              </div>
            </div>
            
            <div className="relative pt-4">
              <style dangerouslySetInnerHTML={{__html: `
                .custom-slider::-webkit-slider-runnable-track { background: #353534; height: 2px; }
                .custom-slider::-webkit-slider-thumb { -webkit-appearance: none; height: 16px; width: 16px; border-radius: 0; background: #ff6b6b; margin-top: -7px; cursor: pointer; box-shadow: 0 0 10px rgba(255, 107, 107, 0.4); }
              `}} />
              <input 
                type="range" 
                min="1" 
                max="100" 
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value)}
                className="w-full appearance-none bg-transparent custom-slider outline-none cursor-ew-resize" 
              />
              <div className="flex justify-between mt-6 text-[9px] md:text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase">
                <span className={riskLevel < 40 ? "text-primary-container" : ""}>Safe / Conventional</span>
                <span className={riskLevel >= 40 && riskLevel < 80 ? "text-primary-container" : ""}>Experimental</span>
                <span className={riskLevel >= 80 ? "text-primary-container" : ""}>Dangerous / Avant-Garde</span>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ── Call to Action ── */}
        <motion.section 
          className="mt-20 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <button className="group relative px-12 py-5 bg-primary-container text-[#131313] overflow-hidden active:scale-95 transition-all w-full max-w-sm rounded-[2px] shadow-[0_0_30px_rgba(255,107,107,0.3)]">
            <span className="relative z-10 font-label text-xs font-bold tracking-[0.4em] uppercase">
              LOCK DNA PROFILE
            </span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          </button>
        </motion.section>

      </main>
      
      <BottomNavBar />
    </div>
  );
}
