import { motion } from 'framer-motion';
import TopAppBar from '../components/TopAppBar';
import BottomNavBar from '../components/BottomNavBar';

export default function Archive() {
  return (
    <div className="relative min-h-screen bg-[#131313] text-[#e5e2e1] selection:bg-[#ff6b6b] selection:text-[#6d0010] overflow-hidden">
      <TopAppBar />

      {/* Main Canvas Content */}
      <main className="min-h-screen pt-24 px-6 pb-32">
        <div className="flex flex-col gap-8 max-w-5xl mx-auto">
          {/* AI Verdict Banner */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative bg-[#201f1f] p-8 overflow-hidden rounded-[2px]"
          >
            <div className="relative z-10">
              <span className="font-['Inter'] text-[10px] uppercase tracking-[0.5em] text-[#ff6b6b] font-bold">
                AI VERDICT
              </span>
              <h1 className="font-['Newsreader'] text-6xl md:text-8xl leading-none mt-4 tracking-tight">
                ABSOLUTELY NOT.
              </h1>
              <p className="font-['Inter'] text-white/60 max-w-md mt-6 leading-relaxed">
                The proportions clash violently with the seasonal silhouette. We suggest structural asymmetry to regain authority.
              </p>
            </div>
            <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 grayscale pointer-events-none">
              <img 
                alt="Fashion model" 
                className="w-full h-full object-cover" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDU79__NBpVl5z9r33Xn9MJ-MxOXQtLVXEyK6wT1Q-MYkCTrgUOmO_3XSPFs7g21Zjc25rZsRq2kaFgbjEwPzJfg1JCbkvOCiOXkUCkH2zhA64C3s1grQQkPL-CWTTxUP7OrpQiblODYCqvlIY1iek7hyZqiJvEgdJG59rgFdCgd8xf25FuAJ_J6lApp7Yx9O2ebV5i89bo5arBSBFFVwBYwPnkBAWFyXXxQE6otOpympw4BcjRKDM5m2pUE0MRRYSz3K74DavjEuM"
              />
            </div>
          </motion.section>

          {/* Recommendation Bento */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <div className="md:col-span-2 bg-[#2a2a2a] p-8 flex flex-col justify-between min-h-[300px] rounded-[2px]">
              <span className="font-['Inter'] text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold">
                Suggested Pieces
              </span>
              <div className="flex gap-4 overflow-x-auto no-scrollbar py-4">
                <div className="flex-shrink-0 w-48 h-64 bg-[#0e0e0e] relative group rounded-[2px] overflow-hidden">
                  <img 
                    alt="Coat" 
                    className="w-full h-full object-cover grayscale opacity-80 group-hover:opacity-100 transition-all duration-300" 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCtVhzaWtJLELBLezcg85GfIthH5X7mbRrjtPSDBbis0GSbuzuFlVWHloBQ2Tu4SfObRRZZW5IEwKQMmabuS8O7H1Ic5N9IQho16nhNPxm7xE3NyUIGvu1-Oad-ULV3uEkGkaOCd8Fv7QxLbisMVHfwBNQY6eWvFrH09AVMw4ls_dbBwblqI5WPUvxqKY1lvTSD3M49jl-ej9Dtlh32bwQuIfKsxwek_SQNpYvB38HjV9eemebcxG9leKl5AVQsbUzp8zIDSPtljEw"
                  />
                </div>
                <div className="flex-shrink-0 w-48 h-64 bg-[#0e0e0e] relative group rounded-[2px] overflow-hidden">
                  <img 
                    alt="Jacket" 
                    className="w-full h-full object-cover grayscale opacity-80 group-hover:opacity-100 transition-all duration-300" 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDYZGlXdX2ZkAmqF1YzK3qScgCiIYtpQqzc9ZQnCq-zQ351eQVbZ3OM2aiFS1V78jnb4tUoxuBFvop-avXj8CL8j_xDggKTI4dUw9XtPLVHhNjYOxDqz0US2CKHhhPWjgw-LnpsLsOHkdEbrHz5kAHSNCS8Sji3Vz2Wt6OjqYSdlj1xhzN-eswNoKtHeB6J59sRNBl1udABwB1c99Mss2K4kVutWRX2vvNVWXgyL6uNPiWHid1ILILFfbXnunAs_Ot7SNqE5JXlCvw"
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#ff6b6b] p-8 flex flex-col justify-between rounded-[2px]">
              <span className="font-['Inter'] text-[10px] uppercase tracking-[0.3em] text-[#6d0010] font-bold">
                Style Score
              </span>
              <div className="font-['Newsreader'] text-8xl text-[#6d0010] leading-none italic">
                14
              </div>
              <p className="font-['Inter'] text-[10px] uppercase tracking-widest text-[#6d0010]/80 font-bold">
                Percentile Rank: E-Tier
              </p>
            </div>
          </motion.div>
        </div>
      </main>

      <BottomNavBar />
    </div>
  );
}
