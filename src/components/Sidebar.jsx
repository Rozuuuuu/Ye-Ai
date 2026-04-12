import { motion, AnimatePresence } from 'framer-motion';

export default function Sidebar({ isOpen, onClose }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <aside className="fixed inset-0 z-[60] flex">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#131313]/80 backdrop-blur-sm"
          />

          {/* Sidebar Content */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-[400px] h-full bg-[#201f1f] shadow-[20px_0_80px_rgba(0,0,0,0.5)] flex flex-col overflow-y-auto no-scrollbar"
          >
            {/* Close Button Inside Sidebar */}
            <button 
              onClick={onClose} 
              className="absolute top-6 right-6 z-50 p-2 text-white/40 hover:text-[#ffb3b0] transition-colors"
              aria-label="Close menu"
            >
              <span className="material-symbols-outlined text-3xl">close</span>
            </button>

            {/* Profile Section */}
            <section className="pt-16 px-8 pb-12">
              <div className="flex flex-col gap-6">
                <div className="relative w-32 h-32 group">
                  <div className="absolute inset-0 border-[1.5px] border-[#ff6b6b]/20 -m-2"></div>
                  {/* Viewfinder Brackets */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-[1.5px] border-l-[1.5px] border-[#ff6b6b]"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-[1.5px] border-r-[1.5px] border-[#ff6b6b]"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-[1.5px] border-l-[1.5px] border-[#ff6b6b]"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-[1.5px] border-r-[1.5px] border-[#ff6b6b]"></div>
                  <img
                    alt="Profile"
                    className="w-full h-full object-cover grayscale"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCmX5VScWMpJCuuLHhI4vmTCPwuqhu43NN8w38zSGt_XOClatZzbcHd1Qyi-YvXfWQa73kUJTqiIvxs34aTsR4PcSeqLxvOU8EpLNExltltMwiWkyB28OKmtPbhBLstJw9ZJmh-fCFRVgiivkjiqLWS0zKMl0dMNcP1ZTjz1oBq0-lRMF4-aiCPRNJXD2e-DQHruDwPpcV7_yJ0LLD1NUCNTWA-l-hVqXpgYXpW23lMTP73N8Q_YIuKVIQz8mCP8SmQPeBLY2-UPoY"
                  />
                </div>
                <div>
                  <h2 className="font-['Newsreader'] italic text-4xl leading-none mb-2 text-[#e5e2e1]">Julian Vane</h2>
                  <p className="font-['Inter'] text-[10px] uppercase tracking-[0.2em] text-white/40">Member since 2024</p>
                </div>
              </div>
            </section>

            {/* Navigation Sections */}
            <nav className="flex-grow px-8 flex flex-col gap-12 pb-24">
              {/* Fashion Preferences */}
              <div>
                <h3 className="font-['Inter'] text-[10px] uppercase tracking-[0.3em] text-[#ff6b6b] mb-6 font-bold">Fashion Preferences</h3>
                <ul className="space-y-4">
                  <li>
                    <button className="group flex items-end gap-3 w-full text-left">
                      <span className="font-['Newsreader'] text-3xl opacity-40 group-hover:opacity-100 group-hover:text-[#ffb3b0] transition-all duration-500">Minimalist</span>
                      <div className="h-[1px] flex-grow bg-white/10 mb-2"></div>
                      <span className="font-['Inter'] text-[10px] text-white/20 mb-1">01</span>
                    </button>
                  </li>
                  <li>
                    <button className="group flex items-end gap-3 w-full text-left">
                      <span className="font-['Newsreader'] text-3xl opacity-100 text-[#e5e2e1] transition-all duration-500">Streetwear</span>
                      <div className="h-[1px] flex-grow bg-[#ffb3b0]/30 mb-2"></div>
                      <span className="font-['Inter'] text-[10px] text-[#ffb3b0] mb-1 font-bold">SELECTED</span>
                    </button>
                  </li>
                  <li>
                    <button className="group flex items-end gap-3 w-full text-left">
                      <span className="font-['Newsreader'] text-3xl opacity-40 group-hover:opacity-100 group-hover:text-[#ffb3b0] transition-all duration-500">Avant-Garde</span>
                      <div className="h-[1px] flex-grow bg-white/10 mb-2"></div>
                      <span className="font-['Inter'] text-[10px] text-white/20 mb-1">03</span>
                    </button>
                  </li>
                </ul>
              </div>

              {/* Subscription */}
              <div className="p-6 bg-[#353534]/50 relative overflow-hidden rounded-[2px]" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#ffb3b0]/5 blur-3xl rounded-full -mr-16 -mt-16"></div>
                <h3 className="font-['Inter'] text-[10px] uppercase tracking-[0.3em] text-white/60 mb-4 font-bold">Membership</h3>
                <div className="flex justify-between items-center relative z-10">
                  <span className="font-['Newsreader'] italic text-2xl text-[#e5e2e1]">Atelier Pro</span>
                  <button className="bg-[#ff6b6b]/80 text-[#131313] px-4 py-2 font-['Inter'] text-[10px] font-bold tracking-widest uppercase backdrop-blur-md hover:bg-[#ff6b6b] transition-colors rounded-[2px]">
                    Upgrade
                  </button>
                </div>
              </div>

              {/* System Links */}
              <div className="space-y-6">
                <div>
                  <h3 className="font-['Inter'] text-[10px] uppercase tracking-[0.3em] text-white/40 mb-4 font-bold">Connected</h3>
                  <div className="flex gap-4">
                    <span className="material-symbols-outlined text-white/60 cursor-pointer hover:text-[#ffb3b0] transition-colors">brand_awareness</span>
                    <span className="material-symbols-outlined text-white/60 cursor-pointer hover:text-[#ffb3b0] transition-colors">share</span>
                    <span className="material-symbols-outlined text-white/60 cursor-pointer hover:text-[#ffb3b0] transition-colors">link</span>
                  </div>
                </div>
                <div className="pt-6 border-t border-white/5 space-y-3">
                  <a className="block font-['Inter'] text-[11px] uppercase tracking-widest text-white/40 hover:text-white transition-colors" href="#">Legal & Privacy</a>
                  <a className="block font-['Inter'] text-[11px] uppercase tracking-widest text-white/40 hover:text-white transition-colors" href="#">Technical Support</a>
                  <a className="block font-['Inter'] text-[11px] uppercase tracking-widest text-[#ffb4ab]/60 hover:text-[#ffb4ab] transition-colors mt-8 font-bold" href="#">Sign Out</a>
                </div>
              </div>
            </nav>

            {/* Bottom Branding Accent */}
            <div className="absolute bottom-10 left-8 rotate-90 origin-left">
              <span className="font-['Newsreader'] italic text-6xl text-white/[0.03] whitespace-nowrap select-none pointer-events-none">
                THE DIGITAL COUTURIER
              </span>
            </div>
          </motion.div>

        </aside>
      )}
    </AnimatePresence>
  );
}
