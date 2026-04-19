import React from 'react';
import { cn } from '../utils';
import { useScrollDirection } from '../hooks/useScrollDirection';

interface HeaderProps {
  activeTab: 'all' | 'my' | 'track';
  onTabChange: (tab: 'all' | 'my' | 'track') => void;
}

export function Header({ activeTab, onTabChange }: HeaderProps) {
  const scrollDirection = useScrollDirection();

  const tabColors = {
    all: 'text-sky-400',
    track: 'text-purple-400',
    my: 'text-emerald-400'
  };

  const borderColors = {
    all: 'bg-sky-500',
    track: 'bg-purple-500',
    my: 'bg-emerald-500'
  };

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 flex flex-col transition-transform duration-300 drop-shadow-xl pointer-events-none pt-4 pb-2",
      scrollDirection === 'down' ? "-translate-y-[150%] opacity-0" : "translate-y-0 opacity-100"
    )}>
      <div className="flex justify-center w-full px-4 pointer-events-auto">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 p-1 rounded-full flex gap-1 shadow-2xl w-full max-w-sm">
          <button
            onClick={() => onTabChange('all')}
            className={cn(
              "flex-1 py-1.5 text-[10px] font-bold rounded-full transition-all uppercase tracking-widest",
              activeTab === 'all' ? "bg-white/10 text-sky-400 shadow-md scale-100" : "text-slate-400/70 hover:text-slate-200 hover:bg-white/5"
            )}
          >
            For you
          </button>
          <button
            onClick={() => onTabChange('track')}
            className={cn(
              "flex-1 py-1.5 text-[10px] font-bold rounded-full transition-all uppercase tracking-widest",
              activeTab === 'track' ? "bg-white/10 text-purple-400 shadow-md scale-100" : "text-slate-400/70 hover:text-slate-200 hover:bg-white/5"
            )}
          >
            Track
          </button>
          <button
            onClick={() => onTabChange('my')}
            className={cn(
              "flex-1 py-1.5 text-[10px] font-bold rounded-full transition-all uppercase tracking-widest",
              activeTab === 'my' ? "bg-white/10 text-emerald-400 shadow-md scale-100" : "text-slate-400/70 hover:text-slate-200 hover:bg-white/5"
            )}
          >
            Following
          </button>
        </div>
      </div>
    </header>
  );
}
