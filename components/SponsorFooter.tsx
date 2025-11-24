import React from 'react';

export const SponsorFooter = () => (
  <div className="w-full bg-[#050505] border-t border-white/5 py-3 px-6 flex flex-col md:flex-row items-center justify-between gap-4 z-40 relative shrink-0">
    <div className="flex items-center gap-3">
        <div className="w-6 h-6 bg-white rounded-[2px] flex items-center justify-center">
             {/* Simplified Tenstorrent Logo Mark */}
             <div className="grid grid-cols-2 gap-0.5 rotate-45 scale-[0.6]">
                <div className="w-2 h-2 bg-black"></div>
                <div className="w-2 h-2 bg-black"></div>
                <div className="w-2 h-2 bg-black"></div>
                <div className="w-2 h-2 bg-black"></div>
            </div>
        </div>
        <div className="flex flex-col items-start">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold leading-none mb-0.5">AI Infrastructure Partner</div>
            <div className="text-xs font-bold text-white tracking-tight leading-none">TENSTORRENT</div>
        </div>
    </div>
    
    <div className="flex items-center gap-6 text-[10px] font-medium text-slate-500">
        <span className="hidden md:inline tracking-wide">ACCELERATING SOFTWARE 2.0</span>
        <a href="https://tenstorrent.com" target="_blank" rel="noreferrer" className="flex items-center gap-1 text-orange-500 hover:text-orange-400 transition-colors uppercase font-bold">
            Visit Website 
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="7" y1="17" x2="17" y2="7"></line>
              <polyline points="7 7 17 7 17 17"></polyline>
            </svg>
        </a>
    </div>
  </div>
);
