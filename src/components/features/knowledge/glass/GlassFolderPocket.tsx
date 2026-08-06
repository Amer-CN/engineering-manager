/**
 * GlassFolderPocket — 磨砂玻璃前袋（Z: 10px 悬浮腔体）
 *
 * 常态：slate 深色渐变 + border-white/30，rotateX(-1°)；
 * 选中：emerald 渐变 + border-emerald-300/80，rotateX(-4.5°)（绕底边前倾）。
 * 内容：人数 pill + 进度 pill + 标题 + englishTitle 副行。
 * 材质/渐变走 glassCarousel.css（.gc-pocket），transform 随 isActive 内联切换。
 */

import React from 'react'
import { Users } from 'lucide-react'
import type { FolderItem } from './types'

interface GlassFolderPocketProps {
  folder: FolderItem
  isActive: boolean
}

const POCKET_TRANSFORM = {
  active: 'translate3d(0px, 0px, 10px) rotateX(-4.5deg)',
  idle: 'translate3d(0px, 0px, 10px) rotateX(-1deg)',
} as const

export const GlassFolderPocket: React.FC<GlassFolderPocketProps> = ({ folder, isActive }) => {
  return (
    <div
      className={`gc-pocket${isActive ? ' gc-pocket--active' : ''}`}
      style={{ transform: isActive ? POCKET_TRANSFORM.active : POCKET_TRANSFORM.idle }}
    >
      {/* 底部镜面反射条 + 顶部 2px 高光 */}
      <div className="gc-pocket-rim" />
      <div className="gc-pocket-gloss" />

      {/* 顶行：人数 pill + 进度 pill */}
      <div className="flex items-center justify-between" style={{ transform: 'translate3d(0px, 0px, 4px)' }}>
        <span className={`gc-pill${isActive ? ' gc-pill--active' : ''}`}>
          <Users className="w-3.5 h-3.5" />
          <span className="text-caption font-bold">{folder.memberCount}</span>
        </span>
        <span
          className={`text-caption font-mono font-extrabold px-2 py-0.5 rounded-lg backdrop-blur-md shadow-sm ${
            isActive
              ? 'bg-emerald-950/60 text-emerald-200 border border-emerald-300/40'
              : 'bg-black/30 text-white border border-white/25'
          }`}
        >
          {folder.progress}%
        </span>
      </div>

      {/* 底部：标题 + englishTitle */}
      <div className="mt-auto" style={{ transform: 'translate3d(0px, 0px, 8px)' }}>
        <div
          className={`text-lg font-extrabold tracking-tight truncate transition-colors duration-300 ${
            isActive ? 'text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]' : 'text-slate-100'
          }`}
        >
          {folder.title}
        </div>
        {folder.englishTitle && (
          <div className="text-caption font-mono opacity-80 truncate font-semibold mt-0.5">
            {folder.englishTitle}
          </div>
        )}
      </div>
    </div>
  )
}
