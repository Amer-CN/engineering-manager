import React from 'react';
import { Monitor, Sun, Moon, Plus, Eye, ChevronRight } from 'lucide-react';
import { FolderItem } from './types';
import { FolderCarousel } from './FolderCarousel';

interface AmbientViewProps {
  folders: FolderItem[];
  selectedFolder: FolderItem;
  onSelectFolder: (folder: FolderItem) => void;
  onOpenFolderDetail: () => void;
  onSwitchToDashboard: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onAddFolder: () => void;
}

export const AmbientView: React.FC<AmbientViewProps> = ({
  folders,
  selectedFolder,
  onSelectFolder,
  onOpenFolderDetail,
  onSwitchToDashboard,
  theme,
  onToggleTheme,
  onAddFolder,
}) => {
  const isDark = theme === 'dark';

  return (
    <div
      className={`
        relative min-h-screen w-full flex flex-col justify-between overflow-hidden transition-colors duration-500 select-none
        ${isDark ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-900'}
      `}
    >
      {/* --- BACKGROUND AMBIENT LIGHT REFLECTIONS --- */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top-left subtle spotlight */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px]" />
        {/* Center emerald glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] bg-emerald-500/15 rounded-full blur-[160px]" />
        {/* Dark vignette gradient overlay */}
        <div className={`absolute inset-0 ${isDark ? 'bg-gradient-to-b from-black/80 via-transparent to-black' : 'bg-gradient-to-b from-zinc-100/50 via-transparent to-zinc-200/50'}`} />
      </div>

      {/* --- TOP NAVIGATION BAR --- */}
      <header className="relative z-30 px-6 sm:px-12 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-emerald-500/40">
            WB
          </div>
          <div>
            <div className="font-bold text-lg tracking-tight flex items-center gap-2">
              <span>3D 玻璃拟态文件夹</span>
              <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                无限循环滚动
              </span>
            </div>
            <div className="text-xs text-zinc-400 font-mono">3D Glassmorphic CoverFlow Carousel</div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={onAddFolder}
            className={`
              px-4 py-2.5 rounded-2xl text-xs font-semibold backdrop-blur-md transition-all flex items-center gap-2 border shadow-lg
              ${
                isDark
                  ? 'bg-zinc-900/80 border-white/20 text-white hover:bg-zinc-800'
                  : 'bg-white/90 border-white text-zinc-900 hover:bg-white'
              }
            `}
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>新建文件夹</span>
          </button>

          <button
            onClick={onSwitchToDashboard}
            className="px-4 py-2.5 rounded-2xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 transition-all flex items-center gap-2"
          >
            <Monitor className="w-4 h-4" />
            <span>切换至完整工作区 (看板)</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onToggleTheme}
            className={`
              p-2.5 rounded-2xl border backdrop-blur-md transition-all shadow-lg
              ${isDark ? 'bg-zinc-900/80 border-white/20 text-white' : 'bg-white/90 border-white text-zinc-900'}
            `}
            title="切换高对比黑夜 / 白昼模式"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          </button>
        </div>
      </header>

      {/* --- MAIN 3D INFINITE CAROUSEL AREA --- */}
      <main className="relative z-20 flex-1 flex flex-col justify-center my-auto">
        <FolderCarousel
          folders={folders}
          theme={theme}
          selectedFolderId={selectedFolder.id}
          onSelectFolder={onSelectFolder}
        />
      </main>

      {/* --- BOTTOM ACTION BAR & ACTIVE FOLDER PREVIEW SUMMARY --- */}
      <footer className="relative z-30 px-6 sm:px-12 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399] animate-pulse" />
          <div className="text-xs">
            <span className="text-zinc-400">当前聚焦: </span>
            <span className="font-bold text-sm ml-1">{selectedFolder.title}</span>
            {selectedFolder.englishTitle && (
              <span className="text-zinc-500 font-mono ml-1.5">({selectedFolder.englishTitle})</span>
            )}
            <span className="ml-3 font-mono text-emerald-400 font-semibold">{selectedFolder.progress}% 完成度</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenFolderDetail}
            className={`
              px-5 py-2.5 rounded-2xl text-xs font-semibold backdrop-blur-md transition-all flex items-center gap-2 border shadow-lg
              ${
                isDark
                  ? 'bg-zinc-900/90 border-white/20 text-white hover:bg-zinc-800'
                  : 'bg-white/90 border-white text-zinc-900 hover:bg-white'
              }
            `}
          >
            <Eye className="w-4 h-4 text-emerald-400" />
            <span>查看并管理文件夹文档</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
