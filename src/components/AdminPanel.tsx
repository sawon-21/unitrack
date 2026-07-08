import React from 'react';
import { X, BadgeCheck } from 'lucide-react';
import { User, Role } from '../types';
import { Avatar } from './Avatar';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';

interface AdminPanelProps {
  users: User[];
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ users, onClose }) => {
  const handleUpdateRole = async (userId: string, newRole: Role) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        appliedForRole: null // clear any pending application
      });
      toast.success(`Role updated successfully`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update role');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-800 shrink-0">
          <h2 className="text-lg font-bold text-slate-100">Manage Users & Roles</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {users.length === 0 ? (
            <p className="text-slate-500 text-center py-4">No users found.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {users.map((user, index) => (
                <div key={`${user.id}-${index}`} className="flex items-center justify-between gap-3 p-3 bg-slate-950/50 border border-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar user={user} username={user.username} className="w-10 h-10" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-slate-200">@{user.username}</p>
                        {user.role === 'administration' && (
                          <BadgeCheck className="w-4 h-4 fill-[#1877F2] text-white stroke-[1.5px] shrink-0" />
                        )}
                        {user.role === 'teacher' && (
                          <BadgeCheck className="w-4 h-4 fill-green-500 text-white stroke-[1.5px] shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-medium text-slate-500">Current Role: <span className="text-slate-400">{user.role}</span></span>
                      </div>
                      {user.appliedForRole && (
                        <div className="text-xs text-sky-400 font-medium mt-1 drop-shadow flex items-center gap-2">
                           Applied for: {user.appliedForRole}
                           <button onClick={() => handleUpdateRole(user.id, user.appliedForRole!)} className="px-2 py-0.5 bg-sky-500 hover:bg-sky-600 text-white rounded text-[10px]">Approve</button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={user.role}
                      onChange={(e) => handleUpdateRole(user.id, e.target.value as Role)}
                      className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-sky-500 focus:border-sky-500 block p-2"
                    >
                      <option value="user">User</option>
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="administration">Admin</option>
                    </select>
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
