/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Home, Search, Bell, LayoutDashboard, User as UserIcon, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { PostDetail } from './components/PostDetail';
import { PostSubmissionModal } from './components/PostSubmissionModal';
import { SearchScreen } from './components/SearchScreen';
import { NotificationsScreen } from './components/NotificationsScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { ConfirmModal } from './components/ConfirmModal';
import { UserListModal } from './components/UserListModal';
import { AuthModal } from './components/AuthModal';
import { playNotificationSound } from './lib/sound';
import { Post, Comment, Category, AppNotification, User } from './types';
import { cn } from './utils';
import { auth, db, logOut } from './firebase';
import { offlineService } from './services/offlineService';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, query, orderBy, getDoc, serverTimestamp, increment, arrayUnion, arrayRemove, where } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './utils/firestoreErrorHandler';
import { useScrollDirection } from './hooks/useScrollDirection';

type Screen = 'dashboard' | 'search' | 'analytics' | 'notifications' | 'profile' | 'detail';

export default function App() {
  const scrollDirection = useScrollDirection();
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [highlightCommentId, setHighlightCommentId] = useState<string | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [isLoading, setIsLoading] = useState(true);

  const [posts, setPosts] = useState<Post[]>(() => {
    try {
      const cached = localStorage.getItem('cached_posts');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [comments, setComments] = useState<Comment[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [repostersList, setRepostersList] = useState<string[] | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowInstallPrompt(false);
      }
    }
  };

  const handleRepostersClick = (usernames: string[]) => {
    setRepostersList(usernames);
  };

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#post-')) {
        const postId = hash.replace('#post-', '');
        setSelectedPostId(postId);
        setCurrentScreen('detail');
      } else {
        setCurrentScreen('dashboard');
        setSelectedPostId(null);
        setHighlightCommentId(null);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (!auth) {
      setIsAuthReady(true);
      setIsLoading(false);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userRef = doc(db!, 'users', user.uid);
        try {
          const userSnap = await getDoc(userRef);
          
          let userData: User;
          if (!userSnap.exists()) {
            userData = {
              id: user.uid,
              username: user.email?.split('@')[0] || `user_${user.uid.slice(0, 5)}`,
              role: 'Student',
              usernameChanged: false
            };
            try {
              await setDoc(userRef, userData);
            } catch (error) {
              handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
            }
          } else {
            userData = userSnap.data() as User;
          }
          setCurrentUser(userData);
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        }
      } else {
        setCurrentUser(null);
      }
      setIsAuthReady(true);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!db) return;

    const postsQuery = query(collection(db, 'posts'));
    const unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
      let postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      postsData.sort((a, b) => {
        const timeA = new Date(a.lastRepostedAt || a.createdAt).getTime();
        const timeB = new Date(b.lastRepostedAt || b.createdAt).getTime();
        return timeB - timeA;
      });
      setPosts(postsData);
      setIsLoading(false);

      // Save to localStorage as requested
      try {
        const cachedPosts = postsData.slice(0, 20);
        localStorage.setItem('cached_posts', JSON.stringify(cachedPosts));
      } catch (e) {
        console.error("Error saving to localStorage", e);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
    });

    const commentsQuery = query(collection(db, 'comments'), orderBy('createdAt', 'asc'));
    const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
      setComments(commentsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'comments');
    });

    const usersQuery = collection(db, 'users');
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersData: Record<string, User> = {};
      snapshot.docs.forEach(doc => {
        usersData[doc.id] = { id: doc.id, ...doc.data() } as User;
      });
      setUsers(usersData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    return () => {
      unsubscribePosts();
      unsubscribeComments();
      unsubscribeUsers();
    };
  }, []);

  useEffect(() => {
    if (!db || !currentUser) {
      setNotifications([]);
      return;
    }
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const notifQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.id),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeNotifs = onSnapshot(notifQuery, (snapshot) => {
      const notifsData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as AppNotification));
      
      // Check for new notifications to show browser alert
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notif = change.doc.data() as AppNotification;
          // Only show if it's recent (within last 10 seconds) to avoid spam on load
          const isRecent = notif.createdAt && (Date.now() - new Date(notif.createdAt).getTime() < 10000);
          if (isRecent && !notif.read) {
            playNotificationSound();
            toast(notif.message, {
              description: new Date(notif.createdAt).toLocaleTimeString(),
              className: "shadow-[0_0_15px_rgba(14,165,233,0.5)] border-sky-500/50 bg-slate-900 text-white",
            });
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('UniTrack', {
                body: notif.message,
                icon: '/icon-192x192.png'
              });
            }
          }
        }
      });

      setNotifications(notifsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });
    return () => unsubscribeNotifs();
  }, [currentUser]);

  const handleSignIn = () => {
    setIsAuthModalOpen(true);
  };

  const syncOfflineActions = async () => {
    const actions = offlineService.getActions();
    if (actions.length === 0) return;
    
    for (const action of actions) {
      try {
        if (action.type === 'post') {
          const postRef = doc(collection(db!, 'posts'), action.payload.id);
          try {
            await setDoc(postRef, action.payload);
          } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, `posts/${action.payload.id}`);
          }
        } else if (action.type === 'comment') {
          const commentRef = doc(collection(db!, 'comments'), action.payload.id);
          try {
            await setDoc(commentRef, action.payload);
            const actualOriginalId = action.payload.originalPostId || action.payload.postId;
            const postRef = doc(db!, 'posts', actualOriginalId);
            await updateDoc(postRef, { commentCount: increment(1) });
          } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, `comments/${action.payload.id}`);
          }
        } else if (action.type === 'like') {
          await handleLike(action.payload.id, action.payload.isComment);
        } else if (action.type === 'dislike') {
          await handleDislike(action.payload.id, action.payload.isComment);
        } else if (action.type === 'repost') {
          await handleRepost(action.payload.id);
        }
      } catch (e) {
        console.error("Failed to sync action", action, e);
      }
    }
    offlineService.clearActions();
  };

  useEffect(() => {
    if (!isOffline) {
      syncOfflineActions();
    }
  }, [isOffline]);

  const handleCreatePost = async (title: string, description: string, category: Category, isAnonymous: boolean, imageUrls?: string[]) => {
    if (!currentUser) return;
    
    const newPostId = db && !isOffline ? doc(collection(db, 'posts')).id : Math.random().toString(36).substring(7);
    
    const newPost: Post = {
      id: newPostId,
      title,
      description,
      category,
      createdAt: new Date().toISOString(),
      userId: currentUser.id,
      isAnonymous,
      status: 'New',
      commentCount: 0,
      likes: 0,
      dislikes: 0,
      reposts: 0,
      views: 0,
      ...(imageUrls && imageUrls.length > 0 && { imageUrls })
    };

    if (isOffline || !db) {
      offlineService.addAction({ type: 'post', payload: newPost });
      setPosts(prev => [newPost, ...prev]);
      return;
    }
    
    const newPostRef = doc(db, 'posts', newPostId);
    try {
      await setDoc(newPostRef, newPost);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `posts/${newPostId}`);
    }
  };

  const handleAddComment = async (text: string, replyToCommentId?: string) => {
    if (!currentUser || !db || !selectedPostId) return;
    
    const newCommentRef = doc(collection(db, 'comments'));
    const newComment: any = {
      id: newCommentRef.id,
      postId: selectedPostId,
      userId: currentUser.id,
      text,
      createdAt: new Date().toISOString(),
      likes: 0,
      dislikes: 0
    };
    if (replyToCommentId) {
      newComment.replyToCommentId = replyToCommentId;
    }

    if (isOffline) {
      offlineService.addAction({ type: 'comment', payload: newComment });
      setComments(prev => [...prev, newComment as Comment]);
      return;
    }
    
    try {
      await setDoc(newCommentRef, newComment as Comment);
      
      const post = posts.find(p => p.id === selectedPostId);
      if (!post) return;
      
      const actualOriginalId = post.originalPostId || post.id;
      const postRef = doc(db, 'posts', actualOriginalId);
      await updateDoc(postRef, { commentCount: increment(1) });
      
      if (post.userId !== currentUser.id) {
        const notifRef = doc(collection(db, 'notifications'));
        await setDoc(notifRef, {
          id: notifRef.id,
          userId: post.userId,
          type: 'comment',
          message: `${currentUser.username} commented on your post`,
          postId: selectedPostId,
          read: false,
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `comments/${newCommentRef.id}`);
    }
  };

  const handleLike = async (id: string, isComment = false) => {
    if (!currentUser || !db) return handleSignIn();
    
    if (isOffline) {
      offlineService.addAction({ type: 'like', payload: { id, isComment } });
      // Optimistic update could be added here, but for simplicity we rely on sync
      return;
    }

    if (isComment) {
      const comment = comments.find(c => c.id === id);
      if (!comment) return;
      const isLiked = comment.likedBy?.includes(currentUser.id);
      const isDisliked = comment.dislikedBy?.includes(currentUser.id);
      const commentRef = doc(db, 'comments', id);
      
      const updates: any = {};
      if (isLiked) {
        updates.likedBy = arrayRemove(currentUser.id);
        updates.likes = increment(-1);
      } else {
        updates.likedBy = arrayUnion(currentUser.id);
        updates.likes = increment(1);
        if (isDisliked) {
          updates.dislikedBy = arrayRemove(currentUser.id);
          updates.dislikes = increment(-1);
        }
      }
      try {
        await updateDoc(commentRef, updates);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `comments/${id}`);
      }
    } else {
      const targetPost = posts.find(p => p.id === id);
      if (!targetPost) return;
      const actualOriginalId = targetPost.originalPostId || targetPost.id;
      const postRef = doc(db, 'posts', actualOriginalId);
      const isLiked = targetPost.likedBy?.includes(currentUser.id);
      const isDisliked = targetPost.dislikedBy?.includes(currentUser.id);
      
      const updates: any = {};
      if (isLiked) {
        updates.likedBy = arrayRemove(currentUser.id);
        updates.likes = increment(-1);
      } else {
        updates.likedBy = arrayUnion(currentUser.id);
        updates.likes = increment(1);
        if (isDisliked) {
          updates.dislikedBy = arrayRemove(currentUser.id);
          updates.dislikes = increment(-1);
        }
      }
      try {
        await updateDoc(postRef, updates);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `posts/${actualOriginalId}`);
      }
    }
  };

  const handleDislike = async (id: string, isComment = false) => {
    if (!currentUser || !db) return handleSignIn();

    if (isOffline) {
      offlineService.addAction({ type: 'dislike', payload: { id, isComment } });
      return;
    }

    if (isComment) {
      const comment = comments.find(c => c.id === id);
      if (!comment) return;
      const isLiked = comment.likedBy?.includes(currentUser.id);
      const isDisliked = comment.dislikedBy?.includes(currentUser.id);
      const commentRef = doc(db, 'comments', id);
      
      const updates: any = {};
      if (isDisliked) {
        updates.dislikedBy = arrayRemove(currentUser.id);
        updates.dislikes = increment(-1);
      } else {
        updates.dislikedBy = arrayUnion(currentUser.id);
        updates.dislikes = increment(1);
        if (isLiked) {
          updates.likedBy = arrayRemove(currentUser.id);
          updates.likes = increment(-1);
        }
      }
      try {
        await updateDoc(commentRef, updates);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `comments/${id}`);
      }
    } else {
      const targetPost = posts.find(p => p.id === id);
      if (!targetPost) return;
      const actualOriginalId = targetPost.originalPostId || targetPost.id;
      const postRef = doc(db, 'posts', actualOriginalId);
      const isLiked = targetPost.likedBy?.includes(currentUser.id);
      const isDisliked = targetPost.dislikedBy?.includes(currentUser.id);
      
      const updates: any = {};
      if (isDisliked) {
        updates.dislikedBy = arrayRemove(currentUser.id);
        updates.dislikes = increment(-1);
      } else {
        updates.dislikedBy = arrayUnion(currentUser.id);
        updates.dislikes = increment(1);
        if (isLiked) {
          updates.likedBy = arrayRemove(currentUser.id);
          updates.likes = increment(-1);
        }
      }
      try {
        await updateDoc(postRef, updates);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `posts/${actualOriginalId}`);
      }
    }
  };

  const handleRepost = async (id: string) => {
    if (!currentUser || !db) return handleSignIn();

    if (isOffline) {
      offlineService.addAction({ type: 'repost', payload: { id } });
      return;
    }

    const postRef = doc(db, 'posts', id);
    const post = posts.find(p => p.id === id);
    if (!post) return;

    const hasReposted = post.repostedBy?.includes(currentUser.username);

    try {
      if (hasReposted) {
        await updateDoc(postRef, { 
          reposts: increment(-1),
          repostedBy: arrayRemove(currentUser.username)
        });
      } else {
        await updateDoc(postRef, { 
          reposts: increment(1),
          repostedBy: arrayUnion(currentUser.username),
          lastRepostedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${id}`);
    }
  };

  const handlePostClick = async (id: string) => {
    setSelectedPostId(id);
    setCurrentScreen('detail');
    window.location.hash = `post-${id}`;
    
    if (!db) return;
    const post = posts.find(p => p.id === id);
    if (!post) return;
    
    // Increment views
    const actualOriginalId = post.originalPostId || post.id;
    const postRef = doc(db, 'posts', actualOriginalId);
    
    try {
      if (currentUser) {
        const hasViewed = post.viewedBy?.includes(currentUser.id);
        if (!hasViewed) {
          await updateDoc(postRef, { 
            views: increment(1),
            viewedBy: arrayUnion(currentUser.id)
          });
        }
      } else {
        // For unauthenticated users, check localStorage
        const viewedPosts = JSON.parse(localStorage.getItem('viewedPosts') || '[]');
        if (!viewedPosts.includes(actualOriginalId)) {
          viewedPosts.push(actualOriginalId);
          localStorage.setItem('viewedPosts', JSON.stringify(viewedPosts));
          await updateDoc(postRef, { views: increment(1) });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${actualOriginalId}`);
    }
  };

  const handleShare = (id: string) => {
    const post = posts.find(p => p.id === id);
    if (!post) return;
    
    const url = `${window.location.origin}/#post-${id}`;
    const shareText = `${post.title}\n${url}\n#unitrack`;
    
    if (navigator.share) {
      navigator.share({
        title: post.title,
        text: shareText,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        toast('Link copied to clipboard!');
      });
    }
  };

  const displayedPosts = activeTab === 'my' && currentUser
    ? posts.filter(p => p.userId === currentUser.id)
    : posts;

  const selectedPost = posts.find(p => p.id === selectedPostId);
  const postComments = comments.filter(c => c.postId === selectedPostId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const unreadNotifications = notifications.filter(n => !n.read).length;

  const handleNotificationClick = async (id: string, postId?: string, commentId?: string) => {
    if (!db) return;
    const notifRef = doc(db, 'notifications', id);
    try {
      await updateDoc(notifRef, { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${id}`);
    }
    
    if (postId) {
      setSelectedPostId(postId);
      setHighlightCommentId(commentId || null);
      setCurrentScreen('detail');
      window.location.hash = `post-${postId}`;
    }
  };

  const handleMarkAllRead = async () => {
    if (!db) return;
    const unread = notifications.filter(n => !n.read);
    for (const n of unread) {
      const notifRef = doc(db, 'notifications', n.id);
      try {
        await updateDoc(notifRef, { read: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `notifications/${n.id}`);
      }
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-500 via-purple-500 to-pink-500 tracking-tighter mb-4"
        >
          UniTrack
        </motion.div>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="flex gap-2"
        >
          <div className="w-2 h-2 rounded-full bg-sky-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: '300ms' }} />
        </motion.div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-20 h-20 bg-sky-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-sky-500/50">
            <span className="text-4xl font-bold text-white">U</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-widest uppercase">UniTrack</h1>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-slate-100 font-sans selection:bg-sky-500 selection:text-white pb-14">
      {isOffline && (
        <div className="bg-red-500 text-white text-center py-1 text-sm font-bold sticky top-0 z-50">
          You are offline. Some features may not be available.
        </div>
      )}

      {showInstallPrompt && (
        <div className="fixed bottom-16 left-4 right-4 bg-sky-600 text-white p-4 rounded-xl shadow-2xl z-50 flex items-center justify-between">
          <div>
            <h3 className="font-bold">Install UniTrack</h3>
            <p className="text-sm opacity-90">Add to your home screen for a better experience.</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowInstallPrompt(false)}
              className="px-3 py-1.5 text-sm font-medium hover:bg-sky-700 rounded-lg transition-colors"
            >
              Later
            </button>
            <button 
              onClick={handleInstallClick}
              className="px-3 py-1.5 text-sm font-bold bg-white text-sky-600 rounded-lg hover:bg-slate-100 transition-colors shadow-sm"
            >
              Install
            </button>
          </div>
        </div>
      )}

      {currentScreen === 'dashboard' && (
        <Header activeTab={activeTab} onTabChange={setActiveTab} />
      )}
      
      <main className="max-w-3xl mx-auto w-full relative">
        {currentScreen === 'dashboard' && (
          <Dashboard 
            posts={displayedPosts} 
            users={users} 
            currentUser={currentUser || undefined}
            onPostClick={handlePostClick} 
            onOpenSubmit={() => {
              if (!currentUser) handleSignIn();
              else setIsSubmitModalOpen(true);
            }}
            onLike={(id) => handleLike(id, false)}
            onDislike={(id) => handleDislike(id, false)}
            onRepost={handleRepost}
            onShare={handleShare}
            onRepostersClick={handleRepostersClick}
          />
        )}
        
        {currentScreen === 'search' && (
          <SearchScreen 
            posts={posts} 
            users={users} 
            currentUser={currentUser || undefined}
            onPostClick={handlePostClick} 
            onLike={(id) => handleLike(id, false)}
            onDislike={(id) => handleDislike(id, false)}
            onRepost={handleRepost}
            onShare={handleShare}
            onRepostersClick={handleRepostersClick}
          />
        )}

        {currentScreen === 'analytics' && (
          <AnalyticsDashboard 
            posts={posts} 
            users={users} 
            currentUser={currentUser || undefined}
            onPostClick={handlePostClick} 
            onLike={(id) => handleLike(id, false)}
            onDislike={(id) => handleDislike(id, false)}
            onRepost={handleRepost}
            onShare={handleShare}
            onRepostersClick={handleRepostersClick}
          />
        )}

        {currentScreen === 'notifications' && currentUser && (
          <NotificationsScreen 
            notifications={notifications} 
            users={users} 
            onNotificationClick={handleNotificationClick}
            onMarkAllRead={handleMarkAllRead}
          />
        )}

        {currentScreen === 'profile' && currentUser && (
          <ProfileScreen 
            currentUser={currentUser}
            users={users}
            onLogout={() => setShowLogoutConfirm(true)}
          />
        )}

        {currentScreen === 'profile' && !currentUser && (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <UserIcon className="w-16 h-16 text-slate-700 mb-4" />
            <h2 className="text-xl font-bold text-slate-100 mb-2">Sign in to your account</h2>
            <p className="text-slate-400 mb-6 max-w-sm">Sign in to react, comment, and create your own posts on UniTrack.</p>
            <button 
              onClick={handleSignIn}
              className="bg-sky-500 hover:bg-sky-600 text-white px-6 py-3 rounded-full font-bold transition-colors flex items-center gap-2"
            >
              <LogIn className="w-5 h-5" /> Sign in with Google
            </button>
          </div>
        )}

        {currentScreen === 'detail' && selectedPost && (
          <PostDetail 
            post={selectedPost} 
            author={users[selectedPost.userId]} 
            comments={postComments} 
            users={users} 
            currentUser={currentUser || undefined}
            highlightCommentId={highlightCommentId}
            onBack={() => { 
              setCurrentScreen('dashboard'); 
              setSelectedPostId(null); 
              setHighlightCommentId(null); 
              history.pushState('', document.title, window.location.pathname + window.location.search);
            }} 
            onAddComment={handleAddComment}
            onLike={() => handleLike(selectedPost.id, false)}
            onDislike={() => handleDislike(selectedPost.id, false)}
            onCommentLike={(id) => handleLike(id, true)}
            onCommentDislike={(id) => handleDislike(id, true)}
            onRepost={() => handleRepost(selectedPost.id)}
            onShare={() => handleShare(selectedPost.id)}
            onSignIn={handleSignIn}
            onRepostersClick={() => selectedPost.repostedBy && setRepostersList(selectedPost.repostedBy)}
          />
        )}
      </main>

      {isSubmitModalOpen && currentUser && (
        <PostSubmissionModal 
          onClose={() => setIsSubmitModalOpen(false)} 
          onSubmit={handleCreatePost} 
        />
      )}

      {showLogoutConfirm && (
        <ConfirmModal
          title="Log Out"
          message="Are you sure you want to log out?"
          onConfirm={() => {
            logOut();
            setShowLogoutConfirm(false);
          }}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}

      {repostersList && (
        <UserListModal
          title="Reposted by"
          users={repostersList.map(username => (Object.values(users) as User[]).find(u => u.username === username)).filter(Boolean) as User[]}
          onClose={() => setRepostersList(null)}
        />
      )}

      {/* Hide bottom nav on detail screen on mobile to prevent overlap with comment box, and on scroll down */}
      <nav className={cn(
        "fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-slate-800 flex justify-around items-center h-14 z-50 max-w-3xl mx-auto transition-transform duration-300",
        currentScreen === 'detail' 
          ? "translate-y-full sm:translate-y-0" 
          : scrollDirection === 'down' 
            ? "translate-y-full" 
            : "translate-y-0"
      )}>
        <button 
          onClick={() => { 
            setCurrentScreen('dashboard'); 
            setSelectedPostId(null); 
            setHighlightCommentId(null); 
            window.scrollTo({ top: 0, behavior: 'smooth' }); 
          }}
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
          onClick={() => { setCurrentScreen('analytics'); setSelectedPostId(null); setHighlightCommentId(null); }}
          className={cn("p-3 rounded-full transition-colors", currentScreen === 'analytics' ? "text-slate-100" : "text-slate-500 hover:text-slate-100 hover:bg-slate-900")}
        >
          <LayoutDashboard className="w-6 h-6" />
        </button>
        <button 
          onClick={() => { 
            if (!currentUser) { handleSignIn(); return; }
            setCurrentScreen('notifications'); 
            setSelectedPostId(null);
            setHighlightCommentId(null);
          }}
          className={cn("p-3 rounded-full transition-colors relative", currentScreen === 'notifications' ? "text-slate-100" : "text-slate-500 hover:text-slate-100 hover:bg-slate-900")}
        >
          <Bell className="w-6 h-6" />
          {unreadNotifications > 0 && (
            <span className="absolute top-2 right-2 w-4 h-4 bg-sky-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full">
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </span>
          )}
        </button>
        <button 
          onClick={() => { setCurrentScreen('profile'); setSelectedPostId(null); setHighlightCommentId(null); }}
          className={cn("p-3 rounded-full transition-colors", currentScreen === 'profile' ? "text-slate-100" : "text-slate-500 hover:text-slate-100 hover:bg-slate-900")}
        >
          <UserIcon className="w-6 h-6" />
        </button>
      </nav>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <Toaster theme="dark" position="top-center" />
    </div>
  );
}
