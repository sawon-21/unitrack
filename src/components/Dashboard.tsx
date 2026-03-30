import React, { useState, useEffect, useRef } from 'react';
import { Plus, Pin } from 'lucide-react';
import { PostCard } from './PostCard';
import { Post, User } from '../types';
import { Avatar } from './Avatar';
import { useScrollDirection } from '../hooks/useScrollDirection';
import { cn } from '../utils';
import { motion } from 'framer-motion';

interface DashboardProps {
  posts: Post[];
  users: Record<string, User>;
  currentUser?: User;
  onPostClick: (id: string) => void;
  onOpenSubmit: () => void;
  onLike: (id: string) => void;
  onDislike: (id: string) => void;
  onRepost: (id: string) => void;
  onShare: (id: string) => void;
  onRepostersClick: (usernames: string[]) => void;
  onTagClick?: (tag: string) => void;
}

export function Dashboard({ posts, users, currentUser, onPostClick, onOpenSubmit, onLike, onDislike, onRepost, onShare, onRepostersClick, onTagClick }: DashboardProps) {
  const [displayCount, setDisplayCount] = useState(5);
  const observerTarget = useRef<HTMLDivElement>(null);

  const scrollDirection = useScrollDirection();
  const pinnedPosts = posts.filter(p => p.isPinned);
  const regularPosts = posts.filter(p => !p.isPinned);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setDisplayCount(prev => Math.min(prev + 5, regularPosts.length));
        }
      },
      { threshold: 0.1 }
    );
    
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    
    return () => observer.disconnect();
  }, [regularPosts.length]);

  const uniquePosts = posts.filter(p => !p.originalPostId);
  const stats = {
    total: uniquePosts.length,
    resolved: uniquePosts.filter(p => p.status === 'Resolved').length,
    pending: uniquePosts.filter(p => p.status !== 'Resolved').length,
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="pb-20"
    >
      <div className="px-4 py-3 border-b border-slate-800">
        <div className="flex justify-between items-center bg-slate-900 rounded-2xl p-3">
          <div className="text-center flex-1 border-r border-slate-800">
            <div className="text-lg font-bold text-slate-100">{stats.total}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Total</div>
          </div>
          <div className="text-center flex-1 border-r border-slate-800">
            <div className="text-lg font-bold text-emerald-500">{stats.resolved}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Resolved</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-lg font-bold text-orange-500">{stats.pending}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Pending</div>
          </div>
        </div>
      </div>

      <>
        {pinnedPosts.length > 0 && (
            <div className="border-b border-slate-800 py-4 bg-sky-950/10">
              <h2 className="text-sm font-bold text-sky-400 mb-3 px-4 flex items-center gap-2 uppercase tracking-wider">
                <Pin className="w-4 h-4 fill-sky-400" /> Pinned Announcements
              </h2>
              <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {pinnedPosts.map(post => (
                  <div 
                    key={post.id} 
                    onClick={() => onPostClick(post.id)} 
                    className="min-w-[280px] max-w-[320px] snap-center bg-slate-900 border border-sky-500/30 rounded-2xl p-4 shrink-0 cursor-pointer hover:bg-slate-800 transition-colors shadow-lg shadow-sky-900/20"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar user={users[post.userId]} username={users[post.userId]?.username} className="w-6 h-6 text-[10px]" />
                      <span className="text-sm font-semibold text-slate-200 truncate">@{users[post.userId]?.username}</span>
                    </div>
                    <h3 className="font-bold text-slate-100 line-clamp-1">{post.title}</h3>
                    <p className="text-sm text-slate-400 line-clamp-2 mt-1">{post.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex flex-col">
            {regularPosts.slice(0, displayCount).map(post => (
              <PostCard 
                key={post.id} 
                post={post} 
                author={users[post.userId]} 
                currentUser={currentUser}
                onClick={() => onPostClick(post.id)} 
                onLike={() => onLike(post.id)}
                onDislike={() => onDislike(post.id)}
                onRepost={() => onRepost(post.id)}
                onShare={() => onShare(post.id)}
                onRepostersClick={() => post.repostedBy && onRepostersClick(post.repostedBy)}
                onTagClick={onTagClick}
              />
            ))}
            {posts.length === 0 && (
              <div className="text-center text-slate-500 py-10">
                No posts found.
              </div>
            )}
            {displayCount < regularPosts.length && (
              <div ref={observerTarget} className="py-8 flex justify-center">
                <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </>

      <button 
        onClick={onOpenSubmit}
        className={cn(
          "fixed bottom-20 right-6 w-14 h-14 bg-sky-500 hover:bg-sky-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-sky-500/30 transition-all duration-300 z-40",
          scrollDirection === 'down' ? "translate-y-24 opacity-0 pointer-events-none" : "translate-y-0 opacity-100 hover:scale-105 active:scale-95"
        )}
      >
        <Plus className="w-6 h-6" />
      </button>
    </motion.div>
  );
}
