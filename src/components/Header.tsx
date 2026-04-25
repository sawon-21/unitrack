import React from 'react';
import { cn } from '../utils';

interface HeaderProps {
  activeTab: 'all' | 'my' | 'track';
  onTabChange: (tab: 'all' | 'my' | 'track') => void;
}

export function Header({ activeTab, onTabChange }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex flex-col drop-shadow-2xl pointer-events-none pt-4 pb-2">
      <div className="flex justify-center w-full px-4 pointer-events-auto">
        <div className="bg-[#0A0F1E] border border-slate-800/40 p-1.5 rounded-2xl flex gap-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] w-full max-w-sm">
          <button
            onClick={() => onTabChange('all')}
            className={cn(
              "flex-1 py-1.5 text-[10px] font-bold rounded-xl transition-all uppercase tracking-widest",
              activeTab === 'all' ? "bg-sky-500/10 text-sky-400 shadow-md border border-sky-500/20" : "text-slate-400/70 hover:text-slate-200 hover:bg-white/5 border border-transparent"
            )}
          >
            For you
          </button>
          <button
            onClick={() => onTabChange('track')}
            className={cn(
              "flex-1 py-1.5 text-[10px] font-bold rounded-xl transition-all uppercase tracking-widest",
              activeTab === 'track' ? "bg-purple-500/10 text-purple-400 shadow-md border border-purple-500/20" : "text-slate-400/70 hover:text-slate-200 hover:bg-white/5 border border-transparent"
            )}
          >
            Track
          </button>
          <button
            onClick={() => onTabChange('my')}
            className={cn(
              "flex-1 py-1.5 text-[10px] font-bold rounded-xl transition-all uppercase tracking-widest",
              activeTab === 'my' ? "bg-emerald-500/10 text-emerald-400 shadow-md border border-emerald-500/20" : "text-slate-400/70 hover:text-slate-200 hover:bg-white/5 border border-transparent"
            )}
          >
            Following
          </button>
        </div>
      </div>
    </header>
  );
}
