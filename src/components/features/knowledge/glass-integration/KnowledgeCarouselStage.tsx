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
  // 默认 = 完整工作区看板（知识库首页）；3D 沉浸视角为看板内的子页面（用户拍板）
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard')

  if (folders.length === 0) return null

  const activeFolder = folders.find((f) => f.id === selectedId) ?? folders[0]

  return (
    <div
      className="gc-stage-iso relative w-full select-none"
      style={{
        background: 'transparent',
        // 沉浸页高度链（仅 ambient 态）：给 justify-between 确定高度，3D 区垂直铺满整页。
        // 看板态绝不加高度——f56b069 两态同加导致看板塌陷成细条、被整笔回滚的教训
        ...(viewMode === 'ambient' ? { height: 'calc(100vh - 84px)' } : {}),
      }}
    >
      {/* 零背景（用户拍板）：无任何氛围光/光晕——3D 文件夹直接悬浮在应用背景上 */}

      <div className={`relative flex flex-col justify-between ${viewMode === 'ambient' ? 'h-full' : ''}`}>
        {/* 右上工具行：仅 3D 沉浸视角显示（看板态不占高度——用户指正，同 footer 规则）。
            看板态的返回入口由 DashboardView header 上的按钮承接（Stage 传 onBackToAmbient） */}
        {viewMode === 'ambient' && (
          <div className="relative z-30 flex justify-end gap-3 px-6 sm:px-12">
            {onAddFolder && (
              <button
                onClick={onAddFolder}
                className="px-4 py-2.5 rounded-2xl text-xs font-semibold backdrop-blur-md transition-all flex items-center gap-2 border shadow-lg"
                style={{
                  background: 'var(--card)',
                  color: 'var(--fg)',
                }}
              >
                <span className="text-emerald-500 text-base leading-none">+</span>
                <span>新建文件夹</span>
              </button>
            )}
            <button
              onClick={() => setViewMode('dashboard')}
              className="px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all flex items-center gap-2 border shadow-lg text-white"
              style={{ background: '#10b981', borderColor: '#34d399' }}
            >
              切换至完整工作区 (看板)
            </button>
          </div>
        )}

        {/* 主区：ambient = 原版轮播 / dashboard = 原版看板（demo 双视图语义） */}
        {viewMode === 'ambient' ? (
          <main className="relative z-20 flex-1 flex flex-col min-h-0">
            <FolderCarousel
              folders={folders}
              theme={isDark ? 'dark' : 'light'}
              selectedFolderId={activeFolder.id}
              onSelectFolder={(f) => setSelectedId(f.id)}
              onFolderClick={onOpenDetail}
              fillHeight
            />
          </main>
        ) : (
          <main className="relative z-20 flex-1 overflow-auto">
            <DashboardView
              folders={folders}
              selectedFolder={activeFolder}
              onSelectFolder={(f) => setSelectedId(f.id)}
              onOpenFolderDetail={() => onOpenDetail(activeFolder)}
              onBackToAmbient={() => setViewMode('ambient')}
              theme={isDark ? 'dark' : 'light'}
            />
          </main>
        )}

        {/* 底部状态条：仅 3D 沉浸视角显示（看板态不渲染不占高度——用户指正） */}
        {viewMode === 'ambient' && (
        <footer
          className="relative z-30 px-6 sm:px-10 py-2 flex flex-col sm:flex-row items-center justify-between gap-3"
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
        )}
      </div>
    </div>
  )
}