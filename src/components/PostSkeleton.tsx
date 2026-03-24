import React from 'react';

export function PostSkeleton() {
  return (
    <div className="border-b border-slate-800 p-4 flex flex-col gap-3 animate-pulse">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-800 shrink-0"></div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-4 bg-slate-800 rounded w-24"></div>
            <div className="h-3 bg-slate-800 rounded w-12"></div>
          </div>
          <div className="h-5 bg-slate-800 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-slate-800 rounded w-full mb-1"></div>
          <div className="h-4 bg-slate-800 rounded w-5/6 mb-3"></div>
          
          <div className="flex gap-2 mb-3">
            <div className="h-5 bg-slate-800 rounded w-16"></div>
            <div className="h-5 bg-slate-800 rounded w-20"></div>
          </div>
          
          <div className="flex justify-between mt-2">
            <div className="h-6 bg-slate-800 rounded w-10"></div>
            <div className="h-6 bg-slate-800 rounded w-10"></div>
            <div className="h-6 bg-slate-800 rounded w-10"></div>
            <div className="h-6 bg-slate-800 rounded w-10"></div>
            <div className="h-6 bg-slate-800 rounded w-10"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
