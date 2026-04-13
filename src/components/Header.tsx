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
      "sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-slate-800 flex flex-col transition-transform duration-300",
      scrollDirection === 'down' ? "-translate-y-full" : "translate-y-0"
    )}>
      <div className="px-4 py-2 flex items-center justify-center">
        <h1 className="text-sm font-black tracking-widest text-slate-400 uppercase font-display">UniTrack</h1>
      </div>
      <div className="flex w-full">
        <button
          onClick={() => onTabChange('all')}
          className={cn(
            "flex-1 pt-1 pb-2 text-xs font-bold hover:bg-slate-900 transition-colors relative uppercase tracking-wider",
            activeTab === 'all' ? tabColors.all : "text-slate-500"
          )}
        >
          For you
          {activeTab === 'all' && <div className={cn("absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 rounded-full", borderColors.all)} />}
        </button>
        <button
          onClick={() => onTabChange('track')}
          className={cn(
            "flex-1 pt-1 pb-2 text-xs font-bold hover:bg-slate-900 transition-colors relative uppercase tracking-wider",
            activeTab === 'track' ? tabColors.track : "text-slate-500"
          )}
        >
          Track
          {activeTab === 'track' && <div className={cn("absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 rounded-full", borderColors.track)} />}
        </button>
        <button
          onClick={() => onTabChange('my')}
          className={cn(
            "flex-1 pt-1 pb-2 text-xs font-bold hover:bg-slate-900 transition-colors relative uppercase tracking-wider",
            activeTab === 'my' ? tabColors.my : "text-slate-500"
          )}
        >
          Following
          {activeTab === 'my' && <div className={cn("absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 rounded-full", borderColors.my)} />}
        </button>
      </div>
    </header>
  );
}
