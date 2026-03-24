import React, { useState, useRef, useEffect } from 'react';
import { Search, ArrowLeft, BadgeCheck } from 'lucide-react';
import { PostCard } from './PostCard';
import { Post, User } from '../types';
import { Avatar } from './Avatar';

interface SearchScreenProps {
  posts: Post[];
  users: Record<string, User>;
  currentUser?: User;
  onPostClick: (id: string) => void;
  onLike: (id: string) => void;
  onDislike: (id: string) => void;
  onRepost: (id: string) => void;
  onShare: (id: string) => void;
}

// Simple synonyms dictionary
const SYNONYMS: Record<string, string[]> = {
  'help': ['assist', 'support', 'issue', 'problem'],
  'issue': ['problem', 'bug', 'error', 'help'],
  'admin': ['official', 'system', 'management'],
  'exam': ['test', 'quiz', 'midterm', 'final'],
  'class': ['lecture', 'course', 'session'],
};

// Fuzzy match function
const fuzzyMatch = (str: string, query: string) => {
  if (!query) return true;
  let i = 0, j = 0;
  const s = str.toLowerCase();
  const q = query.toLowerCase();
  while (i < s.length && j < q.length) {
    if (s[i] === q[j]) j++;
    i++;
  }
  return j === q.length;
};

export function SearchScreen({ posts, users, currentUser, onPostClick, onLike, onDislike, onRepost, onShare }: SearchScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isUserSearch = searchQuery.startsWith('@');
  const userQuery = isUserSearch ? searchQuery.slice(1).toLowerCase() : '';
  
  const suggestedUsers = isUserSearch && userQuery.length > 0
    ? Object.values(users).filter(u => u.username.toLowerCase().includes(userQuery) || fuzzyMatch(u.username, userQuery))
    : [];

  // Hide suggestions if exact match
  useEffect(() => {
    if (isUserSearch && suggestedUsers.length === 1 && suggestedUsers[0].username.toLowerCase() === userQuery) {
      setShowSuggestions(false);
    }
  }, [searchQuery, suggestedUsers, isUserSearch, userQuery]);

  const getRelevanceScore = (post: Post, query: string) => {
    if (!query.trim()) return 0;
    
    if (isUserSearch) {
      const author = users[post.userId];
      if (!author) return 0;
      if (author.username.toLowerCase() === userQuery) return 100;
      if (author.username.toLowerCase().includes(userQuery)) return 50;
      if (fuzzyMatch(author.username, userQuery)) return 10;
      return 0;
    }

    const q = query.toLowerCase();
    let score = 0;
    const author = users[post.userId];

    // Exact matches
    if (post.title.toLowerCase().includes(q)) score += 50;
    if (post.description.toLowerCase().includes(q)) score += 30;
    if (post.category.toLowerCase().includes(q)) score += 20;
    if (author && author.username.toLowerCase().includes(q)) score += 40;

    // Fuzzy matches
    if (fuzzyMatch(post.title, q)) score += 10;
    if (fuzzyMatch(post.description, q)) score += 5;

    // Synonym matches
    const words = q.split(/\s+/);
    for (const word of words) {
      if (SYNONYMS[word]) {
        for (const syn of SYNONYMS[word]) {
          if (post.title.toLowerCase().includes(syn)) score += 15;
          if (post.description.toLowerCase().includes(syn)) score += 10;
        }
      }
    }

    return score;
  };

  const filteredPosts = posts
    .map(post => ({ post, score: getRelevanceScore(post, searchQuery) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.post);

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

  return (
    <div className="pb-20 animate-in fade-in duration-200">
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-slate-800 px-4 py-3">
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
            className="w-full bg-slate-900 border-none rounded-full py-2.5 pl-12 pr-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
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
              currentUser={currentUser}
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
