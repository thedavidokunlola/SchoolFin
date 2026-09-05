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
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={twMerge(
        clsx(
          "flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 transition-all",
          compact ? "p-6" : "p-10 sm:p-14",
          className,
        ),
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center text-[#2B35AF] mb-4">
        {icon}
      </div>

      <h3 className="text-base font-bold tracking-tight text-slate-900">
        {title}
      </h3>

      <p className="text-xs text-slate-500 max-w-md mt-1.5 leading-relaxed">
        {description}
      </p>

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
          {actionLabel && onAction && (
            <Button
              type="button"
              variant="accent"
              size="sm"
              onClick={onAction}
              className="gap-2 shadow-xs"
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
              className="text-slate-700 bg-white"
            >
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
