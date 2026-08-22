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

  // 三态活动灯：暗灰=空文件夹 / 常亮=7天无变动 / 呼吸=7天内有增删改
  const docCount = folder.docCount ?? folder.memberCount ?? 0
  const hasActivity =
    docCount > 0 &&
    folder.lastActivityAt != null &&
    Date.now() - new Date(folder.lastActivityAt).getTime() < 7 * 24 * 3600 * 1000
  const lampState: 'empty' | 'active' | 'idle' = docCount === 0 ? 'empty' : hasActivity ? 'active' : 'idle'

  return (
    <div
      onClick={onClick}
      className={`
        group relative cursor-pointer select-none
        w-[200px] md:w-[216px] p-4 rounded-2xl
        transition-all duration-300 ease-out
        hover:scale-105 hover:-translate-y-1
        ${
          isDark
            ? 'bg-zinc-900/80 border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl text-white'
            : 'bg-white/80 border border-white/80 shadow-[0_20px_40px_rgba(0,0,0,0.08)] backdrop-blur-xl text-zinc-900'
        }
      `}
    >
      <style>{`@keyframes gcLampBreathe { 0%,100% { opacity: .35; transform: scale(.85) } 50% { opacity: 1; transform: scale(1.15) } }`}</style>

      {/* Top Gloss Highlight */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent rounded-t-2xl" />

      {/* Internal Emerald Glow gradient patch */}
      <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-[color:var(--gc-a20,#10b98133)] rounded-full blur-2xl pointer-events-none" />

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
            <span>{docCount}</span>
            <span className="text-lg text-zinc-400 font-normal">篇</span>
          </div>
        </div>

        {/* 三态活动灯：空=暗灰 / 活=呼吸 / 在架=常亮（数据：docCount + lastActivityAt） */}
        <div
          className="relative flex items-center justify-center"
          title={lampState === 'empty' ? '空文件夹' : lampState === 'active' ? '近期有文档变动' : '档案在架'}
        >
          {lampState === 'active' && (
            <div
              className="absolute w-4 h-4 rounded-full"
              style={{
                background: 'var(--gc-icon-a50, #34d39980)',
                animation: 'gcLampBreathe 2.4s ease-in-out infinite',
              }}
            />
          )}
          <div
            className="w-3.5 h-3.5 rounded-full border-2 border-zinc-900"
            style={{
              background:
                lampState === 'empty'
                  ? 'var(--muted, #71717a)'
                  : 'var(--gc-icon, #34d399)',
              boxShadow:
                lampState === 'empty'
                  ? 'none'
                  : '0 0 12px var(--gc-icon, #34d399)',
              opacity: lampState === 'idle' ? 0.75 : 1,
            }}
          />
        </div>
      </div>
    </div>
  );
};
