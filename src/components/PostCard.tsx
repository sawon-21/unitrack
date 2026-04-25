import React, { useState } from 'react';
import { MessageSquare, Pin, Repeat2, ThumbsUp, ThumbsDown, BarChart2, Share, BadgeCheck, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Post, User } from '../types';
import { cn } from '../utils';
import { Avatar } from './Avatar';
import { motion } from 'framer-motion';
import { ImageModal } from './ImageModal';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface PostCardProps {
  post: Post;
  author?: User;
  currentUser?: User;
  customBgClass?: string;
  onClick: () => void;
  onLike: () => void;
  onDislike: () => void;
  onRepost: () => void;
  onShare: () => void;
  onRepostersClick?: () => void;
  onTagClick?: (tag: string) => void;
  onStatusClick?: (status: string) => void;
  onCategoryClick?: (category: string) => void;
  onDelete?: () => void;
}

export const PostCard: React.FC<PostCardProps> = ({ 
  post, 
  author, 
  currentUser, 
  customBgClass,
  onClick, 
  onLike, 
  onDislike, 
  onRepost, 
  onShare, 
  onRepostersClick, 
  onTagClick,
  onStatusClick,
  onCategoryClick,
  onDelete
}) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomedImageIndex, setZoomedImageIndex] = useState(0);
  const pointerDownPos = React.useRef<{x: number, y: number} | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!pointerDownPos.current) return;
    const dx = Math.abs(e.clientX - pointerDownPos.current.x);
    const dy = Math.abs(e.clientY - pointerDownPos.current.y);
    if (dx < 10 && dy < 10) {
      onClick();
    }
    pointerDownPos.current = null;
  };
  const isAnonymous = post.isAnonymous;
  const displayUsername = author?.username || 'user';
  const authorHandle = isAnonymous ? `anon_${post.id.substring(0, 6)}` : displayUsername.toLowerCase();
  
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

  const isOlderThan24h = Date.now() - new Date(post.createdAt).getTime() > 24 * 60 * 60 * 1000;
  const showStatus = !(post.status === 'New' && isOlderThan24h);

  const images = post.imageUrls || (post.imageUrl ? [post.imageUrl] : []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      className={cn(
        "border-b border-slate-800 p-4 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-slate-900/50 hover:relative hover:z-10 flex flex-col gap-2",
        customBgClass || "bg-slate-950/20 hover:bg-slate-900/40"
      )}
    >
      {post.repostedBy && post.repostedBy.length > 0 && (
        <div 
          className="flex items-center gap-2 text-slate-500 text-xs font-bold ml-10 mb-1 uppercase tracking-wider cursor-pointer hover:text-sky-400 transition-colors w-fit"
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
        <Avatar user={isAnonymous ? undefined : author} username={authorHandle} className="w-8 h-8 text-xs" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-base truncate">
              <span className="font-bold text-slate-400 truncate hover:text-slate-300 transition-colors">@{authorHandle}</span>
              {!isAnonymous && (author?.role === 'Administrator' || author?.role === 'Faculty') && (
                <BadgeCheck className="w-5 h-5 fill-[#1877F2] text-white stroke-[1.5px]" />
              )}
              <span className="text-slate-500">·</span>
              <span className="text-slate-500 shrink-0 hover:text-slate-400 transition-colors">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: false }).replace('about ', '')}
              </span>
            </div>
            {onDelete && (
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="text-slate-500 hover:text-red-500 p-1 rounded-full hover:bg-red-500/10 transition-colors shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <h2 className="font-bold text-slate-100 mt-0.5 text-lg leading-snug">
            {post.title}
          </h2>
          
          <hr className="border-slate-800 my-2" />
          
          <div className="text-slate-300 mt-1 text-base leading-normal line-clamp-3 prose prose-invert prose-sm max-w-none">
            <Markdown 
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({node, children, href, ...props}) => {
                  const getPostId = (url: string) => {
                    try {
                      if (url.startsWith('?post=')) {
                        return new URLSearchParams(url).get('post');
                      }
                      const parsed = new URL(url, window.location.origin);
                      return parsed.searchParams.get('post');
                    } catch { return null; }
                  };
                  const postId = href ? getPostId(href) : null;
                  
                  let linkText = children;
                  if (Array.isArray(children) && children.length === 1 && typeof children[0] === 'string' && children[0].startsWith('http')) {
                    try {
                      const urlObj = new URL(children[0]);
                      linkText = `${urlObj.origin}/...`;
                    } catch {}
                  } else if (typeof children === 'string' && children.startsWith('http')) {
                    try {
                      const urlObj = new URL(children);
                      linkText = `${urlObj.origin}/...`;
                    } catch {}
                  }

                  return (
                    <a {...props} 
                       href={href}
                       target={postId ? undefined : "_blank"} 
                       rel={postId ? undefined : "noopener noreferrer"} 
                       onClick={(e) => {
                         e.stopPropagation();
                         if (postId) {
                           e.preventDefault();
                           window.dispatchEvent(new CustomEvent('navigate-post', { detail: postId }));
                         }
                       }} 
                       className="inline px-1 py-0.5 bg-sky-500/10 text-sky-400 shadow-[0_0_8px_rgba(14,165,233,0.2)] rounded border border-sky-500/20 hover:bg-sky-500/20 hover:text-sky-300 hover:shadow-[0_0_12px_rgba(14,165,233,0.4)] transition-all font-medium break-all"
                    >
                      {linkText}
                    </a>
                  );
                }
              }}
            >
              {post.description}
            </Markdown>
          </div>

          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-0.5 mt-1">
              {post.tags.slice(0, 3).map((tag, index) => (
                <span 
                  key={`${tag}-${index}`} 
                  className="text-[10px] text-sky-400 bg-sky-400/10 hover:bg-sky-400/20 px-1.5 py-0.5 rounded-full cursor-pointer transition-colors font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onTagClick) onTagClick(tag);
                  }}
                >
                  #{tag}
                </span>
              ))}
              {post.tags.length > 3 && (
                <span className="text-[10px] text-slate-500 px-1 py-0.5">
                  +{post.tags.length - 3} more
                </span>
              )}
            </div>
          )}

          {images.length > 0 && (
            <div className={cn("mt-3 grid gap-2", images.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
              {images.slice(0, 2).map((url, index) => (
                <div 
                  key={url}
                  className={cn("rounded-xl overflow-hidden border border-slate-800 bg-slate-950 cursor-zoom-in relative", images.length > 1 ? "aspect-[4/5] sm:aspect-square" : "max-h-[600px]")}
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomedImageIndex(index);
                    setIsZoomed(true);
                  }}
                >
                  <img 
                    src={url} 
                    alt={`Attachment ${index + 1}`} 
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  {index === 1 && images.length > 2 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white text-2xl font-bold">+{images.length - 2}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          <ImageModal 
            imageUrls={isZoomed ? images : null}
            initialIndex={zoomedImageIndex}
            onClose={() => setIsZoomed(false)} 
          />

          <div className="flex items-center gap-2 mt-3">
            {showStatus && (
              <span 
                className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border cursor-pointer hover:opacity-80 transition-opacity", statusColors[post.status])}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onStatusClick) onStatusClick(post.status);
                }}
              >
                {post.status}
              </span>
            )}
            <span 
              className="text-xs text-slate-500 border border-slate-800 rounded px-2 py-0.5 cursor-pointer hover:bg-slate-800 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                if (onCategoryClick) onCategoryClick(post.category);
              }}
            >
              {post.category}
            </span>
          </div>

          <div className="flex items-center justify-between mt-3 text-slate-500 max-w-md">
            <button className="flex items-center gap-2 hover:text-sky-400 group transition-colors">
              <div className="p-2 -m-2 rounded-full group-hover:bg-sky-500/10"><MessageSquare className="w-5 h-5" /></div>
              <span className="text-sm">{post.commentCount}</span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onRepost(); }}
              className={cn("flex items-center gap-2 hover:text-purple-400 group transition-colors", isReposted && "text-purple-400")}
            >
              <div className="p-2 -m-2 rounded-full group-hover:bg-purple-500/10"><Repeat2 className="w-5 h-5" /></div>
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
            <button className="flex items-center gap-2 hover:text-sky-400 group transition-colors">
              <div className="p-2 -m-2 rounded-full group-hover:bg-sky-500/10"><BarChart2 className="w-5 h-5" /></div>
              <span className="text-sm">{post.views || 0}</span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onShare(); }}
              className="flex items-center gap-2 hover:text-sky-400 group transition-colors"
            >
              <div className="p-2 -m-2 rounded-full group-hover:bg-sky-500/10"><Share className="w-5 h-5" /></div>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
