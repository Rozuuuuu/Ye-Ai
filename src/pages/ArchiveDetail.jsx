import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import TopAppBar from '../components/TopAppBar';
import BottomNavBar from '../components/BottomNavBar';

export default function ArchiveDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [capture, setCapture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('captures')
        .select('*')
        .eq('id', id)
        .single();
      
      if (!error && data) {
        setCapture(data);
      } else {
        console.error('Capture not found:', error);
      }
      setLoading(false);
    };
    fetchDetail();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this fit from the archive?')) return;
    
    setDeleting(true);
    try {
      // 1. Delete from Storage (extract fileName from URL)
      // URL format: .../outfits/outfit_123.jpg
      const fileName = capture.image_url.split('/').pop();
      await supabase.storage.from('outfits').remove([fileName]);

      // 2. Delete from Database
      const { error } = await supabase
        .from('captures')
        .delete()
        .eq('id', id);

      if (error) throw error;
      navigate('/archive');
    } catch (err) {
      alert('Failed to delete: ' + err.message);
      setDeleting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#131313] flex items-center justify-center">
      <div className="animate-pulse text-[10px] font-bold tracking-widest text-primary-container uppercase">
        Loading Neural Record...
      </div>
    </div>
  );

  if (!capture) return (
    <div className="min-h-screen bg-[#131313] flex flex-col items-center justify-center gap-4">
      <p className="font-['Newsreader'] italic text-2xl text-white/40">Record not found.</p>
      <button onClick={() => navigate('/archive')} className="text-[10px] font-bold text-primary-container uppercase tracking-widest">Return to Archive</button>
    </div>
  );

  return (
    <div className="relative min-h-screen bg-[#131313] text-[#e5e2e1] selection:bg-[#ff6b6b] selection:text-[#6d0010] overflow-x-hidden">
      <TopAppBar />

      {/* Main Content */}
      <main className="min-h-screen pt-24 px-6 pb-32">
        <div className="flex flex-col gap-8 max-w-5xl mx-auto">
          
          <div className="flex justify-between items-center">
            <button 
              onClick={() => navigate('/archive')}
              className="flex items-center gap-2 text-white/40 hover:text-white transition-colors w-max uppercase tracking-widest text-[10px] font-bold"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Back to Archive
            </button>

            <button 
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 text-red-500/40 hover:text-red-500 transition-colors w-max uppercase tracking-widest text-[10px] font-bold disabled:opacity-20"
            >
              <span className="material-symbols-outlined text-[16px]">{deleting ? 'refresh' : 'delete'}</span>
              {deleting ? 'Deleting...' : 'Delete Record'}
            </button>
          </div>

          {/* AI Verdict Banner */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative bg-[#201f1f] p-8 md:p-12 overflow-hidden rounded-[2px] border border-white/5"
          >
            <div className="relative z-10">
              <span className="font-['Inter'] text-[10px] uppercase tracking-[0.5em] text-[#ff6b6b] font-bold">
                AI VERDICT // {new Date(capture.created_at).toLocaleDateString()}
              </span>
              <h1 className="font-['Newsreader'] text-5xl md:text-8xl leading-none mt-6 tracking-tight italic">
                "{capture.verdict_quote}"
              </h1>
              <div className="mt-8 flex items-center gap-6">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] mb-1">Vibe Match</span>
                  <span className="text-xl font-bold uppercase tracking-widest" style={{ color: capture.vibe_color }}>{capture.vibe_label}</span>
                </div>
                <div className="w-[1px] h-10 bg-white/10"></div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] mb-1">Neural Score</span>
                  <span className="text-4xl font-black text-primary-container">{capture.vibe_score}%</span>
                </div>
              </div>
            </div>
            
            {/* Background Image Cutout */}
            <div className="absolute top-0 right-0 w-full md:w-1/2 h-full opacity-10 md:opacity-25 grayscale pointer-events-none">
              <img 
                alt="Analyzed outfit" 
                className="w-full h-full object-cover" 
                src={capture.image_url}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#201f1f] via-transparent to-transparent"></div>
            </div>
          </motion.section>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {/* Captured Image Display */}
             <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className="md:col-span-1 aspect-[3/4] bg-[#2a2a2a] relative group overflow-hidden"
             >
                <img src={capture.image_url} className="w-full h-full object-cover" alt="Full look" />
                <div className="absolute inset-x-0 bottom-0 p-4 bg-black/60 backdrop-blur-md border-t border-white/10">
                  <p className="text-[9px] font-bold tracking-widest text-white/40 uppercase">Original Capture</p>
                </div>
             </motion.div>

             {/* Palette & Suggestions */}
             <div className="md:col-span-2 flex flex-col gap-6">
                {/* Palette */}
                <div className="bg-[#201f1f] p-6 rounded-[2px] border border-white/5">
                  <h3 className="text-[10px] font-bold tracking-[0.25em] text-white/30 uppercase mb-6">Spectral Palette</h3>
                  <div className="flex gap-4">
                    {capture.palette?.map((color, i) => (
                      <div key={i} className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full shadow-xl" style={{ backgroundColor: color }} />
                        <span className="text-[8px] font-mono text-white/20">{color}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suggestions List */}
                <div className="bg-[#201f1f] p-6 flex-grow rounded-[2px] border border-white/5">
                  <h3 className="text-[10px] font-bold tracking-[0.25em] text-white/30 uppercase mb-6">Stylist Suggestions</h3>
                  <div className="space-y-4">
                    {capture.suggestions?.map((s, i) => (
                      <div key={i} className="flex gap-4 items-start p-4 bg-white/5 rounded-[2px] border border-white/5">
                        <span className="material-symbols-outlined text-primary-container text-lg">auto_awesome</span>
                        <div>
                          <p className="font-['Newsreader'] italic text-lg leading-tight text-white/90">{s.title || "Observation"}</p>
                          <p className="text-xs text-white/50 mt-1 leading-relaxed">{s.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
             </div>
          </div>

        </div>
      </main>

      <BottomNavBar />
    </div>
  );
}
