/**
 * GlassFolderCard — 文件夹卡容器（3D 玻璃盒）
 *
 * 结构（Z 轴）：后盖板(z=0) + 底封边(rotateX -90°) + 三张纸(z=3/6/9) + 磨砂玻璃前袋(z=10)。
 * 顶部 Tab：128×32 rounded-br-2xl，Folder 图标 + englishTitle。
 * 3D 定位 transform 由引擎直写本容器（.gc-card），本组件只管卡内结构与选中态。
 */

import React from 'react'
import { Folder, Layers } from 'lucide-react'
import type { FolderItem } from './types'
import { GlassFolderPapers } from './GlassFolderPapers'
import { GlassFolderPocket } from './GlassFolderPocket'

interface GlassFolderCardProps {
  folder: FolderItem
  isActive: boolean
  onClick?: () => void
}

export const GlassFolderCard: React.FC<GlassFolderCardProps> = ({ folder, isActive, onClick }) => {
  return (
    <div className="gc-card-inner" onClick={onClick}>
      {/* 1. 后盖板（z=0） */}
      <div className={`gc-back${isActive ? ' gc-back--active' : ''}`}>
        {/* 顶部 Tab 提手 */}
        <div className={`gc-tab${isActive ? ' gc-tab--active' : ''}`}>
          <Folder className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-micro font-mono font-bold tracking-wider uppercase truncate">
            {folder.englishTitle || 'ARCHIVE'}
          </span>
        </div>
        {/* 内部网格纹理 */}
        <div className="gc-back-grid">
          <Layers className="w-12 h-12 text-white/20" />
        </div>
        {/* 袋底阴影（表现 3D 腔体深度） */}
        <div className="gc-back-floor" />
      </div>

      {/* 2. 底部 3D 封边（封闭 Z:0→Z:12 间隙） */}
      <div className={`gc-bottom-seal${isActive ? ' gc-bottom-seal--active' : ''}`} />

      {/* 3. 内部纸张（z=3/6/9，选中扇形展开） */}
      <GlassFolderPapers docs={folder.documents} isActive={isActive} />

      {/* 4. 磨砂玻璃前袋（z=10） */}
      <GlassFolderPocket folder={folder} isActive={isActive} />
    </div>
  )
}
