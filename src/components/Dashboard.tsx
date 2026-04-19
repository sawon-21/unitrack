import React, { useState, useEffect, useRef } from 'react';
import { Plus, Pin } from 'lucide-react';
import { PostCard } from './PostCard';
import { SkeletonPost } from './SkeletonPost';
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
  onStatusClick?: (status: string) => void;
  onCategoryClick?: (category: string) => void;
  onDeletePost?: (id: string) => void;
  isLoading?: boolean;
  restoreScrollPosition?: () => void;
}

export function Dashboard({ 
  posts, 
  users, 
  currentUser, 
  onPostClick, 
  onOpenSubmit, 
  onLike, 
  onDislike, 
  onRepost, 
  onShare, 
  onRepostersClick, 
  onTagClick,
  onStatusClick,
  onCategoryClick,
  onDeletePost,
  isLoading,
  restoreScrollPosition
}: DashboardProps) {
  const [displayCount, setDisplayCount] = useState(50);
  const observerTarget = useRef<HTMLDivElement>(null);

  const scrollDirection = useScrollDirection();
  const { pinnedPosts, regularPosts, uniquePosts, stats } = React.useMemo(() => {
    const pinned = posts.filter(p => p.isPinned);
    // Pinned posts should also appear in the regular feed as requested
    const regular = posts; 
    const unique = posts.filter(p => !p.originalPostId);
    
    return {
      pinnedPosts: pinned,
      regularPosts: regular,
      uniquePosts: unique,
      stats: {
        total: unique.length,
        resolved: unique.filter(p => p.status === 'Resolved').length,
        pending: unique.filter(p => p.status !== 'Resolved').length,
      }
    };
  }, [posts]);

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

  const pinnedScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pinnedPosts.length <= 1) return;
    
    const scrollContainer = pinnedScrollRef.current;
    if (!scrollContainer) return;

    const scrollInterval = setInterval(() => {
      const { scrollLeft, clientWidth, scrollWidth } = scrollContainer;
      
      // If we're near the end of the first set of items
      if (scrollLeft + clientWidth >= scrollWidth / 2) {
        // Jump back to the start without animation to create seamless loop
        scrollContainer.scrollLeft = 0;
      }
      
      scrollContainer.scrollBy({ left: 200, behavior: 'smooth' });
    }, 4000);

    return () => clearInterval(scrollInterval);
  }, [pinnedPosts.length]);

  // Duplicate posts for infinite scroll effect
  const infinitePinnedPosts = [...pinnedPosts, ...pinnedPosts];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      onAnimationComplete={() => {
        if (restoreScrollPosition) restoreScrollPosition();
      }}
      className="pb-20"
    >
      <div className="px-4 py-3 pb-0">
        <div className="bg-[#0A0F1E] border border-slate-800/40 rounded-2xl py-3 px-4 flex justify-between items-center shadow-2xl">
          <div 
            className="flex-1 text-center cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => onStatusClick && onStatusClick('All')}
          >
            <div className="text-base font-black text-white mb-0.5 tracking-tight">{stats.total}</div>
            <div className="text-[9px] text-slate-500 uppercase font-extrabold tracking-[0.15em]">Total</div>
          </div>
          
          <div className="w-[1px] h-8 bg-slate-800/30" />
          
          <div 
            className="flex-1 text-center cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => onStatusClick && onStatusClick('Resolved')}
          >
            <div className="text-base font-black text-[#10B981] mb-0.5 tracking-tight">{stats.resolved}</div>
            <div className="text-[9px] text-slate-500 uppercase font-extrabold tracking-[0.15em]">Resolved</div>
          </div>
          
          <div className="w-[1px] h-8 bg-slate-800/30" />
          
          <div 
            className="flex-1 text-center cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => onStatusClick && onStatusClick('Pending')}
          >
            <div className="text-base font-black text-[#F97316] mb-0.5 tracking-tight">{stats.pending}</div>
            <div className="text-[9px] text-slate-500 uppercase font-extrabold tracking-[0.15em]">Pending</div>
          </div>
        </div>
      </div>

      <>
        {pinnedPosts.length > 0 && (
            <div className="border-b border-slate-800 py-4 bg-sky-950/10">
              <h2 className="text-sm font-bold text-sky-400 mb-3 px-4 flex items-center gap-2 uppercase tracking-wider">
                <Pin className="w-4 h-4 fill-sky-400" /> Pinned
              </h2>
              <div 
                ref={pinnedScrollRef}
                className="flex gap-4 overflow-x-auto snap-x snap-mandatory px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth"
              >
                {infinitePinnedPosts.map((post, idx) => (
                  <div 
                    key={`${post.id}-${idx}`} 
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
            {isLoading && posts.length > 0 && (
              <div className="flex justify-center py-2">
                <div className="text-[10px] text-sky-500/50 animate-pulse uppercase tracking-widest font-black">Updating Feed...</div>
              </div>
            )}
            {isLoading && posts.length === 0 ? (
              <>
                <SkeletonPost />
                <SkeletonPost />
                <SkeletonPost />
              </>
            ) : (
              <>
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
                    onStatusClick={onStatusClick}
                    onCategoryClick={onCategoryClick}
                    onDelete={currentUser?.role === 'Administrator' && onDeletePost ? () => { if(confirm("Delete post?")) onDeletePost(post.id); } : undefined}
                  />
                ))}
                {posts.length === 0 && !isLoading && (
                  <div className="text-center text-slate-500 py-10">
                    No posts found.
                  </div>
                )}
              </>
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
