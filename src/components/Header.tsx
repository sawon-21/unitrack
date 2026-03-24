import React from 'react';
import { Settings } from 'lucide-react';
import { cn } from '../utils';
import { currentUser } from '../data';
import { Avatar } from './Avatar';

interface HeaderProps {
  activeTab: 'all' | 'my';
  onTabChange: (tab: 'all' | 'my') => void;
}

export function Header({ activeTab, onTabChange }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-slate-800 flex flex-col">
      <div className="px-4 py-3 flex items-center justify-between">
        <Avatar username={currentUser.username} className="w-8 h-8 text-xs" />
        <h1 className="text-xl font-bold text-slate-100">Home</h1>
        <button className="p-2 hover:bg-slate-900 rounded-full transition-colors text-slate-300">
          <Settings className="w-5 h-5" />
        </button>
      </div>
      <div className="flex w-full">
        <button
          onClick={() => onTabChange('all')}
          className={cn(
            "flex-1 py-3 text-sm font-bold hover:bg-slate-900 transition-colors relative",
            activeTab === 'all' ? "text-slate-100" : "text-slate-500"
          )}
        >
          For you
          {activeTab === 'all' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-indigo-500 rounded-full" />}
        </button>
        <button
          onClick={() => onTabChange('my')}
          className={cn(
            "flex-1 py-3 text-sm font-bold hover:bg-slate-900 transition-colors relative",
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
