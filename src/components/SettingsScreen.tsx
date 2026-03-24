import React from 'react';
import { Settings, User, Bell, Shield, LogOut } from 'lucide-react';

export function SettingsScreen() {
  return (
    <div className="pb-20 animate-in fade-in duration-200">
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <h1 className="text-xl font-bold text-slate-100">Settings</h1>
      </header>

      <div className="flex flex-col">
        <div className="p-4 border-b border-slate-800 hover:bg-slate-900/50 cursor-pointer transition-colors flex items-center gap-4">
          <User className="w-6 h-6 text-slate-400" />
          <div className="flex-1">
            <h2 className="text-slate-100 font-bold">Your Account</h2>
            <p className="text-slate-500 text-sm">See information about your account, download an archive of your data, or learn about your account deactivation options</p>
          </div>
        </div>

        <div className="p-4 border-b border-slate-800 hover:bg-slate-900/50 cursor-pointer transition-colors flex items-center gap-4">
          <Shield className="w-6 h-6 text-slate-400" />
          <div className="flex-1">
            <h2 className="text-slate-100 font-bold">Privacy and safety</h2>
            <p className="text-slate-500 text-sm">Manage what information you see and share on UniSolve.</p>
          </div>
        </div>

        <div className="p-4 border-b border-slate-800 hover:bg-slate-900/50 cursor-pointer transition-colors flex items-center gap-4">
          <Bell className="w-6 h-6 text-slate-400" />
          <div className="flex-1">
            <h2 className="text-slate-100 font-bold">Notifications</h2>
            <p className="text-slate-500 text-sm">Select the kinds of notifications you get about your activities, interests, and recommendations.</p>
          </div>
        </div>

        <div className="p-4 border-b border-slate-800 hover:bg-slate-900/50 cursor-pointer transition-colors flex items-center gap-4 text-red-500">
          <LogOut className="w-6 h-6" />
          <div className="flex-1">
            <h2 className="font-bold">Log out</h2>
          </div>
        </div>
      </div>
    </div>
  );
}
