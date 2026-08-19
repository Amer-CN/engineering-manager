/**
 * KnowledgeCarouselStage — 知识库全屏 3D 轮播舞台（参考项目原版引擎 + 三主题真适配）
 *
 * 本轮按用户拍板重写：以参考项目原版布局为准，不再固定在 bg-black 暗盒。
 *   1. 三主题真适配：舞台容器背景 = 主题 --bg token；卡片主题映射
 *      graphite → dark、sandstone/white → light（原版自带 light 分支，非自造）
 *   2. 壳裁剪：无 WB 头部/新建按钮/看板切换/主题切换；保留原版底部「当前聚焦 +
 *      查看并管理文件夹文档」语义（底部状态条，主题 token 配色）
 *   3. 样式隔离：容器挂 .gc-stage-iso，index.css 内按原版卡片实扫类清单重置
 *      纸面色（石墨黑下纸变黑根因修复）
 *   4. 引擎 = 参考项目 FolderCarousel 原样（含 onFolderClick + 22°/90px 默认值）
 */

import React, { useState } from 'react'
import { Eye } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { FolderCarousel } from './FolderCarousel'
import { DashboardView } from './DashboardView'
import type { ViewMode } from './types'
import type { FolderItem } from './types'

interface KnowledgeCarouselStageProps {
  folders: FolderItem[]
  /** 点击卡片或「查看并管理文件夹文档」→ 打开详情弹窗 */
  onOpenDetail: (folder: FolderItem) => void
  /** 新建文件夹（右上入口，knowledge:create 门控由调用方决定是否传） */
  onAddFolder?: () => void
}

export const KnowledgeCarouselStage: React.FC<KnowledgeCarouselStageProps> = ({
  folders,
  onOpenDetail,
  onAddFolder,
}) => {
  const { scheme } = useTheme()

  // 三主题映射：graphite → dark；sandstone / white → light（原版自带 light 分支）
  const isDark = scheme === 'graphite'

  const [selectedId, setSelectedId] = useState<string | null>(null)
  // 双视图（demo 原版语义）：ambient 轮播 ↔ dashboard 看板
  const [viewMode, setViewMode] = useState<ViewMode>('ambient')

  if (folders.length === 0) return null

  const activeFolder = folders.find((f) => f.id === selectedId) ?? folders[0]

  return (
    <div
      className="gc-stage-iso relative w-full select-none"
      style={{ background: 'var(--bg)' }}
    >
      {/* 背景氛围光：应用自己的柔光色（--accent-soft 随三主题自动变），融合而非照搬 demo 的 emerald —— 接缝修复：背景融为一体 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full blur-[140px]"
          style={{ background: 'var(--accent-soft)' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] rounded-full blur-[160px]"
          style={{ background: 'var(--accent-soft)' }}
        />
      </div>

      <div className="relative min-h-[calc(100vh-3rem)] flex flex-col justify-between">
        {/* 右上工具行（原版头部右侧语义：新建文件夹；主题适配配色） */}
        <div className="relative z-30 flex justify-end gap-3 px-6 sm:px-12 pt-6">
          {onAddFolder && (
            <button
              onClick={onAddFolder}
              className="px-4 py-2.5 rounded-2xl text-xs font-semibold backdrop-blur-md transition-all flex items-center gap-2 border shadow-lg"
              style={{
                background: 'var(--card)',
                borderColor: 'var(--border)',
                color: 'var(--fg)',
              }}
            >
              <span className="text-emerald-500 text-base leading-none">+</span>
              <span>新建文件夹</span>
            </button>
          )}
          <button
            onClick={() => setViewMode(v => v === 'ambient' ? 'dashboard' : 'ambient')}
            className="px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all flex items-center gap-2 border shadow-lg text-white"
            style={{ background: '#10b981', borderColor: '#34d399' }}
          >
            {viewMode === 'ambient' ? '切换至完整工作区 (看板)' : '返回 3D 沉浸视角'}
          </button>
        </div>

        {/* 主区：ambient = 原版轮播 / dashboard = 原版看板（demo 双视图语义） */}
        {viewMode === 'ambient' ? (
          <main className="relative z-20 flex-1 flex flex-col justify-center">
            <FolderCarousel
              folders={folders}
              theme={isDark ? 'dark' : 'light'}
              selectedFolderId={activeFolder.id}
              onSelectFolder={(f) => setSelectedId(f.id)}
              onFolderClick={onOpenDetail}
            />
          </main>
        ) : (
          <main className="relative z-20 flex-1 overflow-auto">
            <DashboardView
              folders={folders}
              selectedFolder={activeFolder}
              onSelectFolder={(f) => setSelectedId(f.id)}
              onOpenFolderDetail={() => onOpenDetail(activeFolder)}
              theme={isDark ? 'dark' : 'light'}
            />
          </main>
        )}

        {/* 底部状态条（原版 footer 语义：当前聚焦 + 查看并管理文件夹文档） */}
        <footer
          className="relative z-30 px-6 sm:px-10 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-3 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: 'var(--accent)', boxShadow: '0 0 12px var(--accent)' }}
            />
            <span style={{ color: 'var(--muted)' }}>当前聚焦:</span>
            <span className="text-sm font-bold" style={{ color: 'var(--fg)' }}>
              {activeFolder.title}
            </span>
            {activeFolder.englishTitle && (
              <span className="font-mono" style={{ color: 'var(--muted)' }}>
                ({activeFolder.englishTitle})
              </span>
            )}
            <span className="font-mono font-semibold" style={{ color: 'var(--accent)' }}>
              {activeFolder.progress}% 完成度
            </span>
          </div>

          <button
            onClick={() => onOpenDetail(activeFolder)}
            className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
          >
            <Eye size={14} />
            查看并管理文件夹文档
          </button>
        </footer>
      </div>
    </div>
  )
}