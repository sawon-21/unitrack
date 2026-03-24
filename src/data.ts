import { User, Post, Comment, Notification } from './types';

export const currentUser: User = {
  id: 'admin1',
  name: 'Admin User',
  username: 'admin_official',
  profilePicUrl: 'https://i.pravatar.cc/150?u=admin1',
  role: 'Admin'
};

export const adminUser: User = currentUser;

export const users: Record<string, User> = {
  'u1': { id: 'u1', name: 'Student User', username: 'student1', profilePicUrl: 'https://i.pravatar.cc/150?u=u1', role: 'Student', batch: 'batch-12' },
  'u2': { id: 'u2', name: 'Wasifa Fatima', username: 'wasifa_f', profilePicUrl: 'https://i.pravatar.cc/150?u=u2', role: 'Student', batch: 'batch-11' },
  'u3': { id: 'u3', name: 'Md. Abdullah Baki', username: 'abdullah_b', profilePicUrl: 'https://i.pravatar.cc/150?u=u3', role: 'Student', batch: 'batch-10' },
  'u4': { id: 'u4', name: 'Imtiyas Uddin', username: 'imtiyas_u', profilePicUrl: 'https://i.pravatar.cc/150?u=u4', role: 'Student', batch: 'batch-12' },
  'u5': { id: 'u5', name: 'AB. MD. FAISAL RAHMAN', username: 'faisal_r', profilePicUrl: 'https://i.pravatar.cc/150?u=u5', role: 'Student', batch: 'batch-11' },
  'admin1': adminUser
};

export const initialPosts: Post[] = [
  {
    id: 'p0',
    title: '📢 University Portal Maintenance Notice',
    description: 'The university portal will be down for scheduled maintenance this Sunday from 2 AM to 6 AM. Please plan your assignment submissions accordingly.',
    category: 'Announcement',
    createdAt: '2026-02-18T12:00:00Z',
    userId: 'admin1',
    isAnonymous: false,
    status: 'Acknowledged',
    commentCount: 0,
    isPinned: true,
    likes: 125,
    dislikes: 0,
    reposts: 12,
    views: 1200
  },
  {
    id: 'p1',
    title: 'problem with website opening',
    description: 'ami module 9 r coding ta korar por github e page create korsilam but page ta ashtese na... help please..',
    category: 'Course Help',
    createdAt: '2026-02-18T10:00:00Z',
    userId: 'u2',
    isAnonymous: false,
    status: 'New',
    commentCount: 2,
    likes: 5,
    dislikes: 0,
    reposts: 0,
    views: 45
  },
  {
    id: 'p2',
    title: 'marks related',
    description: 'assignment 11 a amar marks asheni ekhono, kobe ashte pare?',
    category: 'Admin Post',
    createdAt: '2026-02-17T14:30:00Z',
    userId: 'u4',
    isAnonymous: false,
    status: 'Reopened',
    commentCount: 5,
    likes: 12,
    dislikes: 0,
    reposts: 2,
    views: 340
  },
  {
    id: 'p3',
    title: 'Library fine issue',
    description: 'I returned the book on time but still got a fine. Can someone check?',
    category: 'Admin Post',
    createdAt: '2026-02-16T09:15:00Z',
    userId: 'u3',
    isAnonymous: true,
    status: 'Resolved',
    commentCount: 1,
    likes: 8,
    dislikes: 0,
    reposts: 1,
    views: 150
  }
];

export const initialComments: Comment[] = [
  {
    id: 'c1',
    postId: 'p2',
    userId: 'u5',
    text: 'assignment 11 এ ৪২ লাগবে',
    createdAt: '2026-02-17T15:00:00Z',
    likes: 2,
    dislikes: 0
  },
  {
    id: 'c2',
    postId: 'p2',
    userId: 'admin1',
    text: 'We are looking into this issue. Please be patient.',
    createdAt: '2026-02-17T16:00:00Z',
    likes: 15,
    dislikes: 0
  },
  {
    id: 'c3',
    postId: 'p2',
    userId: 'u4',
    text: 'Thank you for the update.',
    createdAt: '2026-02-17T16:30:00Z',
    replyToCommentId: 'c2',
    likes: 1,
    dislikes: 0
  }
];

export const initialNotifications: Notification[] = [
  {
    id: 'n1',
    userId: 'admin1',
    type: 'reaction',
    message: 'student1 liked your post',
    postId: 'p0',
    read: false,
    createdAt: new Date().toISOString()
  }
];
