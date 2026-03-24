export type Role = 'Admin' | 'Student';
export type Status = 'New' | 'Acknowledged' | 'Investigating' | 'Dev In-Progress' | 'Resolved' | 'Reopened';
export type Category = 'Course Help' | 'Admin Post' | 'Announcement';

export interface User {
  id: string;
  name: string;
  username: string;
  profilePicUrl: string;
  role: Role;
  batch?: string;
}

export interface Post {
  id: string;
  title: string;
  description: string;
  category: Category;
  createdAt: string;
  userId: string;
  isAnonymous: boolean;
  status: Status;
  commentCount: number;
  isPinned?: boolean;
  likes: number;
  dislikes: number;
  reposts: number;
  views: number;
  isLiked?: boolean;
  isDisliked?: boolean;
  isReposted?: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  text: string;
  createdAt: string;
  replyToCommentId?: string;
  likes: number;
  dislikes: number;
  isLiked?: boolean;
  isDisliked?: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'pin' | 'announcement' | 'reaction' | 'comment' | 'trending';
  message: string;
  postId?: string;
  commentId?: string;
  read: boolean;
  createdAt: string;
}
