/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Home, Search, Bell, Settings } from 'lucide-react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { PostDetail } from './components/PostDetail';
import { PostSubmissionModal } from './components/PostSubmissionModal';
import { SearchScreen } from './components/SearchScreen';
import { NotificationsScreen } from './components/NotificationsScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { initialPosts, initialComments, initialNotifications, users, currentUser } from './data';
import { Post, Comment, Category, Status, Notification } from './types';
import { cn } from './utils';

type Screen = 'dashboard' | 'search' | 'notifications' | 'settings' | 'detail';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [highlightCommentId, setHighlightCommentId] = useState<string | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [isLoading, setIsLoading] = useState(true);

  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, [currentScreen, activeTab]);

  const handleCreatePost = (title: string, description: string, category: Category, isAnonymous: boolean) => {
    const newPost: Post = {
      id: `p${Date.now()}`,
      title,
      description,
      category,
      createdAt: new Date().toISOString(),
      userId: currentUser.id,
      isAnonymous,
      status: 'New',
      commentCount: 0,
      likes: 0,
      reposts: 0,
      views: 0
    };
    setPosts([newPost, ...posts]);
  };

  const handleAddComment = (text: string, replyToCommentId?: string) => {
    if (!selectedPostId) return;
    const newComment: Comment = {
      id: `c${Date.now()}`,
      postId: selectedPostId,
      userId: currentUser.id,
      text,
      createdAt: new Date().toISOString(),
      replyToCommentId,
      likes: 0,
      dislikes: 0
    };
    setComments([...comments, newComment]);
    setPosts(posts.map(p => p.id === selectedPostId ? { ...p, commentCount: p.commentCount + 1 } : p));
    
    const post = posts.find(p => p.id === selectedPostId);
    if (post && post.userId !== currentUser.id) {
      setNotifications([{
        id: `n${Date.now()}`,
        userId: post.userId,
        type: 'comment',
        message: `${currentUser.username} commented on your post`,
        postId: selectedPostId,
        read: false,
        createdAt: new Date().toISOString()
      }, ...notifications]);
    }
  };

  const handleUpdateStatus = (status: Status) => {
    if (!selectedPostId) return;
    setPosts(posts.map(p => p.id === selectedPostId ? { ...p, status } : p));
  };

  const handleTogglePin = () => {
    if (!selectedPostId) return;
    setPosts(posts.map(p => p.id === selectedPostId ? { ...p, isPinned: !p.isPinned } : p));
  };

  const handleLike = (id: string, isComment = false) => {
    if (isComment) {
      setComments(comments.map(c => {
        if (c.id === id) {
          const isLiked = !c.isLiked;
          return { 
            ...c, 
            isLiked, 
            likes: c.likes + (isLiked ? 1 : -1),
            isDisliked: isLiked ? false : c.isDisliked,
            dislikes: c.isDisliked && isLiked ? c.dislikes - 1 : c.dislikes
          };
        }
        return c;
      }));
    } else {
      setPosts(posts.map(p => {
        if (p.id === id) {
          const isLiked = !p.isLiked;
          return { 
            ...p, 
            isLiked, 
            likes: p.likes + (isLiked ? 1 : -1),
            isDisliked: isLiked ? false : p.isDisliked,
            dislikes: p.isDisliked && isLiked ? p.dislikes - 1 : p.dislikes
          };
        }
        return p;
      }));
    }
  };

  const handleDislike = (id: string, isComment = false) => {
    if (isComment) {
      setComments(comments.map(c => {
        if (c.id === id) {
          const isDisliked = !c.isDisliked;
          return { 
            ...c, 
            isDisliked, 
            dislikes: c.dislikes + (isDisliked ? 1 : -1),
            isLiked: isDisliked ? false : c.isLiked,
            likes: c.isLiked && isDisliked ? c.likes - 1 : c.likes
          };
        }
        return c;
      }));
    } else {
      setPosts(posts.map(p => {
        if (p.id === id) {
          const isDisliked = !p.isDisliked;
          return { 
            ...p, 
            isDisliked, 
            dislikes: p.dislikes + (isDisliked ? 1 : -1),
            isLiked: isDisliked ? false : p.isLiked,
            likes: p.isLiked && isDisliked ? p.likes - 1 : p.likes
          };
        }
        return p;
      }));
    }
  };

  const handleRepost = (id: string) => {
    setPosts(posts.map(p => {
      if (p.id === id) {
        const isReposted = !p.isReposted;
        return { ...p, isReposted, reposts: p.reposts + (isReposted ? 1 : -1) };
      }
      return p;
    }));
  };

  const handleShare = (id: string) => {
    const url = `${window.location.origin}/post/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      // In a real app, show a toast here
      console.log('Link copied to clipboard:', url);
    });
  };

  const displayedPosts = activeTab === 'my' 
    ? posts.filter(p => p.userId === currentUser.id || comments.some(c => c.postId === p.id && c.userId === currentUser.id)) 
    : posts;

  const selectedPost = posts.find(p => p.id === selectedPostId);
  const postComments = comments.filter(c => c.postId === selectedPostId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const unreadNotifications = notifications.filter(n => !n.read).length;

  const handleNotificationClick = (postId?: string, commentId?: string) => {
    if (postId) {
      setSelectedPostId(postId);
      setHighlightCommentId(commentId || null);
      setCurrentScreen('detail');
    }
  };

  const handleMarkAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  return (
    <div className="min-h-screen bg-black text-slate-100 font-sans selection:bg-indigo-500 selection:text-white pb-14">
      {currentScreen === 'dashboard' && (
        <Header activeTab={activeTab} onTabChange={setActiveTab} />
      )}
      
      <main className="max-w-3xl mx-auto w-full relative">
        {currentScreen === 'dashboard' && (
          <Dashboard 
            posts={displayedPosts} 
            users={users} 
            isLoading={isLoading}
            onPostClick={(id) => { setSelectedPostId(id); setCurrentScreen('detail'); }} 
            onOpenSubmit={() => setIsSubmitModalOpen(true)}
            onLike={(id) => handleLike(id, false)}
            onDislike={(id) => handleDislike(id, false)}
            onRepost={handleRepost}
            onShare={handleShare}
          />
        )}
        
        {currentScreen === 'search' && (
          <SearchScreen 
            posts={posts} 
            users={users} 
            onPostClick={(id) => { setSelectedPostId(id); setCurrentScreen('detail'); }} 
            onLike={(id) => handleLike(id, false)}
            onDislike={(id) => handleDislike(id, false)}
            onRepost={handleRepost}
            onShare={handleShare}
          />
        )}

        {currentScreen === 'notifications' && (
          <NotificationsScreen 
            notifications={notifications} 
            users={users} 
            onNotificationClick={handleNotificationClick}
            onMarkAllRead={handleMarkAllRead}
          />
        )}

        {currentScreen === 'settings' && (
          <SettingsScreen />
        )}

        {currentScreen === 'detail' && selectedPost && (
          <PostDetail 
            post={selectedPost} 
            author={users[selectedPost.userId]} 
            comments={postComments} 
            users={users} 
            currentUser={currentUser}
            isLoading={isLoading}
            highlightCommentId={highlightCommentId}
            onBack={() => { setCurrentScreen('dashboard'); setSelectedPostId(null); setHighlightCommentId(null); }} 
            onAddComment={handleAddComment}
            onUpdateStatus={handleUpdateStatus}
            onTogglePin={handleTogglePin}
            onLike={() => handleLike(selectedPost.id, false)}
            onDislike={() => handleDislike(selectedPost.id, false)}
            onCommentLike={(id) => handleLike(id, true)}
            onCommentDislike={(id) => handleDislike(id, true)}
            onRepost={() => handleRepost(selectedPost.id)}
            onShare={() => handleShare(selectedPost.id)}
          />
        )}
      </main>

      {isSubmitModalOpen && (
        <PostSubmissionModal 
          onClose={() => setIsSubmitModalOpen(false)} 
          onSubmit={handleCreatePost} 
        />
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-slate-800 flex justify-around items-center h-14 z-50 max-w-3xl mx-auto">
        <button 
          onClick={() => { setCurrentScreen('dashboard'); setSelectedPostId(null); setHighlightCommentId(null); }}
          className={cn("p-3 rounded-full transition-colors", currentScreen === 'dashboard' ? "text-slate-100" : "text-slate-500 hover:text-slate-100 hover:bg-slate-900")}
        >
          <Home className="w-6 h-6" />
        </button>
        <button 
          onClick={() => { setCurrentScreen('search'); setSelectedPostId(null); setHighlightCommentId(null); }}
          className={cn("p-3 rounded-full transition-colors", currentScreen === 'search' ? "text-slate-100" : "text-slate-500 hover:text-slate-100 hover:bg-slate-900")}
        >
          <Search className="w-6 h-6" />
        </button>
        <button 
          onClick={() => { 
            setCurrentScreen('notifications'); 
            setSelectedPostId(null);
            setHighlightCommentId(null);
          }}
          className={cn("p-3 rounded-full transition-colors relative", currentScreen === 'notifications' ? "text-slate-100" : "text-slate-500 hover:text-slate-100 hover:bg-slate-900")}
        >
          <Bell className="w-6 h-6" />
          {unreadNotifications > 0 && (
            <span className="absolute top-2 right-2 w-4 h-4 bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full">
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </span>
          )}
        </button>
        <button 
          onClick={() => { setCurrentScreen('settings'); setSelectedPostId(null); setHighlightCommentId(null); }}
          className={cn("p-3 rounded-full transition-colors", currentScreen === 'settings' ? "text-slate-100" : "text-slate-500 hover:text-slate-100 hover:bg-slate-900")}
        >
          <Settings className="w-6 h-6" />
        </button>
      </nav>
    </div>
  );
}
