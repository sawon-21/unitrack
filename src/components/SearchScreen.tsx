import React, { useState, useRef, useEffect } from 'react';
import { Search, ArrowLeft } from 'lucide-react';
import { PostCard } from './PostCard';
import { Post, User } from '../types';
import { Avatar } from './Avatar';

interface SearchScreenProps {
  posts: Post[];
  users: Record<string, User>;
  onPostClick: (id: string) => void;
  onLike: (id: string) => void;
  onDislike: (id: string) => void;
  onRepost: (id: string) => void;
  onShare: (id: string) => void;
}

export function SearchScreen({ posts, users, onPostClick, onLike, onDislike, onRepost, onShare }: SearchScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isUserSearch = searchQuery.startsWith('@');
  const userQuery = isUserSearch ? searchQuery.slice(1).toLowerCase() : '';
  
  const suggestedUsers = isUserSearch 
    ? Object.values(users).filter(u => u.username.toLowerCase().includes(userQuery))
    : [];

  const filteredPosts = posts.filter(post => {
    if (!searchQuery.trim()) return false;
    
    if (isUserSearch) {
      const author = users[post.userId];
      return author && author.username.toLowerCase().includes(userQuery);
    }
    
    return post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
           post.description.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleUserSelect = (username: string) => {
    setSearchQuery(`@${username}`);
    setShowSuggestions(false);
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div className="pb-20 animate-in fade-in duration-200">
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="relative">
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
            autoFocus
            className="w-full bg-slate-900 border-none rounded-full py-2.5 pl-12 pr-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>
        
        {showSuggestions && suggestedUsers.length > 0 && (
          <div className="absolute top-full left-4 right-4 mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden z-20">
            {suggestedUsers.map(user => (
              <div 
                key={user.id}
                onClick={() => handleUserSelect(user.username)}
                className="flex items-center gap-3 p-3 hover:bg-slate-800 cursor-pointer transition-colors border-b border-slate-800/50 last:border-0"
              >
                <Avatar username={user.username} className="w-8 h-8 text-xs" />
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-200">@{user.username}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col">
        {!searchQuery.trim() ? (
          <div className="text-center text-slate-500 py-20 px-4">
            <Search className="w-12 h-12 mx-auto mb-4 text-slate-700" />
            <h2 className="text-xl font-bold text-slate-300 mb-2">Search for issues</h2>
            <p>Find problems, announcements, and discussions.</p>
          </div>
        ) : filteredPosts.length > 0 ? (
          filteredPosts.map(post => (
            <PostCard 
              key={post.id} 
              post={post} 
              author={users[post.userId]} 
              onClick={() => onPostClick(post.id)} 
              onLike={() => onLike(post.id)}
              onDislike={() => onDislike(post.id)}
              onRepost={() => onRepost(post.id)}
              onShare={() => onShare(post.id)}
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
