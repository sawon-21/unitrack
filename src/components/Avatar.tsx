import React from 'react';
import { cn } from '../utils';

interface AvatarProps {
  username: string;
  className?: string;
}

export function Avatar({ username, className }: AvatarProps) {
  const colors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500', 
    'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-blue-500', 
    'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 
    'bg-pink-500', 'bg-rose-500'
  ];
  
  const hash = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const color = colors[hash % colors.length];
  const initials = username.substring(0, 2).toUpperCase();

  return (
    <div className={cn(`flex items-center justify-center rounded-full text-white font-bold shrink-0`, color, className)}>
      {initials}
    </div>
  );
}
