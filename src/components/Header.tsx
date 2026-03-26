import React from 'react';
import { cn } from '../utils';

interface HeaderProps {
  activeTab: 'all' | 'my';
  onTabChange: (tab: 'all' | 'my') => void;
}

export function Header({ activeTab, onTabChange }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-slate-800 flex flex-col">
      <div className="px-4 pt-2 pb-1 flex items-center justify-center">
        <h1 className="text-lg font-bold text-slate-100">UniTrack</h1>
      </div>
      <div className="flex w-full">
        <button
          onClick={() => onTabChange('all')}
          className={cn(
            "flex-1 pt-1 pb-2 text-sm font-bold hover:bg-slate-900 transition-colors relative",
            activeTab === 'all' ? "text-slate-100" : "text-slate-500"
          )}
        >
          For you
          {activeTab === 'all' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-indigo-500 rounded-full" />}
        </button>
        <button
          onClick={() => onTabChange('my')}
          className={cn(
            "flex-1 pt-1 pb-2 text-sm font-bold hover:bg-slate-900 transition-colors relative",
            activeTab === 'my' ? "text-slate-100" : "text-slate-500"
          )}
        >
          Following
          {activeTab === 'my' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-indigo-500 rounded-full" />}
        </button>
      </div>
    </header>
  );
}
