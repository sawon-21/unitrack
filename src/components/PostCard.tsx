import React from 'react';
import { MessageSquare, Pin, Repeat2, ThumbsUp, ThumbsDown, BarChart2, Share, BadgeCheck, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Post, User } from '../types';
import { cn } from '../utils';
import { Avatar } from './Avatar';
import { motion } from 'framer-motion';

interface PostCardProps {
  post: Post;
  author?: User;
  currentUser?: User;
  onClick: () => void;
  onLike: () => void;
  onDislike: () => void;
  onRepost: () => void;
  onShare: () => void;
  onDelete?: () => void;
  onRepostersClick?: () => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, author, currentUser, onClick, onLike, onDislike, onRepost, onShare, onDelete, onRepostersClick }) => {
  const isAnonymous = post.isAnonymous;
  const authorHandle = isAnonymous ? `anon_${post.id.substring(0, 6)}` : (author?.username || 'unknown');
  
  const isLiked = currentUser ? post.likedBy?.includes(currentUser.id) : false;
  const isDisliked = currentUser ? post.dislikedBy?.includes(currentUser.id) : false;
  const isReposted = currentUser ? post.reposts > 0 && post.repostedBy?.includes(currentUser.username) : false;

  const statusColors = {
    'New': 'text-teal-400 border-teal-400/30 bg-teal-400/10',
    'Acknowledged': 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
    'Investigating': 'text-orange-400 border-orange-400/30 bg-orange-400/10',
    'Dev In-Progress': 'text-purple-400 border-purple-400/30 bg-purple-400/10',
    'Resolved': 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
    'Reopened': 'text-blue-400 border-blue-400/30 bg-blue-400/10',
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      onClick={onClick}
      className="border-b border-slate-800 p-4 hover:bg-slate-900/50 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 flex flex-col gap-2"
    >
      {post.repostedBy && post.repostedBy.length > 0 && (
        <div 
          className="flex items-center gap-2 text-slate-500 text-xs font-bold ml-10 mb-1 uppercase tracking-wider cursor-pointer hover:text-indigo-400 transition-colors w-fit"
          onClick={(e) => {
            e.stopPropagation();
            if (onRepostersClick) onRepostersClick();
          }}
        >
          <Repeat2 className="w-3 h-3" /> Reposted by {
            post.repostedBy.length === 1 ? `@${post.repostedBy[0]}` :
            post.repostedBy.length === 2 ? `@${post.repostedBy[0]} and @${post.repostedBy[1]}` :
            `@${post.repostedBy[0]}, @${post.repostedBy[1]} and ${post.repostedBy.length - 2} others`
          }
        </div>
      )}
      {post.isPinned && !post.repostedBy && (
        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold ml-10 uppercase tracking-wider">
          <Pin className="w-3 h-3 fill-slate-500" /> Pinned
        </div>
      )}
      <div className="flex gap-3">
        <Avatar user={isAnonymous ? undefined : author} username={authorHandle} className="w-10 h-10 text-sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-base truncate">
              {/* Removed display name, using only username as requested */}
              <span className="font-bold text-slate-100 truncate hover:underline">@{authorHandle}</span>
              {!isAnonymous && author?.role === 'Admin' && (
                <BadgeCheck className="w-5 h-5 text-blue-500 fill-blue-500" />
              )}
              <span className="text-slate-500">·</span>
              <span className="text-slate-500 shrink-0 hover:underline">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: false }).replace('about ', '')}
              </span>
            </div>
          </div>
          
          <h2 className="font-bold text-slate-100 mt-0.5 text-lg leading-snug">
            {post.title}
          </h2>
          
          <p className="text-slate-300 mt-1 text-base leading-normal line-clamp-3">
            {post.description}
          </p>

          <div className="flex items-center gap-2 mt-2">
            <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border", statusColors[post.status])}>
              {post.status}
            </span>
            <span className="text-xs text-slate-500 border border-slate-800 rounded px-2 py-0.5">
              {post.category}
            </span>
          </div>

          <div className="flex items-center justify-between mt-3 text-slate-500 max-w-md">
            <button className="flex items-center gap-2 hover:text-indigo-400 group transition-colors">
              <div className="p-2 -m-2 rounded-full group-hover:bg-indigo-500/10"><MessageSquare className="w-5 h-5" /></div>
              <span className="text-sm">{post.commentCount}</span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onRepost(); }}
              className={cn("flex items-center gap-2 hover:text-emerald-400 group transition-colors", isReposted && "text-emerald-400")}
            >
              <div className="p-2 -m-2 rounded-full group-hover:bg-emerald-500/10"><Repeat2 className="w-5 h-5" /></div>
              <span className="text-sm">{post.reposts || 0}</span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onLike(); }}
              className={cn("flex items-center gap-2 hover:text-emerald-500 group transition-colors", isLiked && "text-emerald-500")}
            >
              <div className="p-2 -m-2 rounded-full group-hover:bg-emerald-500/10"><ThumbsUp className={cn("w-5 h-5", isLiked && "fill-emerald-500")} /></div>
              <span className="text-sm">{post.likes || 0}</span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDislike(); }}
              className={cn("flex items-center gap-2 hover:text-pink-500 group transition-colors", isDisliked && "text-pink-500")}
            >
              <div className="p-2 -m-2 rounded-full group-hover:bg-pink-500/10"><ThumbsDown className={cn("w-5 h-5", isDisliked && "fill-pink-500")} /></div>
              <span className="text-sm">{post.dislikes || 0}</span>
            </button>
            <button className="flex items-center gap-2 hover:text-indigo-400 group transition-colors">
              <div className="p-2 -m-2 rounded-full group-hover:bg-indigo-500/10"><BarChart2 className="w-5 h-5" /></div>
              <span className="text-sm">{post.views || 0}</span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onShare(); }}
              className="flex items-center gap-2 hover:text-indigo-400 group transition-colors"
            >
              <div className="p-2 -m-2 rounded-full group-hover:bg-indigo-500/10"><Share className="w-5 h-5" /></div>
            </button>
            {onDelete && currentUser && (currentUser.id === post.userId || currentUser.role === 'Admin') && (
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="flex items-center gap-2 hover:text-red-400 group transition-colors ml-auto"
              >
                <div className="p-2 -m-2 rounded-full group-hover:bg-red-500/10"><Trash2 className="w-5 h-5" /></div>
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
