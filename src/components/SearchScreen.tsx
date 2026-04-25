import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ArrowLeft, BadgeCheck, Activity, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { PostCard } from './PostCard';
import { Post, User } from '../types';
import { Avatar } from './Avatar';
import Fuse from 'fuse.js';
import { cn } from '../utils';
import { useScrollDirection } from '../hooks/useScrollDirection';
import { motion } from 'framer-motion';

interface SearchScreenProps {
  posts: Post[];
  users: Record<string, User>;
  currentUser?: User;
  initialQuery?: string;
  onPostClick: (id: string) => void;
  onLike: (id: string) => void;
  onDislike: (id: string) => void;
  onRepost: (id: string) => void;
  onShare: (id: string) => void;
  onRepostersClick: (usernames: string[]) => void;
  onTagClick?: (tag: string) => void;
  onStatusClick?: (status: string) => void;
  onCategoryClick?: (category: string) => void;
  onDeletePost?: (id: string) => void;
  restoreScrollPosition?: () => void;
}

export function SearchScreen({ 
  posts, 
  users, 
  currentUser, 
  initialQuery, 
  onPostClick, 
  onLike, 
  onDislike, 
  onRepost, 
  onShare, 
  onRepostersClick, 
  onTagClick,
  onStatusClick,
  onCategoryClick,
  onDeletePost,
  restoreScrollPosition
}: SearchScreenProps) {
  const scrollDirection = useScrollDirection();
  const [searchQuery, setSearchQuery] = useState(initialQuery || '');
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery || '');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pointerDownPos = useRef<{x: number, y: number} | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent, id: string) => {
    if (!pointerDownPos.current) return;
    const dx = Math.abs(e.clientX - pointerDownPos.current.x);
    const dy = Math.abs(e.clientY - pointerDownPos.current.y);
    if (dx < 10 && dy < 10) {
      onPostClick(id);
    }
    pointerDownPos.current = null;
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      if (searchQuery.includes('@')) {
        setShowUserDropdown(true);
      } else {
        setShowUserDropdown(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const atIndex = searchQuery.lastIndexOf('@');
  const userSearchPart = atIndex !== -1 ? searchQuery.slice(atIndex + 1).toLowerCase() : '';
  
  const userList = useMemo(() => Object.values(users), [users]);
  
  const userFuse = useMemo(() => new Fuse(userList, {
    keys: ['username'],
    threshold: 0.3,
  }), [userList]);

  const suggestedUsers = atIndex !== -1 && userSearchPart.length > 0
    ? userFuse.search(userSearchPart).map(result => result.item)
    : atIndex !== -1 ? userList.slice(0, 5) : [];

  const isUserSearch = debouncedQuery.startsWith('@');
  const isTagSearch = debouncedQuery.startsWith('#');
  const isStatusSearch = debouncedQuery.startsWith('status:');
  const isCategorySearch = debouncedQuery.startsWith('category:');

  const userQuery = isUserSearch ? debouncedQuery.slice(1).toLowerCase().trim() : '';
  const tagQuery = isTagSearch ? debouncedQuery.slice(1).toLowerCase().trim() : '';
  const statusQuery = isStatusSearch ? debouncedQuery.slice(7).toLowerCase().trim() : '';
  const categoryQuery = isCategorySearch ? debouncedQuery.slice(9).toLowerCase().trim() : '';

  const postsWithAuthor = useMemo(() => posts.map(post => ({
    ...post,
    authorUsername: post.isAnonymous ? `anon_${post.id.substring(0, 6)}` : (users[post.userId]?.username || ''),
  })), [posts, users]);

  const postFuse = useMemo(() => new Fuse(postsWithAuthor, {
    keys: [
      { name: 'title', weight: 3 },
      { name: 'category', weight: 2 },
      { name: 'description', weight: 1 },
      { name: 'authorUsername', weight: 1.5 },
      { name: 'tags', weight: 2.5 },
    ],
    threshold: 0.4,
    includeScore: true,
  }), [postsWithAuthor]);

  const filteredPosts = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    
    if (isUserSearch) {
      return postsWithAuthor.filter(post => post.authorUsername.toLowerCase().includes(userQuery));
    }

    if (isTagSearch && tagQuery.length > 0) {
      return postsWithAuthor.filter(post => post.tags?.some(tag => tag.toLowerCase().includes(tagQuery)));
    } else if (isTagSearch) {
      return [];
    }

    if (isStatusSearch) {
      if (statusQuery === 'pending') {
        return postsWithAuthor.filter(post => post.status.toLowerCase() === 'new');
      }
      return postsWithAuthor.filter(post => post.status.toLowerCase() === statusQuery);
    }

    if (isCategorySearch) {
      return postsWithAuthor.filter(post => post.category.toLowerCase() === categoryQuery);
    }

    const results = postFuse.search(debouncedQuery.trim());
    
    // Boost score based on engagement
    const boostedResults = results.map(result => {
      const post = result.item;
      // Engagement score calculation
      const engagementScore = (post.likes || 0) * 3 + (post.reposts || 0) * 5 + (post.commentCount || 0) * 4 + Math.floor((post.views || 0) / 5);
      // Fuse score is 0 (perfect match) to 1 (no match). We invert it for our logic.
      const baseScore = (1 - (result.score || 0)) * 100;
      // Combine base score with engagement score
      const finalScore = baseScore + Math.min(engagementScore, 80);
      return { post, score: finalScore };
    });

    return boostedResults
      .sort((a, b) => b.score - a.score)
      .map(item => item.post);
  }, [debouncedQuery, isUserSearch, userQuery, postFuse, postsWithAuthor, isTagSearch, tagQuery]);

  const handleUserSelect = (username: string) => {
    const beforeAt = searchQuery.slice(0, atIndex);
    setSearchQuery(`${beforeAt}@${username}`);
    setShowUserDropdown(false);
    inputRef.current?.focus();
  };

  // Hide suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const trackPosts = useMemo(() => {
    if (!currentUser) return [];
    return [...posts]
      .filter(p => (
        p.userId === currentUser.id || 
        p.viewedBy?.includes(currentUser.id) || 
        p.likedBy?.includes(currentUser.id) || 
        p.repostedBy?.includes(currentUser.id)
      ))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [posts, currentUser]);

  const statusColors: Record<string, string> = {
    'New': 'bg-teal-500',
    'Acknowledged': 'bg-yellow-500',
    'Investigating': 'bg-orange-500',
    'Dev In-Progress': 'bg-purple-500',
    'Resolved': 'bg-emerald-500',
    'Reopened': 'bg-blue-500',
  };

  const statusBgColors: Record<string, string> = {
    'New': 'bg-teal-500/10 border-teal-500/30',
    'Acknowledged': 'bg-yellow-500/10 border-yellow-500/30',
    'Investigating': 'bg-orange-500/10 border-orange-500/30',
    'Dev In-Progress': 'bg-purple-500/10 border-purple-500/30',
    'Resolved': 'bg-emerald-500/10 border-emerald-500/30',
    'Reopened': 'bg-blue-500/10 border-blue-500/30',
  };

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
      <div className={cn(
        "fixed top-0 left-0 right-0 z-50 px-4 pt-4 pb-2 transition-transform duration-300 pointer-events-none mt-0"
      )}>
        <div className="relative pointer-events-auto drop-shadow-xl" ref={containerRef}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Search issues or @username..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-full py-2.5 pl-12 pr-12 text-slate-100 placeholder-slate-400/70 focus:outline-none focus:ring-1 focus:ring-sky-500/50 transition-all shadow-2xl"
          />
          
          {searchQuery && (
            <button 
              onClick={() => {
                setSearchQuery('');
                inputRef.current?.focus();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors pointer-events-auto"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          
          {showUserDropdown && suggestedUsers.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-30 max-h-60 overflow-y-auto">
              {suggestedUsers.map(user => (
                <div 
                  key={user.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleUserSelect(user.username);
                  }}
                  className="flex items-center gap-3 p-3 hover:bg-slate-800 cursor-pointer transition-colors border-b border-slate-800/50 last:border-0"
                >
                  <Avatar user={user} username={user.username} className="w-8 h-8 text-xs" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-200">@{user.username}</span>
                    {(user.role === 'Administrator' || user.role === 'Faculty') && (
                      <BadgeCheck className="w-4 h-4 fill-[#1877F2] text-white stroke-[1.5px]" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col pt-16">
        {!searchQuery.trim() ? (
          <div className="py-6 px-4">
            <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-sky-500" /> Track Status
            </h2>
            <div className="space-y-3">
              {trackPosts.map((post) => (
                <div 
                  key={post.id}
                  onPointerDown={handlePointerDown}
                  onPointerUp={(e) => handlePointerUp(e, post.id)}
                  className={cn(
                    "flex items-start gap-4 p-4 rounded-xl cursor-pointer hover:opacity-80 transition-opacity group border",
                    statusBgColors[post.status] || "bg-slate-900/50 border-slate-800"
                  )}
                >
                  <div className={cn("w-1.5 rounded-full shrink-0 self-stretch min-h-[48px]", statusColors[post.status])} />
                  <div className="flex-1 min-w-0 py-0.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{post.status}</span>
                      <span className="text-[10px] text-slate-600">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                    </div>
                    <h3 className="font-bold text-slate-200 truncate group-hover:text-sky-400 transition-colors">{post.title}</h3>
                    {post.statusMessage && (
                      <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                        <span className="font-bold text-sky-400 mr-1">Update:</span>
                        {post.statusMessage}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500 font-medium">
                      <span className="flex items-center gap-1">#{post.category}</span>
                      <span className="flex items-center gap-1">{post.commentCount} comments</span>
                    </div>
                  </div>
                </div>
              ))}
              {trackPosts.length === 0 && (
                <p className="text-slate-500 text-center py-8">No tracing status available yet.</p>
              )}
            </div>
          </div>
        ) : filteredPosts.length > 0 ? (
          filteredPosts.map(post => (
            <PostCard 
              key={post.id} 
              post={post} 
              author={users[post.userId]} 
              currentUser={currentUser}
              customBgClass={searchQuery.toLowerCase().startsWith('status:') ? statusBgColors[post.status] : undefined}
              onClick={() => onPostClick(post.id)} 
              onLike={() => onLike(post.id)}
              onDislike={() => onDislike(post.id)}
              onRepost={() => onRepost(post.id)}
              onShare={() => onShare(post.id)}
              onRepostersClick={post.repostedBy ? () => onRepostersClick(post.repostedBy!) : undefined}
              onTagClick={onTagClick}
              onStatusClick={onStatusClick}
              onCategoryClick={onCategoryClick}
              onDelete={currentUser?.role === 'Administrator' && onDeletePost ? () => { if(confirm("Delete post?")) onDeletePost(post.id); } : undefined}
            />
          ))
        ) : (
          <div className="text-center text-slate-500 py-20 px-4">
            <p>No results found for "{searchQuery}"</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
