"use client";

// src/components/ui/EmptyState.tsx
// Reusable modern EmptyState component for zero-data states and onboarding guidance

import React from "react";
import { Button } from "@/components/ui/Button";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  children?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  children,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={twMerge(
        clsx(
          "flex flex-col items-center justify-center text-center rounded-3xl border border-dashed border-slate-200 bg-gradient-to-b from-slate-50/70 to-white/90 shadow-xs transition-all",
          compact ? "p-6 sm:p-8" : "p-10 sm:p-14",
          className,
        ),
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-center text-[#2B35AF] mb-4.5 transition-transform hover:scale-105 duration-200">
        {icon}
      </div>

      <h3 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
        {title}
      </h3>

      <p className="text-xs sm:text-sm text-slate-500 max-w-md mt-1.5 leading-relaxed">
        {description}
      </p>

      {children && <div className="mt-4 w-full flex justify-center">{children}</div>}

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          {actionLabel && onAction && (
            <Button
              type="button"
              variant="accent"
              size="sm"
              onClick={onAction}
              className="gap-2 shadow-xs bg-[#2B35AF] hover:bg-[#1E257A] text-white rounded-xl px-4 py-2 font-bold"
            >
              {actionLabel}
            </Button>
          )}

          {secondaryActionLabel && onSecondaryAction && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSecondaryAction}
              className="text-slate-700 bg-white border-slate-200 hover:bg-slate-50 rounded-xl px-4 py-2 font-semibold"
            >
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

