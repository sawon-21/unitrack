import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, MessageSquare, Send, Activity, Loader2, Reply, X, Pin, PinOff, ThumbsUp, ThumbsDown, Repeat2, Share, BarChart2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Post, User, Comment, Status } from '../types';
import { cn } from '../utils';
import { StatusTrackerModal } from './StatusTrackerModal';
import { Avatar } from './Avatar';

interface PostDetailProps {
  post: Post;
  author?: User;
  comments: Comment[];
  users: Record<string, User>;
  currentUser: User;
  isLoading: boolean;
  highlightCommentId?: string | null;
  onBack: () => void;
  onAddComment: (text: string, replyToId?: string) => void;
  onUpdateStatus: (status: Status) => void;
  onTogglePin?: () => void;
  onLike: () => void;
  onDislike: () => void;
  onCommentLike: (id: string) => void;
  onCommentDislike: (id: string) => void;
  onRepost: () => void;
  onShare: () => void;
}

export function PostDetail({ post, author, comments, users, currentUser, isLoading, highlightCommentId, onBack, onAddComment, onUpdateStatus, onTogglePin, onLike, onDislike, onCommentLike, onCommentDislike, onRepost, onShare }: PostDetailProps) {
  const [newComment, setNewComment] = useState('');
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAnonymous = post.isAnonymous;
  const authorName = isAnonymous ? 'Anonymous User' : (author?.name || 'Unknown User');
  const authorHandle = isAnonymous ? 'anon' : (author?.username || authorName.toLowerCase().replace(/\s+/g, ''));
  const authorAvatar = isAnonymous ? 'https://i.pravatar.cc/150?u=anon' : (author?.profilePicUrl || 'https://i.pravatar.cc/150?u=unknown');

  const statusColors = {
    'New': 'text-teal-400 border-teal-400/30 bg-teal-400/10',
    'Acknowledged': 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
    'Investigating': 'text-orange-400 border-orange-400/30 bg-orange-400/10',
    'Dev In-Progress': 'text-purple-400 border-purple-400/30 bg-purple-400/10',
    'Resolved': 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
    'Reopened': 'text-blue-400 border-blue-400/30 bg-blue-400/10',
  };

  useEffect(() => {
    if (highlightCommentId) {
      setTimeout(() => {
        const element = document.getElementById(`comment-${highlightCommentId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('bg-indigo-900/30', 'transition-colors', 'duration-1000');
          setTimeout(() => {
            element.classList.remove('bg-indigo-900/30');
          }, 3000);
        }
      }, 100);
    }
  }, [highlightCommentId, isLoading]);

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

  const renderComment = (comment: Comment, isReply = false) => {
    const commentAuthor = users[comment.userId];
    const cName = commentAuthor?.name || 'Unknown User';
    const cHandle = commentAuthor?.username || cName.toLowerCase().replace(/\s+/g, '');
    const cAvatar = commentAuthor?.profilePicUrl || 'https://i.pravatar.cc/150?u=unknown';
    const replies = getReplies(comment.id);

    return (
      <div id={`comment-${comment.id}`} key={comment.id} className={cn("flex gap-3", isReply ? "mt-4" : "border-b border-slate-800 p-4")}>
        <Avatar username={cHandle} className="w-10 h-10 text-sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-sm truncate">
            <span className="font-bold text-slate-100 truncate hover:underline">@{cHandle}</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-500 shrink-0 hover:underline">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: false }).replace('about ', '')}
            </span>
          </div>
          <p className="text-slate-100 mt-1 text-sm leading-normal whitespace-pre-wrap">
            {comment.text}
          </p>
          
          <div className="flex items-center justify-between mt-3 text-slate-500 max-w-md">
            <button 
              onClick={() => handleReplyClick(comment.id)}
              className="flex items-center gap-2 hover:text-indigo-400 group transition-colors"
            >
              <div className="p-2 -m-2 rounded-full group-hover:bg-indigo-500/10"><MessageSquare className="w-4 h-4" /></div>
            </button>
            <button 
              onClick={() => onCommentLike(comment.id)}
              className={cn("flex items-center gap-2 hover:text-emerald-400 group transition-colors", comment.isLiked && "text-emerald-400")}
            >
              <div className="p-2 -m-2 rounded-full group-hover:bg-emerald-500/10"><ThumbsUp className={cn("w-4 h-4", comment.isLiked && "fill-emerald-500")} /></div>
              <span className="text-xs">{comment.likes || 0}</span>
            </button>
            <button 
              onClick={() => onCommentDislike(comment.id)}
              className={cn("flex items-center gap-2 hover:text-pink-500 group transition-colors", comment.isDisliked && "text-pink-500")}
            >
              <div className="p-2 -m-2 rounded-full group-hover:bg-pink-500/10"><ThumbsDown className={cn("w-4 h-4", comment.isDisliked && "fill-pink-500")} /></div>
              <span className="text-xs">{comment.dislikes || 0}</span>
            </button>
          </div>
          
          {replies.length > 0 && (
            <div className="mt-2 border-l-2 border-slate-800 pl-4">
              {replies.map(reply => renderComment(reply, true))}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
        <p>Loading details...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black animate-in slide-in-from-right-4 duration-300">
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-900 rounded-full transition-colors text-slate-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-slate-100">Post</h1>
        </div>
        {currentUser.role === 'Admin' && onTogglePin && (
          <button
            onClick={onTogglePin}
            className={cn(
              "p-2 rounded-full transition-colors",
              post.isPinned ? "text-indigo-400 hover:bg-indigo-500/10" : "text-slate-400 hover:bg-slate-900"
            )}
            title={post.isPinned ? "Unpin post" : "Pin post"}
          >
            {post.isPinned ? <PinOff className="w-5 h-5" /> : <Pin className="w-5 h-5" />}
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto pb-32">
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <Avatar username={authorHandle} className="w-12 h-12 text-base" />
            <div>
              <h2 className="font-bold text-slate-100 text-base">@{authorHandle}</h2>
            </div>
          </div>

          <h1 className="text-xl font-bold text-slate-100 mb-2 leading-snug">{post.title}</h1>
          <p className="text-slate-100 text-base leading-relaxed mb-4 whitespace-pre-wrap">
            {post.description}
          </p>

          <div className="flex items-center gap-2 mb-4">
            <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border", statusColors[post.status])}>
              {post.status}
            </span>
            <span className="text-xs text-slate-500 border border-slate-800 rounded px-2 py-0.5">
              {post.category}
            </span>
          </div>

          <div className="flex items-center gap-1 text-slate-500 text-sm py-4 border-t border-slate-800">
            <span className="hover:underline cursor-pointer">
              {new Date(post.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </span>
            <span>·</span>
            <span className="hover:underline cursor-pointer">
              {new Date(post.createdAt).toLocaleDateString([], {month: 'short', day: 'numeric', year: 'numeric'})}
            </span>
            <span>·</span>
            <span className="font-bold text-slate-100">{post.views || 0}</span> Views
          </div>

          <div className="flex items-center justify-around py-3 border-t border-b border-slate-800 text-slate-500">
            <button className="flex items-center gap-2 hover:text-indigo-400 group transition-colors">
              <div className="p-2 rounded-full group-hover:bg-indigo-500/10"><MessageSquare className="w-5 h-5" /></div>
              <span className="text-sm">{post.commentCount}</span>
            </button>
            <button 
              onClick={onRepost}
              className={cn("flex items-center gap-2 hover:text-emerald-400 group transition-colors", post.isReposted && "text-emerald-400")}
            >
              <div className="p-2 rounded-full group-hover:bg-emerald-500/10"><Repeat2 className="w-5 h-5" /></div>
              <span className="text-sm">{post.reposts || 0}</span>
            </button>
            <button 
              onClick={onLike}
              className={cn("flex items-center gap-2 hover:text-emerald-400 group transition-colors", post.isLiked && "text-emerald-400")}
            >
              <div className="p-2 rounded-full group-hover:bg-emerald-500/10"><ThumbsUp className={cn("w-5 h-5", post.isLiked && "fill-emerald-500")} /></div>
              <span className="text-sm">{post.likes || 0}</span>
            </button>
            <button 
              onClick={onDislike}
              className={cn("flex items-center gap-2 hover:text-pink-500 group transition-colors", post.isDisliked && "text-pink-500")}
            >
              <div className="p-2 rounded-full group-hover:bg-pink-500/10"><ThumbsDown className={cn("w-5 h-5", post.isDisliked && "fill-pink-500")} /></div>
              <span className="text-sm">{post.dislikes || 0}</span>
            </button>
            <button className="flex items-center gap-2 hover:text-indigo-400 group transition-colors">
              <div className="p-2 rounded-full group-hover:bg-indigo-500/10"><BarChart2 className="w-5 h-5" /></div>
            </button>
            <button 
              onClick={onShare}
              className="flex items-center gap-2 hover:text-indigo-400 group transition-colors"
            >
              <div className="p-2 rounded-full group-hover:bg-indigo-500/10"><Share className="w-5 h-5" /></div>
            </button>
          </div>

          <button 
            onClick={() => setIsStatusModalOpen(true)}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-300 py-3 rounded-full font-bold transition-colors border border-slate-800"
          >
            <Activity className="w-5 h-5" />
            View Status History
          </button>
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

      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-slate-800 p-3 z-20">
        {replyingTo && (
          <div className="flex items-center justify-between text-xs text-indigo-400 mb-2 px-2 bg-indigo-950/30 py-1.5 rounded-md">
            <div className="flex items-center gap-1.5">
              <Reply className="w-3 h-3" />
              <span>Replying to @{users[comments.find(c => c.id === replyingTo)?.userId || '']?.username || 'user'}</span>
            </div>
            <button onClick={() => setReplyingTo(null)} className="hover:text-indigo-300 p-1 rounded-full hover:bg-indigo-900/50">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        <form onSubmit={handleSubmitComment} className="flex items-center gap-3">
          <Avatar username={currentUser.username} className="w-8 h-8 text-xs" />
          <div className="flex-1 relative">
            <input 
              ref={inputRef}
              type="text" 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={replyingTo ? "Post your reply" : "Post your reply"} 
              className="w-full bg-slate-900 border-none rounded-full py-2.5 pl-4 pr-12 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            <button 
              type="submit"
              disabled={!newComment.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {isStatusModalOpen && (
        <StatusTrackerModal 
          currentStatus={post.status} 
          onClose={() => setIsStatusModalOpen(false)}
          isAdmin={currentUser.role === 'Admin'}
          onUpdateStatus={(newStatus) => {
            onUpdateStatus(newStatus);
            setIsStatusModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
