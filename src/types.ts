export type Role = 'Admin' | 'Student';
export type Status = 'New' | 'Acknowledged' | 'Investigating' | 'Dev In-Progress' | 'Resolved' | 'Reopened';
export type Category = 'Academics' | 'Campus Issues' | 'Suggestions' | 'Lost' | 'Found' | 'Opportunities';

export interface User {
  id: string;
  username: string;
  profilePicUrl?: string;
  role: Role;
  batch?: string;
  usernameChanged?: boolean;
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
  viewedBy?: string[];
  likedBy?: string[];
  dislikedBy?: string[];
  repostedBy?: string[];
  originalPostId?: string;
  lastRepostedAt?: string;
  imageUrl?: string;
  imageUrls?: string[];
  tags?: string[];
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
  likedBy?: string[];
  dislikedBy?: string[];
}

export interface AppNotification {
  id: string;
  userId: string;
  type: 'pin' | 'announcement' | 'reaction' | 'comment' | 'trending';
  message: string;
  postId?: string;
  commentId?: string;
  read: boolean;
  createdAt: string;
}
