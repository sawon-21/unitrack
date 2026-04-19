import React from 'react';
import { X } from 'lucide-react';
import { User } from '../types';
import { Avatar } from './Avatar';

interface UserListModalProps {
  title: string;
  users: User[];
  onClose: () => void;
}

export const UserListModal: React.FC<UserListModalProps> = ({ title, users, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-800 shrink-0">
          <h2 className="text-lg font-bold text-slate-100">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {users.length === 0 ? (
            <p className="text-slate-500 text-center py-4">No users found.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {users.map(user => (
                <div key={user.id} className="flex items-center gap-3 p-2 hover:bg-slate-800/50 rounded-lg transition-colors">
                  <Avatar user={user} username={user.username} className="w-10 h-10" />
                  <div>
                    <p className="font-bold text-slate-200">@{user.username}</p>
                    {(user.role === 'Administrator' || user.role === 'Faculty') && (
                      <span className="text-xs font-medium text-sky-400">{user.role}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
