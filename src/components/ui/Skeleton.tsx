// src/components/ui/Skeleton.tsx
// Lightweight shimmer placeholders for fast perceived performance on slow networks

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={twMerge(
        clsx(
          "animate-pulse rounded-xl bg-slate-200/80",
          className,
        ),
      )}
      {...props}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-24 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-xl" />
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-7 w-32 rounded-lg" />
        <Skeleton className="h-3 w-20 rounded-md" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b border-slate-100">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton className="h-3.5 w-full max-w-[120px] rounded-md" />
        </td>
      ))}
    </tr>
  );
}

export function CardGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-20 rounded-lg" />
            <Skeleton className="h-4 w-28 rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-6 w-3/4 rounded-lg" />
            <Skeleton className="h-4 w-1/2 rounded-md" />
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-6 w-20 rounded-md" />
          </div>
        </div>
      ))}
    </>
  );
}
