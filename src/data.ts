import { User, Post, Comment, AppNotification } from './types';

export const currentUser: User = {
  id: 'admin1',
  username: 'admin_official',
  role: 'Admin'
};

export const users: Record<string, User> = {};
export const initialPosts: Post[] = [];
export const initialComments: Comment[] = [];
export const initialNotifications: Notification[] = [];
