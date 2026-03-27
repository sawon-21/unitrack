import React from 'react';
import { Skeleton } from './Skeleton';

export function PostSkeleton() {
  return (
    <div className="border-b border-slate-800 p-4 flex flex-col gap-3">
      <div className="flex gap-3">
        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-4 w-5/6 mb-3" />
          
          <div className="flex gap-2 mb-3">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
          
          <div className="flex justify-between mt-2">
            <Skeleton className="h-6 w-10" />
            <Skeleton className="h-6 w-10" />
            <Skeleton className="h-6 w-10" />
            <Skeleton className="h-6 w-10" />
            <Skeleton className="h-6 w-10" />
          </div>
        </div>
      </div>
    </div>
  );
}
