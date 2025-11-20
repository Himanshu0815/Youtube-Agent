import React from 'react';

export const LoadingSkeleton = () => {
  return (
    <div className="w-full max-w-5xl mx-auto mt-8 animate-pulse">
      {/* Title Skeleton */}
      <div className="mb-8 text-center space-y-4">
        <div className="h-8 bg-gray-800 rounded-lg w-1/3 mx-auto"></div>
        <div className="h-1 w-24 bg-gray-800 mx-auto rounded-full"></div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex flex-wrap justify-center gap-4 mb-8">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-10 w-32 bg-gray-800 rounded-full"></div>
        ))}
      </div>

      {/* Card Skeleton */}
      <div className="bg-yt-card border border-gray-800 rounded-xl p-8 min-h-[400px]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-6 h-6 bg-gray-800 rounded"></div>
          <div className="h-6 w-48 bg-gray-800 rounded"></div>
        </div>
        
        <div className="space-y-4">
          <div className="h-4 bg-gray-800 rounded w-full"></div>
          <div className="h-4 bg-gray-800 rounded w-11/12"></div>
          <div className="h-4 bg-gray-800 rounded w-full"></div>
          <div className="h-4 bg-gray-800 rounded w-4/5"></div>
          <div className="h-4 bg-gray-800 rounded w-full"></div>
          <div className="h-4 bg-gray-800 rounded w-3/4"></div>
        </div>
      </div>
    </div>
  );
};
