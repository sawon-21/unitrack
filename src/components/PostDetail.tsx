import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, MessageSquare, Send, Activity, Reply, X, Pin, PinOff, ThumbsUp, ThumbsDown, Repeat2, Share, BarChart2, BadgeCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Post, User, Comment, Status } from '../types';
import { cn } from '../utils';
import { Avatar } from './Avatar';
import { ImageModal } from './ImageModal';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useScrollDirection } from '../hooks/useScrollDirection';

interface PostDetailProps {
  post: Post;
  author?: User;
  comments: Comment[];
  users: Record<string, User>;
  currentUser?: User;
  highlightCommentId?: string | null;
  onBack: () => void;
  onAddComment: (text: string, replyToId?: string) => void;
  onLike: () => void;
  onDislike: () => void;
  onCommentLike: (id: string) => void;
  onCommentDislike: (id: string) => void;
  onRepost: () => void;
  onShare: () => void;
  onSignIn: () => void;
  onRepostersClick?: () => void;
  onTagClick?: (tag: string) => void;
  onStatusClick?: (status: string) => void;
  onCategoryClick?: (category: string) => void;
}

export function PostDetail({ 
  post, 
  author, 
  comments, 
  users, 
  currentUser, 
  highlightCommentId, 
  onBack, 
  onAddComment, 
  onLike, 
  onDislike, 
  onCommentLike, 
  onCommentDislike, 
  onRepost, 
  onShare, 
  onSignIn, 
  onRepostersClick, 
  onTagClick,
  onStatusClick,
  onCategoryClick
}: PostDetailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollDirection = useScrollDirection(scrollRef);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomedImageIndex, setZoomedImageIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAnonymous = post.isAnonymous;
  const authorHandle = isAnonymous ? `anon_${post.id.substring(0, 6)}` : (author?.username.toLowerCase() || 'unknown');

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

  useEffect(() => {
    if (highlightCommentId) {
      setTimeout(() => {
        const element = document.getElementById(`comment-${highlightCommentId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('bg-sky-900/30', 'transition-colors', 'duration-1000');
          setTimeout(() => {
            element.classList.remove('bg-sky-900/30');
          }, 3000);
        }
      }, 100);
    }
  }, [highlightCommentId]);

  const handleReplyClick = (commentId: string) => {
    setReplyingTo(commentId);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    onAddComment(newComment, replyingTo || undefined);
    setNewComment('');
    setReplyingTo(null);
  };

  const parentComments = comments.filter(c => !c.replyToCommentId);
  const getReplies = (parentId: string) => comments.filter(c => c.replyToCommentId === parentId);

  const renderComment = (comment: Comment, isReply = false, depth = 0) => {
    const commentAuthor = users[comment.userId];
    const cHandle = commentAuthor?.username || 'unknown';
    const replies = getReplies(comment.id);

    const isCommentLiked = currentUser ? comment.likedBy?.includes(currentUser.id) : false;
    const isCommentDisliked = currentUser ? comment.dislikedBy?.includes(currentUser.id) : false;

    return (
      <div id={`comment-${comment.id}`} key={comment.id} className={cn("flex gap-3 transition-colors duration-1000", isReply ? "mt-3 pl-3 border-l-2 border-slate-800" : "border-b border-slate-800 p-4")}>
        {!isReply && <Avatar user={commentAuthor} username={cHandle} className="w-10 h-10 text-base shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-base truncate">
            <span className="font-bold text-slate-300 truncate hover:underline">@{cHandle}</span>
            {commentAuthor?.role === 'Admin' && (
              <BadgeCheck className="w-5 h-5 text-white fill-[#1877F2]" />
            )}
            <span className="text-slate-500">·</span>
            <span className="text-slate-500 shrink-0 hover:underline">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: false }).replace('about ', '')}
            </span>
          </div>
          <div className="text-slate-100 mt-1 text-base leading-normal whitespace-pre-wrap prose prose-invert prose-sm max-w-none">
            <Markdown remarkPlugins={[remarkGfm]}>{comment.text}</Markdown>
          </div>
          
          <div className="flex items-center justify-between mt-3 text-slate-500 max-w-md">
            <button 
              onClick={() => currentUser ? handleReplyClick(comment.id) : onSignIn()}
              className="flex items-center gap-2 hover:text-sky-400 group transition-colors"
            >
              <div className="p-2 -m-2 rounded-full group-hover:bg-sky-500/10"><MessageSquare className="w-5 h-5" /></div>
            </button>
            <button 
              onClick={() => currentUser ? onCommentLike(comment.id) : onSignIn()}
              className={cn("flex items-center gap-2 hover:text-emerald-400 group transition-colors", isCommentLiked && "text-emerald-400")}
            >
              <div className="p-2 -m-2 rounded-full group-hover:bg-emerald-500/10"><ThumbsUp className={cn("w-5 h-5", isCommentLiked && "fill-emerald-500")} /></div>
              <span className="text-sm">{comment.likes || 0}</span>
            </button>
            <button 
              onClick={() => currentUser ? onCommentDislike(comment.id) : onSignIn()}
              className={cn("flex items-center gap-2 hover:text-pink-500 group transition-colors", isCommentDisliked && "text-pink-500")}
            >
              <div className="p-2 -m-2 rounded-full group-hover:bg-pink-500/10"><ThumbsDown className={cn("w-5 h-5", isCommentDisliked && "fill-pink-500")} /></div>
              <span className="text-sm">{comment.dislikes || 0}</span>
            </button>
          </div>
          
          {replies.length > 0 && (
            <div className={cn("mt-2 border-slate-800", depth < 3 ? "border-l-2 pl-4" : "pl-1")}>
              {replies.map(reply => renderComment(reply, true, depth + 1))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-black animate-in slide-in-from-right-4 duration-300 relative">
      <header className={cn(
        "absolute top-0 left-0 right-0 z-10 bg-black/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between transition-transform duration-300",
        scrollDirection === 'down' ? "-translate-y-full" : "translate-y-0"
      )}>
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-900 rounded-full transition-colors text-slate-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-slate-100">Post</h1>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto pt-14 pb-32 sm:pb-40">
        <div className="p-4 border-b border-slate-800">
          {post.repostedBy && post.repostedBy.length > 0 && (
            <div 
              className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-3 uppercase tracking-wider cursor-pointer hover:text-sky-400 transition-colors w-fit"
              onClick={onRepostersClick}
            >
              <Repeat2 className="w-3 h-3" /> Reposted by {
                post.repostedBy.length === 1 ? `@${post.repostedBy[0]}` :
                post.repostedBy.length === 2 ? `@${post.repostedBy[0]} and @${post.repostedBy[1]}` :
                `@${post.repostedBy[0]}, @${post.repostedBy[1]} and ${post.repostedBy.length - 2} others`
              }
            </div>
          )}
          <div className="flex items-center gap-3 mb-4">
            <Avatar user={isAnonymous ? undefined : author} username={authorHandle} className="w-12 h-12 text-base" />
            <div className="flex items-center gap-1.5">
              <h2 className="font-bold text-slate-400 text-base">@{authorHandle}</h2>
              {!isAnonymous && author?.role === 'Admin' && (
                <BadgeCheck className="w-5 h-5 text-white fill-[#1877F2]" />
              )}
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-100 mb-2 leading-snug">{post.title}</h1>
          <hr className="border-slate-800 my-4" />
          <div className="text-slate-100 text-lg leading-relaxed mb-4 whitespace-pre-wrap prose prose-invert max-w-none">
            <Markdown 
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({node, ...props}) => (
                  <a {...props} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-block bg-slate-800 hover:bg-slate-700 text-sky-400 px-3 py-1 rounded-md text-sm font-medium transition-colors my-1 border border-slate-700 no-underline">
                    🔗 Click to visit
                  </a>
                )
              }}
            >
              {post.description}
            </Markdown>
          </div>

          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {post.tags.map(tag => (
                <span 
                  key={tag} 
                  className="text-[10px] text-sky-400 bg-sky-400/10 hover:bg-sky-400/20 px-2 py-0.5 rounded-full cursor-pointer transition-colors font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onTagClick) onTagClick(tag);
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {images.length > 0 && (
            <div className={cn("mb-4 grid gap-2", images.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
              {images.slice(0, 2).map((url, index) => (
                <div 
                  key={index}
                  className={cn("rounded-xl overflow-hidden border border-slate-800 bg-slate-950 cursor-zoom-in relative", images.length > 1 ? "aspect-[4/5] sm:aspect-square" : "max-h-[600px]")}
                  onClick={() => {
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
                      <span className="text-white text-3xl font-bold">+{images.length - 2}</span>
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

          {/* Tracing Line */}
          <div className="mb-6 bg-slate-900/50 rounded-xl p-4 border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-3 h-3 text-sky-500" /> Tracing Status
              </h3>
              <span 
                className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border cursor-pointer hover:opacity-80 transition-opacity", statusColors[post.status])}
                onClick={() => onStatusClick && onStatusClick(post.status)}
              >
                {post.status}
              </span>
            </div>
            
            <div className="relative flex justify-between items-center px-2">
              {/* Background Line */}
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-800 z-0 mx-6" />
              
              {/* Progress Line */}
              <div 
                className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-sky-500 z-0 mx-6 transition-all duration-1000" 
                style={{ 
                  width: post.status === 'Resolved' ? 'calc(100% - 48px)' : 
                         post.status === 'Dev In-Progress' ? '75%' :
                         post.status === 'Investigating' ? '50%' :
                         post.status === 'Acknowledged' ? '25%' : '0%'
                }}
              />

              {[
                { id: 'New', label: 'New' },
                { id: 'Acknowledged', label: 'Ack' },
                { id: 'Investigating', label: 'Invest' },
                { id: 'Dev In-Progress', label: 'Dev' },
                { id: 'Resolved', label: 'Done' }
              ].map((step, idx) => {
                const stepOrder = ['New', 'Acknowledged', 'Investigating', 'Dev In-Progress', 'Resolved'];
                const currentIdx = stepOrder.indexOf(post.status === 'Reopened' ? 'Dev In-Progress' : post.status);
                const isCompleted = idx <= currentIdx;
                const isCurrent = idx === currentIdx;

                return (
                  <div key={step.id} className="relative z-10 flex flex-col items-center">
                    <div className={cn(
                      "w-3 h-3 rounded-full border-2 transition-all duration-500",
                      isCompleted ? "bg-sky-500 border-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]" : "bg-slate-900 border-slate-700",
                      isCurrent && "scale-125 ring-4 ring-sky-500/20"
                    )} />
                    <span className={cn(
                      "text-[8px] mt-2 font-bold uppercase tracking-tighter transition-colors",
                      isCompleted ? "text-sky-400" : "text-slate-600"
                    )}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                <span>{['New', 'Acknowledged', 'Investigating', 'Dev In-Progress', 'Resolved'].indexOf(post.status) + 1} steps overcome</span>
                <span>{post.status === 'Resolved' ? 'Completed' : 'Processing...'}</span>
              </div>
              
              {post.statusMessage && (
                <div className="mt-2 p-3 bg-slate-950/50 rounded-lg border border-slate-800/50">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <span className="font-bold text-sky-400 mr-2">Update:</span>
                    {post.statusMessage}
                  </p>
                </div>
              )}
            </div>
          </div>

          {showStatus && (
            <div className="flex items-center gap-2 mb-4">
              <span 
                className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border cursor-pointer hover:opacity-80 transition-opacity", statusColors[post.status])}
                onClick={() => onStatusClick && onStatusClick(post.status)}
              >
                {post.status}
              </span>
              <span 
                className="text-xs text-slate-500 border border-slate-800 rounded px-2 py-0.5 cursor-pointer hover:bg-slate-800 transition-colors"
                onClick={() => onCategoryClick && onCategoryClick(post.category)}
              >
                {post.category}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1 text-slate-500 text-sm py-4 border-t border-slate-800">
            <span className="hover:underline cursor-pointer">
              {new Date(post.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </span>
            <span>·</span>
            <span className="hover:underline cursor-pointer">
              {new Date(post.createdAt).toLocaleDateString([], {month: 'short', day: 'numeric', year: 'numeric'})}
            </span>
            <span>·</span>
            <span className="font-bold text-slate-400">{post.views || 0}</span> Views
          </div>

          <div className="flex items-center justify-around py-3 border-t border-b border-slate-800 text-slate-500">
            <button className="flex items-center gap-2 hover:text-sky-400 group transition-colors">
              <div className="p-2 rounded-full group-hover:bg-sky-500/10"><MessageSquare className="w-5 h-5" /></div>
              <span className="text-sm">{post.commentCount}</span>
            </button>
            <button 
              onClick={currentUser ? onRepost : onSignIn}
              className={cn("flex items-center gap-2 hover:text-purple-400 group transition-colors", isReposted && "text-purple-400")}
            >
              <div className="p-2 rounded-full group-hover:bg-purple-500/10"><Repeat2 className="w-5 h-5" /></div>
              <span className="text-sm">{post.reposts || 0}</span>
            </button>
            <button 
              onClick={currentUser ? onLike : onSignIn}
              className={cn("flex items-center gap-2 hover:text-emerald-400 group transition-colors", isLiked && "text-emerald-400")}
            >
              <div className="p-2 rounded-full group-hover:bg-emerald-500/10"><ThumbsUp className={cn("w-5 h-5", isLiked && "fill-emerald-500")} /></div>
              <span className="text-sm">{post.likes || 0}</span>
            </button>
            <button 
              onClick={currentUser ? onDislike : onSignIn}
              className={cn("flex items-center gap-2 hover:text-pink-500 group transition-colors", isDisliked && "text-pink-500")}
            >
              <div className="p-2 rounded-full group-hover:bg-pink-500/10"><ThumbsDown className={cn("w-5 h-5", isDisliked && "fill-pink-500")} /></div>
              <span className="text-sm">{post.dislikes || 0}</span>
            </button>
            <button className="flex items-center gap-2 hover:text-sky-400 group transition-colors">
              <div className="p-2 rounded-full group-hover:bg-sky-500/10"><BarChart2 className="w-5 h-5" /></div>
            </button>
            <button 
              onClick={onShare}
              className="flex items-center gap-2 hover:text-sky-400 group transition-colors"
            >
              <div className="p-2 rounded-full group-hover:bg-sky-500/10"><Share className="w-5 h-5" /></div>
            </button>
          </div>
        </div>

        <div className="flex flex-col">
          {parentComments.map(comment => renderComment(comment))}
          {comments.length === 0 && (
            <div className="text-center text-slate-500 py-10">
              No replies yet.
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 sm:bottom-14 left-0 right-0 bg-black border-t border-slate-800 p-3 z-20 max-w-3xl mx-auto">
        {currentUser ? (
          <>
            {replyingTo && (
              <div className="flex items-center justify-between text-xs text-sky-400 mb-2 px-2 bg-sky-950/30 py-1.5 rounded-md">
                <div className="flex items-center gap-1.5">
                  <Reply className="w-3 h-3" />
                  <span>Replying to @{users[comments.find(c => c.id === replyingTo)?.userId || '']?.username || 'user'}</span>
                </div>
                <button onClick={() => setReplyingTo(null)} className="hover:text-sky-300 p-1 rounded-full hover:bg-sky-900/50">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <form onSubmit={handleSubmitComment} className="flex items-center gap-3">
              <Avatar user={currentUser} username={currentUser.username} className="w-8 h-8 text-xs" />
              <div className="flex-1 relative">
                <input 
                  ref={inputRef}
                  type="text" 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={replyingTo ? "Post your reply" : "Post your reply"} 
                  className="w-full bg-slate-900 border-none rounded-full py-2.5 pl-4 pr-12 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all"
                />
                <button 
                  type="submit"
                  disabled={!newComment.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-sm text-slate-400">Sign in to join the conversation</span>
            <button 
              onClick={onSignIn}
              className="px-4 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold rounded-full transition-colors"
            >
              Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
