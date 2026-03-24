import React from 'react';
import { Post, User } from '../types';
import { PostCard } from './PostCard';

interface AnalyticsDashboardProps {
  posts: Post[];
  users: Record<string, User>;
  currentUser?: User;
  onPostClick: (id: string) => void;
  onLike: (id: string) => void;
  onDislike: (id: string) => void;
  onRepost: (id: string) => void;
  onShare: (id: string) => void;
}

export function AnalyticsDashboard({ posts, users, currentUser, onPostClick, onLike, onDislike, onRepost, onShare }: AnalyticsDashboardProps) {
  // Filter out admin posts
  const userPosts = posts.filter(p => users[p.userId]?.role !== 'Admin');

  // Calculate top 20 posts based on score
  // Score = likes + dislikes + reposts * 2 + commentCount * 2 + views * 0.1
  const sortedPosts = [...userPosts].sort((a, b) => {
    const scoreA = (a.likes || 0) + (a.dislikes || 0) + ((a.reposts || 0) * 2) + ((a.commentCount || 0) * 2) + ((a.views || 0) * 0.1);
    const scoreB = (b.likes || 0) + (b.dislikes || 0) + ((b.reposts || 0) * 2) + ((b.commentCount || 0) * 2) + ((b.views || 0) * 0.1);
    return scoreB - scoreA;
  }).slice(0, 20);

  const totalViews = userPosts.reduce((acc, p) => acc + (p.views || 0), 0);
  const totalInteractions = userPosts.reduce((acc, p) => acc + (p.likes || 0) + (p.dislikes || 0) + (p.reposts || 0) + (p.commentCount || 0), 0);

  return (
    <div className="pb-20 animate-in fade-in duration-200">
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <h1 className="text-xl font-bold text-slate-100">Analytics Dashboard</h1>
      </header>
      
      <div className="p-4 grid grid-cols-2 gap-4 border-b border-slate-800">
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <div className="text-2xl font-bold text-indigo-400">{userPosts.length}</div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Total Posts</div>
        </div>
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <div className="text-2xl font-bold text-emerald-400">{totalViews}</div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Total Reach</div>
        </div>
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 col-span-2">
          <div className="text-2xl font-bold text-pink-400">{totalInteractions}</div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Total Interactions</div>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/50">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Top 20 Posts</h2>
      </div>

      <div className="flex flex-col">
        {sortedPosts.map((post, index) => (
          <div key={post.id} className="relative">
            <div className="absolute top-4 right-4 text-4xl font-black text-slate-800/50 z-0 pointer-events-none">
              #{index + 1}
            </div>
            <div className="relative z-10">
              <PostCard 
                post={post} 
                author={users[post.userId]} 
                currentUser={currentUser}
                onClick={() => onPostClick(post.id)} 
                onLike={() => onLike(post.id)}
                onDislike={() => onDislike(post.id)}
                onRepost={() => onRepost(post.id)}
                onShare={() => onShare(post.id)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
