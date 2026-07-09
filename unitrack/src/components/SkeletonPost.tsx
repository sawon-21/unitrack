import React from 'react';

export function SkeletonPost() {
  return (
    <div className="bg-slate-900 border-b border-slate-800 p-4 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-slate-800 rounded-full" />
        <div className="flex-1">
          <div className="h-4 bg-slate-800 rounded w-1/4 mb-2" />
          <div className="h-3 bg-slate-800 rounded w-1/6" />
        </div>
      </div>
      <div className="h-6 bg-slate-800 rounded w-3/4 mb-3" />
      <div className="h-4 bg-slate-800 rounded w-full mb-2" />
      <div className="h-4 bg-slate-800 rounded w-5/6 mb-4" />
      <div className="flex justify-between">
        <div className="h-8 bg-slate-800 rounded w-16" />
        <div className="h-8 bg-slate-800 rounded w-16" />
        <div className="h-8 bg-slate-800 rounded w-16" />
        <div className="h-8 bg-slate-800 rounded w-16" />
      </div>
    </div>
  );
}
