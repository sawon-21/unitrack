import React from 'react';
import { User } from '../types';
import { Avatar } from './Avatar';
import { Settings, LogOut, BadgeCheck } from 'lucide-react';
import { cn } from '../utils';
import { useScrollDirection } from '../hooks/useScrollDirection';

interface ProfileScreenProps {
  currentUser: User;
  users: Record<string, User>;
  onLogout?: () => void;
  onGenerateDemoPost?: () => void;
}

export function ProfileScreen({ currentUser, users, onLogout, onGenerateDemoPost }: ProfileScreenProps) {
  const scrollDirection = useScrollDirection();

  return (
    <div className="pb-20 animate-in fade-in duration-200">
      <header className={cn(
        "sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex justify-between items-center transition-transform duration-300",
        scrollDirection === 'down' ? "-translate-y-full" : "translate-y-0"
      )}>
        <h1 className="text-xl font-bold text-slate-100">Profile & Settings</h1>
      </header>

      <div className="p-6 border-b border-slate-800 flex flex-col items-center">
        <Avatar user={currentUser} username={currentUser.username} className="w-24 h-24 text-3xl mb-4" />
        
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-2xl font-bold text-slate-100">@{currentUser.username}</h2>
          {currentUser.role === 'Admin' && (
            <BadgeCheck className="w-6 h-6 text-white fill-[#1877F2]" />
          )}
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-slate-900 rounded-full text-xs font-bold text-slate-300 border border-slate-800">
            {currentUser.role}
          </span>
          {currentUser.batch && (
            <span className="px-3 py-1 bg-slate-900 rounded-full text-xs font-bold text-slate-300 border border-slate-800">
              {currentUser.batch}
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Settings</h3>
        <div className="space-y-2">
          <button className="w-full flex items-center justify-between p-4 bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors border border-slate-800 text-slate-300">
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-slate-400" />
              <span className="font-medium">Account Preferences</span>
            </div>
          </button>
          {currentUser.role === 'Admin' && onGenerateDemoPost && (
            <button 
              onClick={onGenerateDemoPost}
              className="w-full flex items-center justify-between p-4 bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors border border-slate-800 text-sky-400"
            >
              <div className="flex items-center gap-3">
                <BadgeCheck className="w-5 h-5" />
                <span className="font-medium">Generate Demo Post</span>
              </div>
            </button>
          )}
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-between p-4 bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors border border-slate-800 text-red-400"
          >
            <div className="flex items-center gap-3">
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Log Out</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
