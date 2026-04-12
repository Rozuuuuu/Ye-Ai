import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import TopAppBar from '../components/TopAppBar';
import BottomNavBar from '../components/BottomNavBar';

export default function Archive() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-background text-on-background overflow-x-hidden pb-32">
      <TopAppBar />

      <main className="pt-24 px-6 max-w-5xl mx-auto relative z-10">
        {/* Headline Section */}
        <motion.section 
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-baseline gap-4 mb-2">
            <span className="text-[10px] font-bold tracking-[0.3em] text-primary-container uppercase">Archive_01</span>
            <div className="h-[1px] flex-grow bg-outline-variant/30"></div>
          </div>
          <h2 className="font-['Inter'] text-6xl md:text-8xl font-black tracking-tighter uppercase leading-none mb-4">
            THE ARCHIVE
          </h2>
          <p className="font-['Newsreader'] italic text-xl text-on-surface-variant/80 max-w-md">
            A curated repository of your stylistic evolution, judged by the machine.
          </p>
        </motion.section>

        {/* Bento Grid / Asymmetric Feed */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-12 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Large Featured Entry */}
          <div className="md:col-span-8 group relative overflow-hidden bg-surface-container border border-outline-variant/10">
            <div className="aspect-[4/5] md:aspect-[16/10] overflow-hidden relative">
              <img 
                alt="Editorial fashion" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBsqFWiY97MgsquNHbIogUcyfXygjep01WF48uYzOETXIyJXnTtUosFhwm4sFNFjoETJb9ua2w8KpxNdakEZtpsDve7WOXVkkzssj0wX04HzDj8_qATv6ghfYBPrxchZxuQ7He1IQPqpCf-xx04XvmE8zGOxr2FJU1IcZY1nSGcgNgnIxh3m1J5wd32Hldb4bJ83YXDsICgoA3DTiEwMKS8jw8xS7DEyNm0UM5nR5ixxGDQ6JM-deZe7DjahyVfiUQvEQF_8wvX9T4"
              />
              {/* Viewfinder Brackets */}
              <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-primary-container"></div>
              <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-primary-container"></div>
              <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-primary-container"></div>
              <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-primary-container"></div>
              <div className="absolute bottom-6 right-6 flex flex-col items-end z-10">
                <span className="font-['Inter'] text-[10px] font-bold tracking-widest text-white/40 uppercase mb-1">Score Verdict</span>
                <div className="bg-primary-container px-4 py-2 text-[#131313] font-black text-3xl">92%</div>
              </div>
            </div>
            <div className="p-6 flex justify-between items-end relative z-10 bg-gradient-to-t from-surface-container via-surface-container to-transparent -mt-10">
              <div>
                <p className="font-['Inter'] text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mb-1">OCT 24, 2023</p>
                <h3 className="font-['Newsreader'] italic text-2xl text-on-surface">Neon Cyber-Chic</h3>
              </div>
              <button 
                onClick={() => navigate('/archive/1')}
                className="bg-surface-container-highest/50 backdrop-blur-md px-4 py-2 text-[10px] font-bold tracking-widest uppercase hover:bg-primary-container hover:text-black transition-all cursor-pointer z-20"
              >
                Details
              </button>
            </div>
          </div>

          {/* Small Entry 1 */}
          <div className="md:col-span-4 group bg-surface-container-low border border-outline-variant/10 cursor-pointer" onClick={() => navigate('/archive/2')}>
            <div className="aspect-square overflow-hidden relative">
              <img 
                alt="Menswear editorial" 
                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAn61q8nxkALTIKSVfPz0Tfi_V2LzKLkLNB_V88AObwcw3nC1kNby5OtXTyr73NhwoPr-ViFlHfKxQHL_bBvX52f14wl91eJmIYuCFhNQL6g6s1OX2intG0tZ6sCnCDHTxfTkOsd_I77_iW29-ns0psZAdKqt_VQoGOIfYyLwPq2Qbu_QRexRpyoctOGgrWaSP4RKESGk-0UReqNF0jI8Q7QaRsIf5IrdXOaZ5iBo-sXk6EQIwmGMEvEcdZVEM-CnzOe23RnPCv6r8"
              />
              <div className="absolute top-4 left-4">
                <div className="bg-surface-container-lowest/80 backdrop-blur-sm px-2 py-1 text-[10px] font-bold text-primary-container">78%</div>
              </div>
            </div>
            <div className="p-4">
              <p className="font-['Inter'] text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mb-1">OCT 20, 2023</p>
              <h3 className="font-['Newsreader'] italic text-lg text-on-surface">Monochrome Minimal</h3>
            </div>
          </div>

          {/* Small Entry 2 */}
          <div className="md:col-span-4 group bg-surface-container-low border border-outline-variant/10 cursor-pointer" onClick={() => navigate('/archive/3')}>
            <div className="aspect-square overflow-hidden relative">
              <img 
                alt="Streetwear outfit" 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDGCEIvqopIV5q4zw33F4bnEJ_uXTxCE03pQdaqIggqFS3zju2_l4b8PNYQhxxBQHbh6afoW0nZ1O60FGsYFfn3SPFZ28g8AvHMEpC-bPVAC32KrGmDZhGyyjnh593Azu5K_BGuC1CyNyzKqT274zqofcffP129xjt-pm5WiHld1PqnDe6fa7KIrEe9WpijLD9_2egk5TNimAZt3zBj0vD2XtA8oFOWnOJYfe1JJaKm9Ui476u7WGIlaQeyO4gpTTrjdhvjdNCeZ6M"
              />
              <div className="absolute top-4 left-4">
                <div className="bg-surface-container-lowest/80 backdrop-blur-sm px-2 py-1 text-[10px] font-bold text-primary-container">85%</div>
              </div>
            </div>
            <div className="p-4">
              <p className="font-['Inter'] text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mb-1">OCT 15, 2023</p>
              <h3 className="font-['Newsreader'] italic text-lg text-on-surface">Tech-Brutalist</h3>
            </div>
          </div>

          {/* Small Entry 3 */}
          <div className="md:col-span-4 group bg-surface-container-low border border-outline-variant/10 cursor-pointer" onClick={() => navigate('/archive/4')}>
            <div className="aspect-square overflow-hidden relative">
              <img 
                alt="High fashion accessory" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAtmzlEBlhkQSdQ42r7DJdjHAvyy9qeGko7wmwMjvoAuUWUbwpJA_WYDd9Xek20yi23L--BdnISTWmDniZM9UWjQUvqbf9us5p_7h3iVz40QTzFN4E1B-CDVOaEIfgPiRfcs6A5D2iWiow03sGlECU_YO-Gw5JabUJdZZK6pvh5sGgc_rJy0Qx7vLDYpeE0k3Rc7mgGr25fDll1o7rSn_Qvy43OjDgsktwk35z7VJiAnQ-rM7njXtXM2j9ICVjk8I08jBUPo9GZKcU"
              />
              <div className="absolute top-4 left-4">
                <div className="bg-surface-container-lowest/80 backdrop-blur-sm px-2 py-1 text-[10px] font-bold text-primary-container">64%</div>
              </div>
            </div>
            <div className="p-4">
              <p className="font-['Inter'] text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mb-1">OCT 12, 2023</p>
              <h3 className="font-['Newsreader'] italic text-lg text-on-surface">Soft Goth</h3>
            </div>
          </div>

          {/* Small Entry 4 */}
          <div className="md:col-span-4 group bg-surface-container-low border border-outline-variant/10 cursor-pointer" onClick={() => navigate('/archive/5')}>
            <div className="aspect-square overflow-hidden relative">
              <img 
                alt="Evening wear" 
                className="w-full h-full object-cover grayscale-0 group-hover:sepia transition-all duration-500" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCxZyg01AVjnx0i0h8DzQ0arnw6-zMlQw_ZqlOZqYFJ1nnwYHIm7yReea7nfNWHQ7X25fWUWmYCZjG-qDCtEuMUIIgoMmGBcEEx8WuqfPSGcBiP9GsimHykhvlifgDHedFJmpvaRvpwQuXpznLdumNqayuunsuUnUIVjg_8rKGj6dFvSDdUyHSCUImx9N7GfKF2S6QpzVc21Vr91PYxRmkgTCaUT6sBD9pQszRjYhs60SsqujU_OBb7dpNPY6lTv1fxbZbvdvs4ssc"
              />
              <div className="absolute top-4 left-4">
                <div className="bg-surface-container-lowest/80 backdrop-blur-sm px-2 py-1 text-[10px] font-bold text-primary-container">89%</div>
              </div>
            </div>
            <div className="p-4">
              <p className="font-['Inter'] text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mb-1">OCT 08, 2023</p>
              <h3 className="font-['Newsreader'] italic text-lg text-on-surface">Gilded Evening</h3>
            </div>
          </div>
        </motion.div>

        {/* Vertical Whitespace Transition */}
        <div className="h-24"></div>

        {/* System Status Bar */}
        <motion.section 
          className="bg-surface-container-highest/20 p-8 flex flex-col md:flex-row justify-between items-center gap-6 rounded-[2px]"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center md:text-left">
            <p className="font-['Inter'] text-[10px] font-bold tracking-widest text-primary-container uppercase mb-2">Total Scans</p>
            <p className="font-['Newsreader'] text-5xl italic">124</p>
          </div>
          <div className="h-[1px] w-12 md:h-12 md:w-[1px] bg-outline-variant/30"></div>
          <div className="text-center md:text-left">
            <p className="font-['Inter'] text-[10px] font-bold tracking-widest text-primary-container uppercase mb-2">Average Vibe</p>
            <p className="font-['Newsreader'] text-5xl italic">82.4%</p>
          </div>
          <div className="h-[1px] w-12 md:h-12 md:w-[1px] bg-outline-variant/30"></div>
          <div className="text-center md:text-left">
            <p className="font-['Inter'] text-[10px] font-bold tracking-widest text-primary-container uppercase mb-2">Stylist Tier</p>
            <p className="font-['Newsreader'] text-5xl italic">Vanguard</p>
          </div>
        </motion.section>

      </main>

      <BottomNavBar />
    </div>
  );
}
