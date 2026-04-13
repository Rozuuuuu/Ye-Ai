import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import TopAppBar from '../components/TopAppBar';
import BottomNavBar from '../components/BottomNavBar';
import { supabase } from '../lib/supabase';

export default function Archive() {
  const navigate = useNavigate();
  const [captures, setCaptures] = useState([]);
  const [stats, setStats] = useState({ total: 0, average: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArchive = async () => {
      setLoading(true);
      try {
        // Fetch latest 50 captures
        const { data, error } = await supabase
          .from('captures')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        setCaptures(data || []);

        // Fetch overall stats
        const { count } = await supabase
          .from('captures')
          .select('*', { count: 'exact', head: true });
        
        // Final avg calculation in JS
        const avg = data.length > 0 
          ? (data.reduce((acc, curr) => acc + curr.vibe_score, 0) / data.length).toFixed(1)
          : 0;

        setStats({ total: count || data.length, average: avg });
      } catch (err) {
        console.error('Error fetching archive:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchArchive();
  }, []);

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
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-20">
            <span className="material-symbols-outlined animate-spin text-5xl mb-4">refresh</span>
            <span className="text-[10px] font-bold tracking-widest uppercase">Initializing Neural Link...</span>
          </div>
        ) : captures.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-outline-variant/20">
            <p className="font-['Newsreader'] italic text-2xl text-on-surface-variant/50">Your archive is currently empty.</p>
            <button 
              onClick={() => navigate('/')}
              className="mt-6 text-[10px] font-bold tracking-widest uppercase text-primary-container hover:underline"
            >
              Start analyzing
            </button>
          </div>
        ) : (
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-12 gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {captures.map((capture, index) => {
              // Determine size based on index for the Bento effect
              const isLarge = index === 0;
              const colSpan = isLarge ? 'md:col-span-8' : 'md:col-span-4';
              const aspect = isLarge ? 'aspect-[4/5] md:aspect-[16/10]' : 'aspect-square';

              return (
                <div 
                  key={capture.id}
                  className={`${colSpan} group relative overflow-hidden bg-surface-container border border-outline-variant/10 cursor-pointer transition-transform active:scale-[0.98]`}
                  onClick={() => navigate(`/archive/${capture.id}`)}
                >
                  <div className={`${aspect} overflow-hidden relative`}>
                    <img 
                      alt="Captured fit" 
                      className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${!isLarge ? 'grayscale group-hover:grayscale-0' : ''}`} 
                      src={capture.image_url}
                    />
                    
                    {isLarge && (
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-primary-container"></div>
                        <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-primary-container"></div>
                        <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-primary-container"></div>
                        <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-primary-container"></div>
                      </div>
                    )}

                    <div className={`absolute ${isLarge ? 'bottom-6 right-6' : 'top-4 left-4'} flex flex-col items-end z-10`}>
                      {isLarge && <span className="font-['Inter'] text-[10px] font-bold tracking-widest text-white/40 uppercase mb-1">Score Verdict</span>}
                      <div className={`${isLarge ? 'bg-primary-container text-[#131313] text-3xl' : 'bg-surface-container-lowest/80 backdrop-blur-sm text-primary-container text-[12px]'} px-4 py-2 font-black transition-colors`}>
                        {capture.vibe_score}%
                      </div>
                    </div>
                  </div>
                  
                  <div className={`p-6 ${isLarge ? 'bg-gradient-to-t from-surface-container via-surface-container to-transparent -mt-10 relative z-10' : ''}`}>
                    <p className="font-['Inter'] text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mb-1">
                      {new Date(capture.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                    </p>
                    <h3 className={`font-['Newsreader'] italic text-on-surface truncate ${isLarge ? 'text-2xl' : 'text-lg'}`}>
                      {capture.verdict_quote}
                    </h3>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* Vertical Whitespace Transition */}
        <div className="h-24"></div>

        {/* System Status Bar */}
        {!loading && captures.length > 0 && (
          <motion.section 
            className="bg-surface-container-highest/20 p-8 flex flex-col md:flex-row justify-between items-center gap-6 rounded-[2px]"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center md:text-left">
              <p className="font-['Inter'] text-[10px] font-bold tracking-widest text-primary-container uppercase mb-2">Total Scans</p>
              <p className="font-['Newsreader'] text-5xl italic">{stats.total}</p>
            </div>
            <div className="h-[1px] w-12 md:h-12 md:w-[1px] bg-outline-variant/30"></div>
            <div className="text-center md:text-left">
              <p className="font-['Inter'] text-[10px] font-bold tracking-widest text-primary-container uppercase mb-2">Average Vibe</p>
              <p className="font-['Newsreader'] text-5xl italic">{stats.average}%</p>
            </div>
            <div className="h-[1px] w-12 md:h-12 md:w-[1px] bg-outline-variant/30"></div>
            <div className="text-center md:text-left">
              <p className="font-['Inter'] text-[10px] font-bold tracking-widest text-primary-container uppercase mb-2">Stylist Tier</p>
              <p className="font-['Newsreader'] text-5xl italic">
                {stats.average >= 90 ? 'Vanguard' : stats.average >= 75 ? 'Visionary' : 'Seeker'}
              </p>
            </div>
          </motion.section>
        )}

      </main>

      <BottomNavBar />
    </div>
  );
}

