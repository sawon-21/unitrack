import React, { useState, useEffect } from 'react';
import { ArrowLeft, EyeOff, Image as ImageIcon, Eye, Edit3, X, Hash } from 'lucide-react';
import { Category, Post, User } from '../types';
import { motion } from 'framer-motion';
import { PostCard } from './PostCard';
import { compressImage } from '../utils/imageUtils';

interface CreatePostScreenProps {
  onBack: () => void;
  onSubmit: (title: string, description: string, category: Category, isAnonymous: boolean, imageUrls?: string[], tags?: string[], imageFiles?: File[]) => void;
  currentUser: User;
}

export function CreatePostScreen({ onBack, onSubmit, currentUser }: CreatePostScreenProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('Academics');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingImages, setIsProcessingImages] = useState(false);

  // Load draft from localStorage on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('postDraft');
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed.title) setTitle(parsed.title);
        if (parsed.description) setDescription(parsed.description);
        if (parsed.category) setCategory(parsed.category);
        if (parsed.isAnonymous !== undefined) setIsAnonymous(parsed.isAnonymous);
        if (parsed.imageUrls) setImageUrls(parsed.imageUrls);
        // Note: imageFiles cannot be restored from localStorage easily
        if (parsed.tags) {
          setTags(parsed.tags);
          setTagsInput(parsed.tags.map((t: string) => `#${t}`).join(' '));
        }
      } catch (e) {
        console.error("Failed to parse draft", e);
      }
    }
  }, []);

  // Save draft to localStorage on change
  useEffect(() => {
    const draft = { title, description, category, isAnonymous, imageUrls, tags };
    try {
      localStorage.setItem('postDraft', JSON.stringify(draft));
    } catch (e) {
      console.warn('Failed to save draft to localStorage, possibly due to quota exceeded:', e);
    }
  }, [title, description, category, isAnonymous, imageUrls, tags]);

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTagsInput(value);
    
    // Parse tags by space or comma, allowing multiple separators
    const parsedTags = value.split(/[\s,]+/).filter(t => t.trim() !== '').map(t => t.replace(/^#/, '').toLowerCase());
    // Remove duplicates
    const uniqueTags = Array.from(new Set(parsedTags));
    setTags(uniqueTags);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(
        title, 
        description, 
        category, 
        isAnonymous, 
        imageUrls.length > 0 ? imageUrls : undefined,
        tags.length > 0 ? tags : undefined,
        imageFiles.length > 0 ? imageFiles : undefined
      );
      // Clear draft after successful submit
      localStorage.removeItem('postDraft');
    } finally {
      setIsSubmitting(false);
    }
  };

  const processFiles = (files: File[]) => {
    if (files.length === 0) return;
    setIsProcessingImages(true);
    
    // Keep original files for upload
    setImageFiles(prev => [...prev, ...files]);

    let processedCount = 0;
    files.forEach(async file => {
      try {
        const dataUrl = await compressImage(file, 1024, 1024, 0.7);
        setImageUrls(prev => [...prev, dataUrl]);
      } catch (error) {
        console.error("Failed to process image preview", error);
      } finally {
        processedCount++;
        if (processedCount === files.length) {
          setIsProcessingImages(false);
        }
      }
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    processFiles(files);
  };

  const removeImage = (index: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index));
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Mock post for preview
  const previewPost: Post = {
    id: 'preview-id',
    title: title || 'Untitled Post',
    description: description || 'No description provided.',
    category: category,
    createdAt: new Date().toISOString(),
    userId: currentUser.id,
    isAnonymous: isAnonymous,
    status: 'New',
    commentCount: 0,
    likes: 0,
    dislikes: 0,
    reposts: 0,
    views: 0,
    imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    tags: tags.length > 0 ? tags : undefined,
  };

  return (
    <div className="flex flex-col h-screen bg-black animate-in slide-in-from-right-4 duration-300 relative">
      <header className="absolute top-0 left-0 right-0 z-10 bg-black/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-900 rounded-full transition-colors text-slate-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-slate-100">Create Post</h1>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-1">
          <button
            onClick={() => setIsPreviewMode(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${!isPreviewMode ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Edit3 className="w-4 h-4" /> Edit
          </button>
          <button
            onClick={() => setIsPreviewMode(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isPreviewMode ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Eye className="w-4 h-4" /> Preview
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pt-16 pb-24">
        {isPreviewMode ? (
          <div className="max-w-2xl mx-auto p-4">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Live Preview</h2>
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-black">
              <PostCard 
                post={previewPost} 
                author={currentUser} 
                currentUser={currentUser}
                onClick={() => {}}
                onLike={() => {}}
                onDislike={() => {}}
                onRepost={() => {}}
                onShare={() => {}}
              />
            </div>
          </div>
        ) : (
          <form id="create-post-form" onSubmit={handleSubmit} className="max-w-2xl mx-auto p-4 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-100 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
              >
                <option value="Academics">Academics</option>
                <option value="Campus Issues">Campus Issues</option>
                <option value="Suggestions">Suggestions</option>
                <option value="Lost">Lost</option>
                <option value="Found">Found</option>
                <option value="Opportunities">Opportunities</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
              <input 
                type="text" 
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="E.g., problem with website opening"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Description (Markdown Supported)</label>
              <textarea 
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your problem in detail... You can use **bold**, *italics*, etc. Links will automatically become buttons."
                rows={6}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <Hash className="w-4 h-4" /> Tags (Optional)
              </label>
              <input 
                type="text" 
                value={tagsInput}
                onChange={handleTagsChange}
                placeholder="e.g. #exam #help #urgent (space or comma separated)"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
              />
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag, idx) => (
                    <span key={idx} className="text-xs text-sky-400 bg-sky-400/10 px-2 py-1 rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" /> Images (Optional)
              </label>
              <div 
                className={`w-full border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging ? 'border-sky-500 bg-sky-500/10' : 'border-slate-700 hover:border-slate-500 bg-slate-950'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <ImageIcon className="w-10 h-10 mx-auto mb-3 text-slate-500" />
                <p className="text-sm text-slate-400 mb-3">Drag and drop images here, or</p>
                <label className="cursor-pointer inline-block bg-slate-800 hover:bg-slate-700 text-slate-200 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
                  Browse Files
                  <input 
                    type="file" 
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-slate-500 mt-3">Images are uploaded in original high quality.</p>
              </div>
              {imageUrls.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {imageUrls.map((url, index) => (
                    <div key={index} className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950 relative group aspect-square">
                      <img 
                        src={url} 
                        alt={`Preview ${index + 1}`} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-500/80 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-5 bg-slate-950 rounded-lg border border-slate-800">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${isAnonymous ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-slate-400'}`}>
                  <EyeOff className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-medium text-slate-200">Post Anonymously</p>
                  <p className="text-sm text-slate-500">Hide your identity from other students</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                />
                <div className="w-14 h-7 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-sky-500"></div>
              </label>
            </div>
          </form>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-slate-800 p-4 z-20">
        <div className="max-w-2xl mx-auto flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onBack}
            className="px-6 py-2.5 rounded-lg font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit"
            form="create-post-form"
            disabled={!title.trim() || !description.trim() || isSubmitting || isProcessingImages}
            className="px-6 py-2.5 rounded-lg font-bold bg-sky-500 hover:bg-sky-600 text-white transition-colors shadow-lg shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Posting...
              </>
            ) : isProcessingImages ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing Images...
              </>
            ) : (
              'Submit Post'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
