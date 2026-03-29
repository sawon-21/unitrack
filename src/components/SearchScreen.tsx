import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ArrowLeft, BadgeCheck } from 'lucide-react';
import { PostCard } from './PostCard';
import { Post, User } from '../types';
import { Avatar } from './Avatar';
import Fuse from 'fuse.js';
import { cn } from '../utils';
import { useScrollDirection } from '../hooks/useScrollDirection';

interface SearchScreenProps {
  posts: Post[];
  users: Record<string, User>;
  currentUser?: User;
  onPostClick: (id: string) => void;
  onLike: (id: string) => void;
  onDislike: (id: string) => void;
  onRepost: (id: string) => void;
  onShare: (id: string) => void;
  onRepostersClick: (usernames: string[]) => void;
}

export function SearchScreen({ posts, users, currentUser, onPostClick, onLike, onDislike, onRepost, onShare, onRepostersClick }: SearchScreenProps) {
  const scrollDirection = useScrollDirection();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isUserSearch = searchQuery.startsWith('@');
  const userQuery = isUserSearch ? searchQuery.slice(1).toLowerCase() : '';
  
  const userList = useMemo(() => Object.values(users), [users]);
  
  const userFuse = useMemo(() => new Fuse(userList, {
    keys: ['username'],
    threshold: 0.3,
  }), [userList]);

  const suggestedUsers = isUserSearch && userQuery.length > 0
    ? userFuse.search(userQuery).map(result => result.item)
    : [];

  // Hide suggestions if exact match
  useEffect(() => {
    if (isUserSearch && suggestedUsers.length === 1 && suggestedUsers[0].username.toLowerCase() === userQuery) {
      setShowSuggestions(false);
    }
  }, [searchQuery, suggestedUsers, isUserSearch, userQuery]);

  const postsWithAuthor = useMemo(() => posts.map(post => ({
    ...post,
    authorUsername: post.isAnonymous ? `anon_${post.id.substring(0, 6)}` : (users[post.userId]?.username || ''),
  })), [posts, users]);

  const postFuse = useMemo(() => new Fuse(postsWithAuthor, {
    keys: [
      { name: 'title', weight: 2 },
      { name: 'description', weight: 1 },
      { name: 'category', weight: 1.5 },
      { name: 'authorUsername', weight: 2 },
    ],
    threshold: 0.4,
    includeScore: true,
  }), [postsWithAuthor]);

  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    if (isUserSearch) {
      return postsWithAuthor.filter(post => post.authorUsername.toLowerCase().includes(userQuery));
    }

    const results = postFuse.search(searchQuery);
    
    // Boost score based on engagement
    const boostedResults = results.map(result => {
      const post = result.item;
      const engagementScore = (post.likes || 0) * 2 + (post.reposts || 0) * 5 + (post.commentCount || 0) * 3 + Math.floor((post.views || 0) / 10);
      // Fuse score is 0 (perfect match) to 1 (no match). We invert it for our logic.
      const baseScore = (1 - (result.score || 0)) * 100;
      const finalScore = baseScore + Math.min(engagementScore, 50);
      return { post, score: finalScore };
    });

    return boostedResults
      .sort((a, b) => b.score - a.score)
      .map(item => item.post);
  }, [searchQuery, isUserSearch, userQuery, postFuse, postsWithAuthor]);

  const handleUserSelect = (username: string) => {
    setSearchQuery(`@${username}`);
    setShowSuggestions(false);
    if (inputRef.current) inputRef.current.focus();
  };

  // Hide suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const trendingPosts = [...posts]
    .sort((a, b) => (b.likes + b.reposts * 2 + b.commentCount * 3 + Math.floor(b.views / 10)) - (a.likes + a.reposts * 2 + a.commentCount * 3 + Math.floor(a.views / 10)))
    .slice(0, 10);

  return (
    <div className="pb-20 animate-in fade-in duration-200">
      <div className={cn(
        "sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 transition-transform duration-300",
        scrollDirection === 'down' ? "-translate-y-full" : "translate-y-0"
      )}>
        <div className="relative" ref={containerRef}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Search issues or @username..." 
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(e.target.value.startsWith('@'));
            }}
            onFocus={() => setShowSuggestions(searchQuery.startsWith('@'))}
            className="w-full bg-slate-900 border-none rounded-full py-2.5 pl-12 pr-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all"
          />
          
          {showSuggestions && suggestedUsers.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden z-20">
              {suggestedUsers.map(user => (
                <div 
                  key={user.id}
                  onClick={() => handleUserSelect(user.username)}
                  className="flex items-center gap-3 p-3 hover:bg-slate-800 cursor-pointer transition-colors border-b border-slate-800/50 last:border-0"
                >
                  <Avatar user={user} username={user.username} className="w-8 h-8 text-xs" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-200">@{user.username}</span>
                    {user.role === 'Admin' && (
                      <BadgeCheck className="w-4 h-4 text-blue-500 fill-blue-500" />
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
              <span className="text-sky-500">#</span> Trending
            </h2>
            <div className="space-y-3">
              {trendingPosts.map((post, index) => (
                <div 
                  key={post.id}
                  onClick={() => onPostClick(post.id)}
                  className="flex items-start gap-4 p-4 bg-slate-900/50 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-800 transition-colors"
                >
                  <span className="text-2xl font-black text-slate-700 w-6 text-center">{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-200 truncate">{post.title}</h3>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> {post.likes} likes</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span> {post.commentCount} comments</span>
                    </div>
                  </div>
                </div>
              ))}
              {trendingPosts.length === 0 && (
                <p className="text-slate-500 text-center py-8">No trending posts yet.</p>
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
            />
          ))
        ) : (
          <div className="text-center text-slate-500 py-20 px-4">
            <p>No results found for "{searchQuery}"</p>
          </div>
        )}
      </div>
    </div>
  );
}
