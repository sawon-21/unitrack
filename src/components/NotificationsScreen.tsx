import React from 'react';
import { Bell, Heart, MessageSquare, Pin, TrendingUp, Megaphone, CheckCircle2, Activity } from 'lucide-react';
import { AppNotification, User } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../utils';
import { useScrollDirection } from '../hooks/useScrollDirection';

interface NotificationsScreenProps {
  notifications: AppNotification[];
  users: Record<string, User>;
  onNotificationClick: (id: string, postId?: string, commentId?: string) => void;
  onMarkAllRead: () => void;
}

export function NotificationsScreen({ notifications, users, onNotificationClick, onMarkAllRead }: NotificationsScreenProps) {
  const scrollDirection = useScrollDirection();

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'reaction': return <Heart className="w-6 h-6 text-pink-500 fill-pink-500" />;
      case 'comment': return <MessageSquare className="w-6 h-6 text-sky-400 fill-sky-400" />;
      case 'pin': return <Pin className="w-6 h-6 text-emerald-500 fill-emerald-500" />;
      case 'announcement': return <Megaphone className="w-6 h-6 text-yellow-500 fill-yellow-500" />;
      case 'trending': return <TrendingUp className="w-6 h-6 text-blue-400" />;
      case 'status_update': return <Activity className="w-6 h-6 text-purple-400" />;
      default: return <Bell className="w-6 h-6 text-slate-400" />;
    }
  };

  return (
    <div className="pb-20 animate-in fade-in duration-200">
      <header className={cn(
        "sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex justify-between items-center transition-transform duration-300",
        scrollDirection === 'down' ? "-translate-y-full" : "translate-y-0"
      )}>
        <h1 className="text-xl font-bold text-slate-100">Notifications</h1>
        {notifications.some(n => !n.read) && (
          <button 
            onClick={onMarkAllRead}
            className="text-sky-400 hover:text-sky-300 text-sm font-semibold flex items-center gap-1 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </header>

      <div className="flex flex-col">
        {notifications.length === 0 ? (
          <div className="text-center text-slate-500 py-20 px-4">
            <Bell className="w-12 h-12 mx-auto mb-4 text-slate-700" />
            <h2 className="text-xl font-bold text-slate-300 mb-2">Nothing to see here — yet</h2>
            <p>When someone interacts with your posts, you'll find it here.</p>
          </div>
        ) : (
          notifications.map(notification => (
            <div 
              key={notification.id} 
              onClick={() => onNotificationClick(notification.id, notification.postId, notification.commentId)}
              className={`border-b border-slate-800 p-4 hover:bg-slate-900/50 cursor-pointer transition-colors flex gap-3 ${!notification.read ? 'bg-sky-900/20 border-l-4 border-l-sky-500 shadow-[inset_4px_0_10px_rgba(14,165,233,0.2)]' : 'border-l-4 border-l-transparent'}`}
            >
              <div className="shrink-0 pt-1">
                {getIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-100 text-sm leading-snug">
                  {notification.message}
                </p>
                <p className="text-slate-500 text-xs mt-1">
                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
