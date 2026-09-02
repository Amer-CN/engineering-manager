/**
 * CarouselDemoPage — 3D 玻璃文件夹轮播演示页（参考项目 1:1 复刻）
 *
 * 原样复制 AI Studio 参考项目（3D Glass Folder Carousel）的完整前端：
 * AmbientView 沉浸轮播 + DashboardView 看板 + 详情/新建弹窗。
 * 纯前端演示，不连后端；引擎为参考项目原版（React state 驱动，无限循环，自动播放默认开）。
 */

import { useState } from 'react'
import { INITIAL_FOLDERS } from './data/folders'
import type { FolderItem, ViewMode, ThemeMode } from './types'
import { AmbientView } from './AmbientView'
import { DashboardView } from './DashboardView'
import { FolderDetailModal } from './FolderDetailModal'
import { AddFolderModal } from './AddFolderModal'

export default function CarouselDemoPage() {
  const [folders, setFolders] = useState<FolderItem[]>(INITIAL_FOLDERS)
  const [selectedFolder, setSelectedFolder] = useState<FolderItem>(INITIAL_FOLDERS[0])
  const [viewMode, setViewMode] = useState<ViewMode>('ambient')
  const [theme, setTheme] = useState<ThemeMode>('dark')
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false)

  const handleUpdateFolder = (updated: FolderItem) => {
    setFolders((prev) => prev.map((f) => (f.id === updated.id ? updated : f)))
    if (selectedFolder.id === updated.id) {
      setSelectedFolder(updated)
    }
  }

  const handleAddFolder = (newFolder: FolderItem) => {
    setFolders((prev) => [newFolder, ...prev])
    setSelectedFolder(newFolder)
  }

  return (
    <div className="w-full min-h-screen font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {viewMode === 'ambient' ? (
        <AmbientView
          folders={folders}
          selectedFolder={selectedFolder}
          onSelectFolder={setSelectedFolder}
          onOpenFolderDetail={() => setIsDetailOpen(true)}
          onSwitchToDashboard={() => setViewMode('dashboard')}
          theme={theme}
          onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          onAddFolder={() => setIsAddModalOpen(true)}
        />
      ) : (
        <DashboardView
          folders={folders}
          selectedFolder={selectedFolder}
          onSelectFolder={setSelectedFolder}
          onOpenFolderDetail={() => setIsDetailOpen(true)}
          theme={theme}
        />
      )}

      {viewMode === 'dashboard' && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2 p-1.5 rounded-full bg-zinc-900/90 text-white border border-white/20 shadow-2xl backdrop-blur-xl text-xs font-semibold">
          <button
            onClick={() => setViewMode('ambient')}
            className="px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-md transition-colors flex items-center gap-1.5"
          >
            <span>返回 3D 沉浸海报视角</span>
          </button>

          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            title="切换明暗主题"
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
        </div>
      )}

      <FolderDetailModal
        folder={selectedFolder}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onUpdateFolder={handleUpdateFolder}
        theme={theme}
      />

      <AddFolderModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddFolder={handleAddFolder}
        theme={theme}
      />
    </div>
  )
}
