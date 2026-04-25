/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { Home, Search, Bell, LayoutDashboard, User as UserIcon, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { PostDetail } from './components/PostDetail';
import { CreatePostScreen } from './components/CreatePostScreen';
import { SearchScreen } from './components/SearchScreen';
import { NotificationsScreen } from './components/NotificationsScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { ConfirmModal } from './components/ConfirmModal';
import { UserListModal } from './components/UserListModal';
import { AuthModal } from './components/AuthModal';
import { playNotificationSound } from './lib/sound';
import { Post, Comment, Category, AppNotification, User, Status, StatusUpdate } from './types';
import { cn } from './utils';
import { auth, db, storage, logOut } from './firebase';
import { offlineService } from './services/offlineService';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, query, orderBy, getDoc, serverTimestamp, increment, arrayUnion, arrayRemove, where, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { handleFirestoreError, OperationType } from './utils/firestoreErrorHandler';
import { useScrollDirection } from './hooks/useScrollDirection';
import { compressImage } from './utils/imageUtils';
import { uploadToCloudinary } from './utils/cloudinaryUtils';

type Screen = 'dashboard' | 'search' | 'analytics' | 'notifications' | 'profile' | 'detail' | 'create';

export default function App() {
  const scrollDirection = useScrollDirection();
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const scrollPositionRef = useRef<number>(0);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [highlightCommentId, setHighlightCommentId] = useState<string | null>(null);
  const [initialSearchQuery, setInitialSearchQuery] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'track'>('all');
  const [posts, setPosts] = useState<Post[]>(() => {
    try {
      const cached = localStorage.getItem('cached_posts');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(() => {
    try {
      return !localStorage.getItem('cached_posts');
    } catch {
      return true;
    }
  });
  const [isInitialSync, setIsInitialSync] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [users, setUsers] = useState<Record<string, User>>(() => {
    try {
      const cached = localStorage.getItem('cached_users');
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem('cached_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [isAuthReady, setIsAuthReady] = useState(() => {
    try {
      return !!localStorage.getItem('cached_user');
    } catch {
      return false;
    }
  });
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [repostersList, setRepostersList] = useState<string[] | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const activeUser = currentUser ? (users[currentUser.id] || currentUser) : null;

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

    const handleNav = (e: any) => {
      if (e.detail) {
        setSelectedPostId(e.detail);
        setCurrentScreen('detail');
        window.history.pushState(null, '', `?post=${e.detail}`);
      }
    };
    window.addEventListener('navigate-post', handleNav);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('navigate-post', handleNav);
    };
  }, []);

  useEffect(() => {
    if (!auth) {
      setIsAuthReady(true);
      setIsLoading(false);
      return;
    }

    let snapshotUnsubscribe: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (snapshotUnsubscribe) {
        snapshotUnsubscribe();
        snapshotUnsubscribe = undefined;
      }

      if (user) {
        // Try getting cached user first for immediate display
        const cachedUser = localStorage.getItem('cached_user');
        if (cachedUser) {
          setCurrentUser(JSON.parse(cachedUser));
        }

        const userRef = doc(db!, 'users', user.uid);
        let initialCheck = true;
        
        snapshotUnsubscribe = onSnapshot(userRef, async (userSnap) => {
          if (!userSnap.exists()) {
            if (initialCheck) {
              const userData: User = {
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
              // User doc was deleted while they were logged in -> secure session expiration
              auth.signOut();
              setCurrentUser(null);
              localStorage.removeItem('cached_user');
              alert('Your account has been deactivated. You have been signed out.');
            }
          } else {
            const userData = userSnap.data() as User;
            setCurrentUser(userData);
            localStorage.setItem('cached_user', JSON.stringify(userData));
          }
          initialCheck = false;
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        });
      } else {
        setCurrentUser(null);
        localStorage.removeItem('cached_user');
      }
      setIsAuthReady(true);
    });

    return () => {
      unsubscribeAuth();
      if (snapshotUnsubscribe) snapshotUnsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!db) return;

    const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(100));
    const unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
      let postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      postsData.sort((a, b) => {
        const timeA = new Date(a.lastRepostedAt || a.createdAt).getTime();
        const timeB = new Date(b.lastRepostedAt || b.createdAt).getTime();
        return timeB - timeA;
      });
      setPosts(postsData);
      setIsInitialSync(false);
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

    const usersQuery = query(collection(db, 'users'), limit(500));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersData: Record<string, User> = {};
      snapshot.docs.forEach(doc => {
        usersData[doc.id] = { id: doc.id, ...doc.data() } as User;
      });
      setUsers(usersData);
      try {
        localStorage.setItem('cached_users', JSON.stringify(usersData));
      } catch (e) {
        console.warn("Failed caching users", e);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    return () => {
      unsubscribePosts();
      unsubscribeUsers();
    };
  }, []);

  useEffect(() => {
    if (!db || !selectedPostId) {
      setComments([]);
      return;
    }

    const commentsQuery = query(
      collection(db, 'comments'), 
      where('postId', '==', selectedPostId),
      orderBy('createdAt', 'asc')
    );
    
    const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
      setComments(commentsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'comments');
    });

    return () => unsubscribeComments();
  }, [selectedPostId]);

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
      orderBy('createdAt', 'desc'),
      limit(50)
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

  const handleTagClick = (tag: string) => {
    setInitialSearchQuery(`#${tag}`);
    setCurrentScreen('search');
    setSelectedPostId(null);
    setHighlightCommentId(null);
  };

  const handleStatusClick = (status: string) => {
    if (status === 'All') {
      setInitialSearchQuery('');
    } else if (status === 'Pending') {
      setInitialSearchQuery('status:pending');
    } else {
      setInitialSearchQuery(`status:${status.toLowerCase()}`);
    }
    setCurrentScreen('search');
    setSelectedPostId(null);
    setHighlightCommentId(null);
  };

  const handleCategoryClick = (category: string) => {
    setInitialSearchQuery(`category:${category.toLowerCase()}`);
    setCurrentScreen('search');
    setSelectedPostId(null);
    setHighlightCommentId(null);
  };

  const handleCreatePost = async (title: string, description: string, category: Category, isAnonymous: boolean, imageUrls?: string[], tags?: string[], imageFiles?: File[]) => {
    if (!currentUser) {
      toast.error("Please sign in to post");
      return;
    }
    
    const toastId = toast.loading("Creating post...");
    
    const newPostId = db && !isOffline ? doc(collection(db, 'posts')).id : Math.random().toString(36).substring(7);
    
    let uploadedImageUrls: string[] = [];
    if ((imageFiles || imageUrls) && !isOffline) {
      try {
        const filesToUpload = imageFiles ? [...imageFiles] : [];
        
        // If we only have imageUrls (base64) and no files (e.g. from draft), convert them
        if (filesToUpload.length === 0 && imageUrls && imageUrls.length > 0) {
          for (const dataUrl of imageUrls) {
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            filesToUpload.push(new File([blob], "image.jpg", { type: blob.type }));
          }
        }

        for (let i = 0; i < filesToUpload.length; i++) {
          const file = filesToUpload[i];
          toast.loading(`Uploading image ${i + 1}/${filesToUpload.length}...`, { id: toastId });
          
          try {
            // Compress before upload for optimization
            const base64Compressed = await compressImage(file, 1024, 1024, 0.8);
            // Convert base64 back to file for Cloudinary upload
            const response = await fetch(base64Compressed);
            const blob = await response.blob();
            const compressedFile = new File([blob], file.name, { type: file.type });

            const downloadURL = await uploadToCloudinary(compressedFile);
            uploadedImageUrls.push(downloadURL);
          } catch (uploadError: any) {
            if (uploadError.message.includes('missing')) {
              toast.error('Image service not configured. Please add keys to .env', { id: toastId });
              return;
            }
            console.warn("Image upload failed, falling back to client-side base64 conversion", uploadError);
            try {
              const base64Data = await compressImage(file, 1024, 1024, 0.7);
              uploadedImageUrls.push(base64Data);
            } catch (err) {
              console.error("Image compression failed", err);
              throw new Error("Could not compress/upload image.");
            }
          }
        }
      } catch (error) {
        console.error("Upload Error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        toast.error(`Failed to process images: ${errorMessage}`, { id: toastId });
        return;
      }
    } else if (imageUrls && imageUrls.length > 0) {
      // If offline, we can't upload to storage, and base64 might be too large for Firestore
      // But we'll try to save it anyway as a last resort if it's small enough
      uploadedImageUrls = imageUrls;
    }

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
      ...(uploadedImageUrls.length > 0 && { imageUrls: uploadedImageUrls }),
      ...(tags && tags.length > 0 && { tags })
    };

    if (isOffline || !db) {
      offlineService.addAction({ type: 'post', payload: newPost });
      setPosts(prev => [newPost, ...prev]);
      setCurrentScreen('dashboard');
      return;
    }
    
    const newPostRef = doc(db, 'posts', newPostId);
    try {
      await setDoc(newPostRef, newPost);
      toast.success("Post created successfully!", { id: toastId });
      setCurrentScreen('dashboard');
    } catch (error) {
      toast.dismiss(toastId);
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
      toast.error("Cannot like while offline. Please check your connection.");
      return;
    }

    // Optimistic Update
    if (isComment) {
      setComments(prev => prev.map(c => {
        if (c.id === id) {
          const isLiked = c.likedBy?.includes(currentUser.id);
          const isDisliked = c.dislikedBy?.includes(currentUser.id);
          let newLikes = c.likes;
          let newDislikes = c.dislikes;
          let newLikedBy = [...(c.likedBy || [])];
          let newDislikedBy = [...(c.dislikedBy || [])];

          if (isLiked) {
            newLikes--;
            newLikedBy = newLikedBy.filter(uid => uid !== currentUser.id);
          } else {
            newLikes++;
            newLikedBy.push(currentUser.id);
            if (isDisliked) {
              newDislikes--;
              newDislikedBy = newDislikedBy.filter(uid => uid !== currentUser.id);
            }
          }
          return { ...c, likes: newLikes, dislikes: newDislikes, likedBy: newLikedBy, dislikedBy: newDislikedBy };
        }
        return c;
      }));
    } else {
      setPosts(prev => prev.map(p => {
        if (p.id === id) {
          const isLiked = p.likedBy?.includes(currentUser.id);
          const isDisliked = p.dislikedBy?.includes(currentUser.id);
          let newLikes = p.likes;
          let newDislikes = p.dislikes;
          let newLikedBy = [...(p.likedBy || [])];
          let newDislikedBy = [...(p.dislikedBy || [])];

          if (isLiked) {
            newLikes--;
            newLikedBy = newLikedBy.filter(uid => uid !== currentUser.id);
          } else {
            newLikes++;
            newLikedBy.push(currentUser.id);
            if (isDisliked) {
              newDislikes--;
              newDislikedBy = newDislikedBy.filter(uid => uid !== currentUser.id);
            }
          }
          return { ...p, likes: newLikes, dislikes: newDislikes, likedBy: newLikedBy, dislikedBy: newDislikedBy };
        }
        return p;
      }));
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
        // Revert optimistic update on error
        // (In a real app, we'd fetch the latest state or revert specifically)
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
      toast.error("Cannot dislike while offline. Please check your connection.");
      return;
    }

    // Optimistic Update
    if (isComment) {
      setComments(prev => prev.map(c => {
        if (c.id === id) {
          const isLiked = c.likedBy?.includes(currentUser.id);
          const isDisliked = c.dislikedBy?.includes(currentUser.id);
          let newLikes = c.likes;
          let newDislikes = c.dislikes;
          let newLikedBy = [...(c.likedBy || [])];
          let newDislikedBy = [...(c.dislikedBy || [])];

          if (isDisliked) {
            newDislikes--;
            newDislikedBy = newDislikedBy.filter(uid => uid !== currentUser.id);
          } else {
            newDislikes++;
            newDislikedBy.push(currentUser.id);
            if (isLiked) {
              newLikes--;
              newLikedBy = newLikedBy.filter(uid => uid !== currentUser.id);
            }
          }
          return { ...c, likes: newLikes, dislikes: newDislikes, likedBy: newLikedBy, dislikedBy: newDislikedBy };
        }
        return c;
      }));
    } else {
      setPosts(prev => prev.map(p => {
        if (p.id === id) {
          const isLiked = p.likedBy?.includes(currentUser.id);
          const isDisliked = p.dislikedBy?.includes(currentUser.id);
          let newLikes = p.likes;
          let newDislikes = p.dislikes;
          let newLikedBy = [...(p.likedBy || [])];
          let newDislikedBy = [...(p.dislikedBy || [])];

          if (isDisliked) {
            newDislikes--;
            newDislikedBy = newDislikedBy.filter(uid => uid !== currentUser.id);
          } else {
            newDislikes++;
            newDislikedBy.push(currentUser.id);
            if (isLiked) {
              newLikes--;
              newLikedBy = newLikedBy.filter(uid => uid !== currentUser.id);
            }
          }
          return { ...p, likes: newLikes, dislikes: newDislikes, likedBy: newLikedBy, dislikedBy: newDislikedBy };
        }
        return p;
      }));
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
      toast.error("Cannot repost while offline. Please check your connection.");
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
    if (currentScreen === 'dashboard' || currentScreen === 'search') {
      scrollPositionRef.current = window.scrollY;
    }
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

  const handleDeletePost = async (id: string) => {
    if (!currentUser || currentUser.role !== 'Administrator' || !db) return;
    
    // Optimistic UI update
    setPosts(prev => prev.filter(p => p.id !== id));
    if (selectedPostId === id) {
      setCurrentScreen('dashboard');
      setSelectedPostId(null);
    }
    
    try {
      await deleteDoc(doc(db, 'posts', id));
      toast.success("Post deleted successfully");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `posts/${id}`);
    }
  };

  const handleUpdateStatus = async (status: Status, message: string) => {
    if (!currentUser || (currentUser.role !== 'Administrator' && currentUser.role !== 'Faculty') || !selectedPostId || !db) return;
    
    const post = posts.find(p => p.id === selectedPostId);
    if (!post) return;
    
    // Check if the previous status was different, if so and message empty, maybe we don't allow it, or it's fine.
    
    const newStatusUpdate: StatusUpdate = {
      status,
      message,
      updaterId: currentUser.id,
      updaterRole: currentUser.role,
      updatedAt: new Date().toISOString()
    };
    
    const postRef = doc(db, 'posts', selectedPostId);
    try {
      await updateDoc(postRef, {
        status,
        statusMessage: message,
        statusHistory: arrayUnion(newStatusUpdate)
      });
      
      // Notify users who commented or are tracking (viewed/liked/reposted)
      // For simplicity, we get users from viewedBy, likedBy, repostedBy, and comment userIds
      const usersToNotify = new Set<string>();
      if (post.userId !== currentUser.id) usersToNotify.add(post.userId);
      post.likedBy?.forEach(uid => uid !== currentUser.id && usersToNotify.add(uid));
      // Add commenters
      comments.filter(c => c.postId === selectedPostId && c.userId !== currentUser.id).forEach(c => usersToNotify.add(c.userId));
      
      for (const uid of Array.from(usersToNotify)) {
         const notifRef = doc(collection(db, 'notifications'));
         await setDoc(notifRef, {
           id: notifRef.id,
           userId: uid,
           type: 'status_update',
           message: `Post "${post.title}" status updated to ${status}`,
           postId: selectedPostId,
           read: false,
           createdAt: new Date().toISOString()
         });
      }
      
      toast.success('Status updated successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${selectedPostId}`);
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

  const displayedPosts = useMemo(() => {
    if (activeTab === 'my' && currentUser) {
      return posts.filter(p => p.userId === currentUser.id);
    }
    if (activeTab === 'track') {
      return [...posts]
        .filter(p => p.status !== 'New')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return posts;
  }, [posts, activeTab, currentUser]);

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
          className="text-5xl font-black text-gradient tracking-tighter mb-6 font-display"
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
          <div className="w-24 h-24 bg-gradient-to-br from-sky-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-sky-500/40 relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            <span className="text-5xl font-black text-white relative z-10 font-display italic">U</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-widest uppercase font-display text-gradient">UniTrack</h1>
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

      <main className="max-w-3xl mx-auto w-full relative">
        {currentScreen === 'dashboard' && (
          <Header activeTab={activeTab} onTabChange={setActiveTab} />
        )}
        <AnimatePresence mode="wait">
          {currentScreen === 'dashboard' && (
            <div className="pt-20 pb-20">
              <Dashboard 
                key="dashboard"
                posts={displayedPosts} 
                users={users} 
                currentUser={activeUser || undefined}
                onPostClick={handlePostClick} 
                onOpenSubmit={() => {
                  if (!activeUser) handleSignIn();
                  else setCurrentScreen('create');
                }}
                onLike={(id) => handleLike(id, false)}
                onDislike={(id) => handleDislike(id, false)}
                onRepost={handleRepost}
                onShare={handleShare}
                onRepostersClick={handleRepostersClick}
                onTagClick={handleTagClick}
                onStatusClick={handleStatusClick}
                onCategoryClick={handleCategoryClick}
                onDeletePost={handleDeletePost}
                isLoading={isInitialSync}
                restoreScrollPosition={() => {
                  window.scrollTo({ top: scrollPositionRef.current, behavior: 'instant' });
                }}
              />
            </div>
          )}
          
          {currentScreen === 'search' && (
            <SearchScreen 
              key="search"
              posts={posts} 
              users={users} 
              currentUser={activeUser || undefined}
              initialQuery={initialSearchQuery}
              onPostClick={handlePostClick} 
              onLike={(id) => handleLike(id, false)}
              onDislike={(id) => handleDislike(id, false)}
              onRepost={handleRepost}
              onShare={handleShare}
              onRepostersClick={handleRepostersClick}
              onTagClick={handleTagClick}
              onStatusClick={handleStatusClick}
              onCategoryClick={handleCategoryClick}
              onDeletePost={handleDeletePost}
              restoreScrollPosition={() => {
                window.scrollTo({ top: scrollPositionRef.current, behavior: 'instant' });
              }}
            />
          )}

          {currentScreen === 'analytics' && (
            <motion.div key="analytics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <AnalyticsDashboard 
                posts={posts} 
                users={users} 
                currentUser={activeUser || undefined}
                onPostClick={handlePostClick} 
                onLike={(id) => handleLike(id, false)}
                onDislike={(id) => handleDislike(id, false)}
                onRepost={handleRepost}
                onShare={handleShare}
                onRepostersClick={handleRepostersClick}
                onTagClick={handleTagClick}
                onDeletePost={handleDeletePost}
              />
            </motion.div>
          )}

          {currentScreen === 'notifications' && activeUser && (
            <motion.div key="notifications" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <NotificationsScreen 
                notifications={notifications} 
                users={users} 
                onNotificationClick={handleNotificationClick}
                onMarkAllRead={handleMarkAllRead}
              />
            </motion.div>
          )}

          {currentScreen === 'profile' && activeUser && (
            <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <ProfileScreen 
                currentUser={activeUser}
                users={users}
                onLogout={() => setShowLogoutConfirm(true)}
                onGenerateDemoPost={async () => {
                  if (!db || !activeUser) return;
                  try {
                    const newPostId = doc(collection(db, 'posts')).id;
                    const now = Date.now();
                    const adminUser = Object.values(users).find(u => u.role === 'Administrator') || activeUser;
                    const demoPost: Post = {
                      id: newPostId,
                      title: "Demo Post: Network Outage in Building A",
                      description: "We are currently experiencing a network outage in Building A. The IT team is investigating the issue. Please use the backup Wi-Fi network in the meantime.",
                      category: "Campus Issues" as any,
                      createdAt: new Date(now - 86400000).toISOString(),
                      userId: activeUser.id,
                      isAnonymous: false,
                      status: "Dev In-Progress",
                      statusMessage: "The network switch has been replaced. We are currently applying configurations before bringing it back online.",
                      statusHistory: [
                         {
                           status: 'Acknowledged',
                           message: 'We have received reports of the outage and are looking into it.',
                           updaterId: adminUser.id,
                           updaterRole: adminUser.role,
                           updatedAt: new Date(now - 70000000).toISOString()
                         },
                         {
                           status: 'Investigating',
                           message: 'The IT team has identified a faulty switch on the 3rd floor. Replacement parts are being sourced.',
                           updaterId: adminUser.id,
                           updaterRole: adminUser.role,
                           updatedAt: new Date(now - 50000000).toISOString()
                         },
                         {
                           status: 'Dev In-Progress',
                           message: "The network switch has been replaced. We are currently applying configurations before bringing it back online.",
                           updaterId: adminUser.id,
                           updaterRole: adminUser.role,
                           updatedAt: new Date(now - 10000000).toISOString()
                         }
                      ],
                      commentCount: 0,
                      likes: 5,
                      dislikes: 0,
                      reposts: 2,
                      views: 42,
                      tags: ["network", "outage", "urgent"],
                    };
                    await setDoc(doc(db, 'posts', newPostId), demoPost);
                    toast.success("Demo post generated successfully!");
                    setCurrentScreen('dashboard');
                  } catch (error) {
                    console.error("Error generating demo post:", error);
                    toast.error("Failed to generate demo post.");
                  }
                }}
              />
            </motion.div>
          )}

          {currentScreen === 'profile' && !activeUser && (
            <motion.div key="profile-login" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <UserIcon className="w-16 h-16 text-slate-700 mb-4" />
              <h2 className="text-xl font-bold text-slate-100 mb-2">Sign in to your account</h2>
              <p className="text-slate-400 mb-6 max-w-sm">Sign in to react, comment, and create your own posts on UniTrack.</p>
              <button 
                onClick={handleSignIn}
                className="bg-sky-500 hover:bg-sky-600 text-white px-6 py-3 rounded-full font-bold transition-colors flex items-center gap-2"
              >
                <LogIn className="w-5 h-5" /> Sign in
              </button>
            </motion.div>
          )}

          {currentScreen === 'detail' && selectedPost && (
            <motion.div key="detail" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <PostDetail 
                post={selectedPost} 
                author={users[selectedPost.userId]} 
                comments={postComments} 
                users={users} 
                currentUser={activeUser || undefined}
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
                onTagClick={handleTagClick}
                onStatusClick={handleStatusClick}
                onUpdateStatus={handleUpdateStatus}
                onCategoryClick={handleCategoryClick}
              />
            </motion.div>
          )}

          {currentScreen === 'create' && currentUser && (
            <motion.div key="create" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <CreatePostScreen
                onBack={() => setCurrentScreen('dashboard')}
                onSubmit={handleCreatePost}
                currentUser={activeUser}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

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

      {/* Bottom Navigation */}
      <nav className={cn(
        "fixed bottom-4 left-4 right-4 max-w-sm mx-auto z-50 flex justify-between items-center bg-slate-900/70 backdrop-blur-3xl border border-white/5 px-4 py-1.5 rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all duration-300 pointer-events-auto",
        currentScreen === 'detail' 
          ? "translate-y-28 sm:translate-y-0" 
          : scrollDirection === 'down' 
            ? "translate-y-28 opacity-0" 
            : "translate-y-0 opacity-100"
      )}>
        <button 
          onClick={() => { 
            setCurrentScreen('dashboard'); 
            setSelectedPostId(null); 
            setHighlightCommentId(null); 
            window.scrollTo({ top: 0, behavior: 'smooth' }); 
          }}
          className={cn(
            "rounded-xl transition-all flex items-center justify-center font-semibold",
            currentScreen === 'dashboard' 
              ? "bg-white/10 text-sky-400 px-3 py-1.5 gap-2 shadow-lg scale-100" 
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5 p-2 w-[40px] h-[40px]"
          )}
        >
          <Home className="w-5 h-5" />
          {currentScreen === 'dashboard' && <span className="text-[11px] font-bold tracking-tight">Home</span>}
        </button>

        <button 
          onClick={() => { setCurrentScreen('search'); setSelectedPostId(null); setHighlightCommentId(null); }}
          className={cn(
            "rounded-xl transition-all flex items-center justify-center font-semibold",
            currentScreen === 'search' 
              ? "bg-white/10 text-sky-400 px-3 py-1.5 gap-2 shadow-lg scale-100" 
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5 p-2 w-[40px] h-[40px]"
          )}
        >
          <Search className="w-5 h-5" />
          {currentScreen === 'search' && <span className="text-[11px] font-bold tracking-tight">Search</span>}
        </button>

        <button 
          onClick={() => { setCurrentScreen('analytics'); setSelectedPostId(null); setHighlightCommentId(null); }}
          className={cn(
            "rounded-xl transition-all flex items-center justify-center font-semibold",
            currentScreen === 'analytics' 
              ? "bg-white/10 text-purple-400 px-3 py-1.5 gap-2 shadow-lg scale-100" 
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5 p-2 w-[40px] h-[40px]"
          )}
        >
          <LayoutDashboard className="w-5 h-5" />
          {currentScreen === 'analytics' && <span className="text-[11px] font-bold tracking-tight">Stats</span>}
        </button>

        <button 
          onClick={() => { 
            if (!activeUser) { handleSignIn(); return; }
            setCurrentScreen('notifications'); 
            setSelectedPostId(null);
            setHighlightCommentId(null);
          }}
          className={cn(
            "rounded-xl transition-all flex items-center justify-center font-semibold relative",
            currentScreen === 'notifications' 
              ? "bg-white/10 text-emerald-400 px-3 py-1.5 gap-2 shadow-lg scale-100" 
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5 p-2 w-[40px] h-[40px]"
          )}
        >
          <Bell className="w-5 h-5" />
          {currentScreen === 'notifications' && <span className="text-[11px] font-bold tracking-tight">Alerts</span>}
          {unreadNotifications > 0 && currentScreen !== 'notifications' && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.7)]" />
          )}
        </button>

        <button 
          onClick={() => { setCurrentScreen('profile'); setSelectedPostId(null); setHighlightCommentId(null); }}
          className={cn(
            "rounded-xl transition-all flex items-center justify-center font-semibold",
            currentScreen === 'profile' 
              ? "bg-white/10 text-pink-400 px-3 py-1.5 gap-2 shadow-lg scale-100" 
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5 p-2 w-[40px] h-[40px]"
          )}
        >
          <UserIcon className="w-5 h-5" />
          {currentScreen === 'profile' && <span className="text-[11px] font-bold tracking-tight">Profile</span>}
        </button>
      </nav>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <Toaster theme="dark" position="top-center" />
    </div>
  );
}
