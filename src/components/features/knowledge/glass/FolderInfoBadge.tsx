/**
 * FolderInfoBadge — 悬浮信息卡（轮播左上角，展示当前聚焦文件夹）
 *
 * M2 纯展示：标题 + englishTitle + 右上圆形箭头 + period 副行 + 大字号进度%
 * + emerald 呼吸绿点 + 内嵌光斑。点击不接动作（M2 决策，M3 接详情跳转）。
 * 材质走 glassCarousel.css（.gc-badge / .gc-dot-live）。
 */

import React from 'react'
import { ArrowRight } from 'lucide-react'
import type { FolderItem } from './types'

interface FolderInfoBadgeProps {
  folder: FolderItem
}

export const FolderInfoBadge: React.FC<FolderInfoBadgeProps> = ({ folder }) => {
  return (
    <div className="gc-badge">
      {/* 顶部高光 + 内嵌 emerald 光斑 */}
      <div className="gc-badge-gloss" />
      <div className="gc-badge-glow" />

      {/* 标题 + 右上圆形箭头（纯展示） */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 font-medium text-base tracking-tight truncate pr-2">
          <span>{folder.title}</span>
          {folder.englishTitle && (
            <span className="text-caption opacity-60 font-mono">({folder.englishTitle})</span>
          )}
        </div>
        <div className="p-1.5 rounded-full bg-white/10 opacity-75">
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* period 副行（等宽） */}
      <div className="text-micro text-slate-400 font-mono mb-4">{folder.period}</div>

      {/* 进度大数字 + emerald 呼吸绿点（progress 为空时隐藏数字块，M3 补强 ⑤） */}
      <div className="flex items-end justify-between mt-2">
        {folder.progress != null && (
          <div className="text-3xl font-light tracking-tight flex items-baseline gap-0.5">
            <span>{folder.progress}</span>
            <span className="text-lg text-slate-400 font-normal">%</span>
          </div>
        )}
        <div className="relative flex items-center justify-center ml-auto">
          <div className="gc-dot-live" />
        </div>
      </div>
    </div>
  )
}
