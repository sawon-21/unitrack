import React, { useState } from 'react';
import { User } from '../types';
import { Avatar } from './Avatar';
import { Settings, LogOut, Edit3, BadgeCheck } from 'lucide-react';

interface ProfileScreenProps {
  currentUser: User;
  onUpdateProfile: (user: User) => void;
  onLogout?: () => void;
}

export function ProfileScreen({ currentUser, onUpdateProfile, onLogout }: ProfileScreenProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(currentUser.username);

  const handleSave = () => {
    onUpdateProfile({ ...currentUser, username });
    setIsEditing(false);
  };

  return (
    <div className="pb-20 animate-in fade-in duration-200">
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold text-slate-100">Profile & Settings</h1>
      </header>

      <div className="p-6 border-b border-slate-800 flex flex-col items-center">
        <Avatar user={currentUser} username={currentUser.username} className="w-24 h-24 text-3xl mb-4" />
        
        {isEditing ? (
          <div className="w-full max-w-xs space-y-4">
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1 block">Username</label>
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button 
                onClick={() => setIsEditing(false)}
                className="flex-1 py-2 rounded-lg font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="flex-1 py-2 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-2xl font-bold text-slate-100">@{currentUser.username}</h2>
              {currentUser.role === 'Admin' && (
                <BadgeCheck className="w-6 h-6 text-blue-500 fill-blue-500" />
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
            <button 
              onClick={() => setIsEditing(true)}
              className="mt-6 flex items-center gap-2 px-6 py-2 rounded-full font-bold text-slate-100 bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700"
            >
              <Edit3 className="w-4 h-4" /> Edit Profile
            </button>
          </>
        )}
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
