import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ArrowLeft, BadgeCheck, Activity } from 'lucide-react';
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
  onCategoryClick
}: SearchScreenProps) {
  const scrollDirection = useScrollDirection();
  const [searchQuery, setSearchQuery] = useState(initialQuery || '');
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery || '');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const userQuery = isUserSearch ? debouncedQuery.slice(1).toLowerCase() : '';
  const tagQuery = isTagSearch ? debouncedQuery.slice(1).toLowerCase() : '';
  const statusQuery = isStatusSearch ? debouncedQuery.slice(7).toLowerCase() : '';
  const categoryQuery = isCategorySearch ? debouncedQuery.slice(9).toLowerCase() : '';

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
      return postsWithAuthor.filter(post => post.status.toLowerCase() === statusQuery);
    }

    if (isCategorySearch) {
      return postsWithAuthor.filter(post => post.category.toLowerCase() === categoryQuery);
    }

    const results = postFuse.search(debouncedQuery);
    
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
    setSearchQuery(`${beforeAt}@${username} `);
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
    return [...posts]
      .filter(p => p.status !== 'New')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [posts]);

  const statusColors: Record<string, string> = {
    'New': 'bg-teal-500',
    'Acknowledged': 'bg-yellow-500',
    'Investigating': 'bg-orange-500',
    'Dev In-Progress': 'bg-purple-500',
    'Resolved': 'bg-emerald-500',
    'Reopened': 'bg-blue-500',
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="pb-20"
    >
      <div className={cn(
        "sticky top-0 z-20 bg-black/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 transition-transform duration-300",
        scrollDirection === 'down' ? "-translate-y-full" : "translate-y-0"
      )}>
        <div className="relative" ref={containerRef}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Search issues or @username..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border-none rounded-full py-2.5 pl-12 pr-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all"
          />
          
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
                    {user.role === 'Admin' && (
                      <BadgeCheck className="w-4 h-4 text-white fill-[#1877F2]" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col">
        {!searchQuery.trim() ? (
          <div className="py-6 px-4">
            <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-sky-500" /> Track Status
            </h2>
            <div className="space-y-3">
              {trackPosts.map((post) => (
                <div 
                  key={post.id}
                  onClick={() => onPostClick(post.id)}
                  className="flex items-start gap-4 p-4 bg-slate-900/50 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-800 transition-colors group"
                >
                  <div className={cn("w-1.5 h-12 rounded-full shrink-0", statusColors[post.status])} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{post.status}</span>
                      <span className="text-[10px] text-slate-600">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                    </div>
                    <h3 className="font-bold text-slate-200 truncate group-hover:text-sky-400 transition-colors">{post.title}</h3>
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
              onClick={() => onPostClick(post.id)} 
              onLike={() => onLike(post.id)}
              onDislike={() => onDislike(post.id)}
              onRepost={() => onRepost(post.id)}
              onShare={() => onShare(post.id)}
              onRepostersClick={post.repostedBy ? () => onRepostersClick(post.repostedBy!) : undefined}
              onTagClick={onTagClick}
              onStatusClick={onStatusClick}
              onCategoryClick={onCategoryClick}
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
