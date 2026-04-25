import React from 'react';
import { Post, User } from '../types';
import { PostCard } from './PostCard';
import { cn } from '../utils';
import { useScrollDirection } from '../hooks/useScrollDirection';

interface AnalyticsDashboardProps {
  posts: Post[];
  users: Record<string, User>;
  currentUser?: User;
  onPostClick: (id: string) => void;
  onLike: (id: string) => void;
  onDislike: (id: string) => void;
  onRepost: (id: string) => void;
  onShare: (id: string) => void;
  onRepostersClick: (usernames: string[]) => void;
  onTagClick?: (tag: string) => void;
  onDeletePost?: (id: string) => void;
}

export function AnalyticsDashboard({ posts, users, currentUser, onPostClick, onLike, onDislike, onRepost, onShare, onRepostersClick, onTagClick, onDeletePost }: AnalyticsDashboardProps) {
  const scrollDirection = useScrollDirection();
  const [sortBy, setSortBy] = React.useState<'engagement' | 'newest' | 'oldest' | 'likes' | 'comments' | 'views'>('engagement');

  // Filter out admin posts
  const userPosts = posts.filter(p => users[p.userId]?.role !== 'Administrator');

  const sortedPosts = [...userPosts].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortBy === 'oldest') {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else if (sortBy === 'likes') {
      return (b.likes || 0) - (a.likes || 0);
    } else if (sortBy === 'comments') {
      return (b.commentCount || 0) - (a.commentCount || 0);
    } else if (sortBy === 'views') {
      return (b.views || 0) - (a.views || 0);
    }
    // Default: engagement
    const repostsDiff = (b.reposts || 0) - (a.reposts || 0);
    if (repostsDiff !== 0) return repostsDiff;
    
    const viewsDiff = (b.views || 0) - (a.views || 0);
    if (viewsDiff !== 0) return viewsDiff;
    
    const reactA = (a.likes || 0) + (a.dislikes || 0) + (a.commentCount || 0);
    const reactB = (b.likes || 0) + (b.dislikes || 0) + (b.commentCount || 0);
    return reactB - reactA;
  }).slice(0, 20);

  const totalViews = userPosts.reduce((acc, p) => acc + (p.views || 0), 0);
  const totalReach = userPosts.reduce((acc, p) => acc + (p.viewedBy?.length || 0), 0);
  const totalInteractions = userPosts.reduce((acc, p) => acc + (p.likes || 0) + (p.dislikes || 0) + (p.reposts || 0) + (p.commentCount || 0), 0);

  return (
    <div className="pb-20 animate-in fade-in duration-200">
      <header className={cn(
        "fixed top-0 left-0 right-0 z-50 flex justify-center items-center px-4 pt-4 pb-2 drop-shadow-xl transition-transform duration-300 pointer-events-none"
      )}>
        <h1 className="font-bold text-slate-100 bg-slate-900/60 backdrop-blur-xl border border-white/5 px-6 py-2 rounded-full shadow-2xl pointer-events-auto uppercase tracking-widest text-[10px]">Analytics</h1>
      </header>
      
      <div className="p-4 grid grid-cols-2 gap-4 border-b border-slate-800 pt-20">
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <div className="text-2xl font-bold text-sky-400">{userPosts.length}</div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Total Posts</div>
        </div>
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <div className="text-2xl font-bold text-emerald-400">{totalViews}</div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Total Views</div>
        </div>
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <div className="text-2xl font-bold text-cyan-400">{totalReach}</div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Total Reach</div>
        </div>
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <div className="text-2xl font-bold text-pink-400">{totalInteractions}</div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Total Interactions</div>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center z-20 sticky top-0 backdrop-blur-md">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Top 20 Posts</h2>
        <div className="flex items-center gap-2">
           <select 
             value={sortBy}
             onChange={(e) => setSortBy(e.target.value as any)}
             className="bg-slate-900/80 border border-slate-700/50 text-slate-300 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded cursor-pointer focus:outline-none focus:border-sky-500 hover:bg-slate-800 transition-colors shadow-lg"
           >
             <option value="engagement">Best Engagement</option>
             <option value="newest">Newest First</option>
             <option value="oldest">Oldest First</option>
             <option value="likes">Most Liked</option>
             <option value="comments">Most Discussed</option>
             <option value="views">Most Viewed</option>
           </select>
        </div>
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
                onRepostersClick={post.repostedBy ? () => onRepostersClick(post.repostedBy!) : undefined}
                onTagClick={onTagClick}
                onDelete={currentUser?.role === 'Administrator' && onDeletePost ? () => { if(confirm("Delete post?")) onDeletePost(post.id); } : undefined}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
