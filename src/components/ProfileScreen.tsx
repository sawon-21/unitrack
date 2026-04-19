import React, { useRef, useState } from 'react';
import { User } from '../types';
import { Avatar } from './Avatar';
import { Settings, LogOut, BadgeCheck, Camera, Loader2 } from 'lucide-react';
import { cn } from '../utils';
import { useScrollDirection } from '../hooks/useScrollDirection';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { compressImage } from '../utils/imageUtils';
import { uploadToCloudinary } from '../utils/cloudinaryUtils';

interface ProfileScreenProps {
  currentUser: User;
  users: Record<string, User>;
  onLogout?: () => void;
  onGenerateDemoPost?: () => void;
}

export function ProfileScreen({ currentUser, users, onLogout, onGenerateDemoPost }: ProfileScreenProps) {
  const scrollDirection = useScrollDirection();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading('Uploading profile picture...');

    try {
      if (!db) throw new Error('Database not initialized');

      let downloadURL = '';

      try {
        // Compress before upload for optimization
        const base64Compressed = await compressImage(file, 400, 400, 0.8);
        // Convert base64 back to file for Cloudinary
        const response = await fetch(base64Compressed);
        const blob = await response.blob();
        const compressedFile = new File([blob], file.name, { type: file.type });

        downloadURL = await uploadToCloudinary(compressedFile);
      } catch (uploadError: any) {
        if (uploadError.message.includes('missing')) {
           toast.error('Image service not configured. Please add keys to .env', { id: toastId });
           return;
        }
        console.warn('Image upload failed, falling back to base64 string', uploadError);
        // Fallback to purely base64
        downloadURL = await compressImage(file, 200, 200, 0.8);
      }

      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, { profilePicUrl: downloadURL });
      
      toast.success('Profile picture updated!', { id: toastId });
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      toast.error('Failed to update profile picture', { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="pb-20 animate-in fade-in duration-200">
      <header className={cn(
        "fixed top-0 left-0 right-0 z-50 flex justify-center items-center px-4 pt-4 pb-2 drop-shadow-xl transition-transform duration-300 pointer-events-none",
        scrollDirection === 'down' ? "-translate-y-[150%] opacity-0" : "translate-y-0 opacity-100"
      )}>
        <h1 className="font-bold text-slate-100 bg-slate-900/60 backdrop-blur-xl border border-white/5 px-6 py-2 rounded-full shadow-2xl pointer-events-auto uppercase tracking-widest text-[10px]">Profile</h1>
      </header>

      <div className="p-6 border-b border-slate-800 flex flex-col items-center pt-20">
        <div className="relative mb-4 group cursor-pointer" onClick={() => !isUploading && fileInputRef.current?.click()}>
          <Avatar user={currentUser} username={currentUser.username} className="w-24 h-24 text-3xl transition-opacity group-hover:opacity-70" />
          <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            {isUploading ? <Loader2 className="w-8 h-8 text-white animate-spin" /> : <Camera className="w-8 h-8 text-white" />}
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageChange} 
            accept="image/*" 
            className="hidden" 
          />
        </div>
        
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-2xl font-bold text-slate-100">@{currentUser.username}</h2>
          {(currentUser.role === 'Administrator' || currentUser.role === 'Faculty') && (
            <BadgeCheck className="w-6 h-6 text-white fill-[#1877F2]" />
          )}
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-slate-900 rounded-full text-xs font-bold text-slate-300 border border-slate-800">
            {currentUser.role}
          </span>
          {currentUser.batch && (
            <span className="px-3 py-1 bg-slate-900 rounded-full text-xs font-bold text-slate-300 border border-slate-800">
              {currentUser.batch}
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Settings</h3>
        <div className="space-y-2">
          <button className="w-full flex items-center justify-between p-4 bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors border border-slate-800 text-slate-300">
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-slate-400" />
              <span className="font-medium">Account Preferences</span>
            </div>
          </button>
          {currentUser.role === 'Administrator' && onGenerateDemoPost && (
            <button 
              onClick={onGenerateDemoPost}
              className="w-full flex items-center justify-between p-4 bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors border border-slate-800 text-sky-400"
            >
              <div className="flex items-center gap-3">
                <BadgeCheck className="w-5 h-5" />
                <span className="font-medium">Generate Demo Post</span>
              </div>
            </button>
          )}
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-between p-4 bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors border border-slate-800 text-red-400"
          >
            <div className="flex items-center gap-3">
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Log Out</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
