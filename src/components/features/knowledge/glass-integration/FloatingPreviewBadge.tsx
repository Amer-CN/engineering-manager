import React from 'react';
import { ArrowRight } from 'lucide-react';
import { FolderItem } from './types';

interface FloatingPreviewBadgeProps {
  folder: FolderItem;
  theme?: 'dark' | 'light';
  onClick?: () => void;
}

export const FloatingPreviewBadge: React.FC<FloatingPreviewBadgeProps> = ({
  folder,
  theme = 'dark',
  onClick,
}) => {
  const isDark = theme === 'dark';

  return (
    <div
      onClick={onClick}
      className={`
        group relative cursor-pointer select-none
        w-[240px] md:w-[260px] p-5 rounded-2xl
        transition-all duration-300 ease-out
        hover:scale-105 hover:-translate-y-1
        ${
          isDark
            ? 'bg-zinc-900/80 border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl text-white'
            : 'bg-white/80 border border-white/80 shadow-[0_20px_40px_rgba(0,0,0,0.08)] backdrop-blur-xl text-zinc-900'
        }
      `}
    >
      {/* Top Gloss Highlight */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent rounded-t-2xl" />

      {/* Internal Emerald Glow gradient patch */}
      <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

      {/* Title & Arrow */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 font-medium text-base tracking-tight truncate pr-2">
          <span>{folder.title}</span>
          {folder.englishTitle && (
            <span className="text-xs opacity-60 font-mono">({folder.englishTitle})</span>
          )}
        </div>
        <div className="p-1.5 rounded-full bg-white/10 dark:bg-white/10 opacity-75 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Subtitle / Period */}
      <div className="text-xs text-zinc-400 dark:text-zinc-400 font-mono mb-4">
        {folder.period}
      </div>

      {/* Progress Metric & Status Dot */}
      <div className="flex items-end justify-between mt-2">
        <div>
          <div className="text-3xl font-light tracking-tight font-sans flex items-baseline gap-0.5">
            <span>{folder.progress}</span>
            <span className="text-lg text-zinc-400 font-normal">%</span>
          </div>
        </div>

        {/* Emerald Glowing Indicator */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-4 h-4 bg-emerald-400/50 rounded-full animate-ping" />
          <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-zinc-900 shadow-[0_0_12px_#34d399]" />
        </div>
      </div>
    </div>
  );
};
