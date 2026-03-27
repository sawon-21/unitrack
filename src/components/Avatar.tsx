import React from 'react';
import { cn } from '../utils';
import { User } from '../types';

interface AvatarProps {
  user?: User;
  username?: string;
  className?: string;
}

export function Avatar({ user, username, className }: AvatarProps) {
  const displayUsername = (user?.username || username || 'anon').toLowerCase();

  if (user?.role === 'Admin' && user.profilePicUrl) {
    return (
      <img 
        src={user.profilePicUrl} 
        alt={displayUsername} 
        className={cn("rounded-full object-cover shrink-0", className)} 
        referrerPolicy="no-referrer" 
      />
    );
  }

  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#22c55e', 
    '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', 
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', 
    '#ec4899', '#f43f5e'
  ];
  
  const hash = displayUsername.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const color = colors[hash % colors.length];
  const initials = displayUsername.substring(0, 2).toUpperCase();

  return (
    <div 
      className={cn(`flex items-center justify-center rounded-full text-white font-bold shrink-0`, className)}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}
