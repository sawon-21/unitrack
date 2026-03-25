/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Home, Search, Bell, LayoutDashboard, User as UserIcon, LogIn } from 'lucide-react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { PostDetail } from './components/PostDetail';
import { PostSubmissionModal } from './components/PostSubmissionModal';
import { SearchScreen } from './components/SearchScreen';
import { NotificationsScreen } from './components/NotificationsScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { Post, Comment, Category, Notification, User } from './types';
import { cn } from './utils';
import { auth, db, signInWithGoogle, logOut } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, query, orderBy, getDoc, serverTimestamp, increment, arrayUnion, arrayRemove, where } from 'firebase/firestore';

type Screen = 'dashboard' | 'search' | 'analytics' | 'notifications' | 'profile' | 'detail';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [highlightCommentId, setHighlightCommentId] = useState<string | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [isLoading, setIsLoading] = useState(true);

  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

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
        const userSnap = await getDoc(userRef);
        
        let userData: User;
        if (!userSnap.exists()) {
          userData = {
            id: user.uid,
            username: user.email?.split('@')[0] || `user_${user.uid.slice(0, 5)}`,
            role: 'Student',
            usernameChanged: false
          };
          await setDoc(userRef, userData);
        } else {
          userData = userSnap.data() as User;
        }
        setCurrentUser(userData);
      } else {
        setCurrentUser(null);
      }
      setIsAuthReady(true);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!db) return;

    const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      setPosts(postsData);
      setIsLoading(false);
    });

    const commentsQuery = query(collection(db, 'comments'), orderBy('createdAt', 'asc'));
    const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
      setComments(commentsData);
    });

    const usersQuery = collection(db, 'users');
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersData: Record<string, User> = {};
      snapshot.docs.forEach(doc => {
        usersData[doc.id] = { id: doc.id, ...doc.data() } as User;
      });
      setUsers(usersData);
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
    const notifQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.id),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeNotifs = onSnapshot(notifQuery, (snapshot) => {
      const notifsData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(notifsData);
    });
    return () => unsubscribeNotifs();
  }, [currentUser]);

  const handleSignIn = async () => {
    try {
      const user = await signInWithGoogle();
      if (!user) return; // User cancelled
    } catch (error) {
      console.error("Sign in failed", error);
    }
  };

  const handleCreatePost = async (title: string, description: string, category: Category, isAnonymous: boolean) => {
    if (!currentUser || !db) return;
    
    const newPostRef = doc(collection(db, 'posts'));
    const newPost: Post = {
      id: newPostRef.id,
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
      views: 0
    };
    await setDoc(newPostRef, newPost);
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
  };

  const handleLike = async (id: string, isComment = false) => {
    if (!currentUser || !db) return handleSignIn();
    
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
      await updateDoc(commentRef, updates);
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
      await updateDoc(postRef, updates);
    }
  };

  const handleDislike = async (id: string, isComment = false) => {
    if (!currentUser || !db) return handleSignIn();

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
      await updateDoc(commentRef, updates);
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
      await updateDoc(postRef, updates);
    }
  };

  const handleRepost = async (id: string) => {
    if (!currentUser || !db) return handleSignIn();

    const originalPost = posts.find(p => p.id === id);
    if (!originalPost) return;

    const actualOriginalId = originalPost.originalPostId || originalPost.id;
    const basePost = posts.find(p => p.id === actualOriginalId) || originalPost;

    const existingRepost = posts.find(p => p.originalPostId === actualOriginalId && p.repostedBy === currentUser.username);

    if (existingRepost) {
      // Remove repost
      await deleteDoc(doc(db, 'posts', existingRepost.id));
      const postRef = doc(db, 'posts', actualOriginalId);
      await updateDoc(postRef, { reposts: increment(-1) });
    } else {
      // Add repost
      const newRepostRef = doc(collection(db, 'posts'));
      const repost: Post = {
        ...basePost,
        id: newRepostRef.id,
        originalPostId: actualOriginalId,
        repostedBy: currentUser.username,
        createdAt: new Date().toISOString()
      };
      await setDoc(newRepostRef, repost);
      const postRef = doc(db, 'posts', actualOriginalId);
      await updateDoc(postRef, { reposts: increment(1) });
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
    
    if (currentUser) {
      const hasViewed = post.viewedBy?.includes(currentUser.id);
      if (!hasViewed) {
        await updateDoc(postRef, { 
          views: increment(1),
          viewedBy: arrayUnion(currentUser.id)
        });
      }
    } else {
      // For unauthenticated users, just increment views (might be spammy but simple)
      await updateDoc(postRef, { views: increment(1) });
    }
  };

  const handleShare = (id: string) => {
    const url = `${window.location.origin}/#post-${id}`;
    if (navigator.share) {
      navigator.share({
        title: 'Check out this post',
        url: url
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(url).then(() => {
        alert('Link copied to clipboard!');
      });
    }
  };

  const displayedPosts = activeTab === 'my' && currentUser
    ? posts.filter(p => p.userId === currentUser.id || comments.some(c => c.postId === p.id && c.userId === currentUser.id)) 
    : posts;

  const selectedPost = posts.find(p => p.id === selectedPostId);
  const postComments = comments.filter(c => c.postId === selectedPostId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const unreadNotifications = notifications.filter(n => !n.read).length;

  const handleNotificationClick = async (id: string, postId?: string, commentId?: string) => {
    if (!db) return;
    const notifRef = doc(db, 'notifications', id);
    await updateDoc(notifRef, { read: true });
    
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
      await updateDoc(notifRef, { read: true });
    }
  };

  if (!isAuthReady) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-slate-500">Loading...</div>;
  }

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
            currentUser={currentUser || undefined}
            isLoading={isLoading}
            onPostClick={handlePostClick} 
            onOpenSubmit={() => {
              if (!currentUser) handleSignIn();
              else setIsSubmitModalOpen(true);
            }}
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
            currentUser={currentUser || undefined}
            onPostClick={handlePostClick} 
            onLike={(id) => handleLike(id, false)}
            onDislike={(id) => handleDislike(id, false)}
            onRepost={handleRepost}
            onShare={handleShare}
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
            onUpdateProfile={async (updatedUser) => {
              if (!db) return;
              const userRef = doc(db, 'users', updatedUser.id);
              await updateDoc(userRef, { username: updatedUser.username, usernameChanged: true });
              setCurrentUser(updatedUser);
            }}
            onLogout={logOut}
          />
        )}

        {currentScreen === 'profile' && !currentUser && (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <UserIcon className="w-16 h-16 text-slate-700 mb-4" />
            <h2 className="text-xl font-bold text-slate-100 mb-2">Sign in to your account</h2>
            <p className="text-slate-400 mb-6 max-w-sm">Sign in to react, comment, and create your own posts on UniTrack.</p>
            <button 
              onClick={handleSignIn}
              className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3 rounded-full font-bold transition-colors flex items-center gap-2"
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
            isLoading={isLoading}
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
          />
        )}
      </main>

      {isSubmitModalOpen && currentUser && (
        <PostSubmissionModal 
          onClose={() => setIsSubmitModalOpen(false)} 
          onSubmit={handleCreatePost} 
        />
      )}

      {/* Hide bottom nav on detail screen on mobile to prevent overlap with comment box */}
      <nav className={cn(
        "fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-slate-800 flex justify-around items-center h-14 z-50 max-w-3xl mx-auto transition-transform duration-300",
        currentScreen === 'detail' ? "translate-y-full sm:translate-y-0" : "translate-y-0"
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
            <span className="absolute top-2 right-2 w-4 h-4 bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full">
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
    </div>
  );
}
