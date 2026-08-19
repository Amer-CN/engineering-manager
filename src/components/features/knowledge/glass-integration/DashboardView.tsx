import React, { useState } from 'react';
import { Search, Bell, Mail, Plus, Filter, ArrowUpDown } from 'lucide-react';
import { FolderItem } from './types';
import { FolderCarousel } from './FolderCarousel';

interface DashboardViewProps {
  folders: FolderItem[];
  selectedFolder: FolderItem;
  onSelectFolder: (folder: FolderItem) => void;
  onOpenFolderDetail: () => void;
  theme?: 'dark' | 'light';
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  folders,
  selectedFolder,
  onSelectFolder,
  onOpenFolderDetail,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'mine' | 'joined'>('all');

  return (
    <div className={`min-h-screen w-full flex ${isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-[#f4f6fa] text-zinc-800'}`}>
      {/* --- LEFT SIDEBAR NAVIGATION --- */}

      {/* --- CENTER MAIN CONTENT AREA --- */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className={`px-8 py-4 border-b flex items-center justify-between ${isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-zinc-200/80'}`}>
          <div>
            <h1 className="text-xl font-bold tracking-tight">任务管理</h1>
            <p className="text-xs text-zinc-400 mt-0.5">高效规划 · 智能协同 · 结果驱动</p>
          </div>

          {/* Search Input */}
          <div className="flex items-center gap-4">
            <div className={`relative w-72 flex items-center px-3 py-2 rounded-2xl border text-xs ${isDark ? 'bg-zinc-800/60 border-zinc-700 text-white' : 'bg-zinc-100 border-zinc-200 text-zinc-800'}`}>
              <Search className="w-4 h-4 text-zinc-400 mr-2" />
              <input
                type="text"
                placeholder="搜索任务、项目或文件..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none w-full placeholder-zinc-400 text-xs"
              />
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 bg-white/20 rounded border border-zinc-300 dark:border-zinc-700">⌘ K</kbd>
            </div>

            {/* Quick Action Icons */}
            <button className={`p-2 rounded-xl border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-100 border-zinc-200'} relative`}>
              <Bell className="w-4 h-4 text-zinc-500" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500" />
            </button>

            <button className={`p-2 rounded-xl border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-100 border-zinc-200'}`}>
              <Mail className="w-4 h-4 text-zinc-500" />
            </button>

            <button className="px-4 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-lg shadow-emerald-500/25 flex items-center gap-1.5 transition-all">
              <Plus className="w-4 h-4" />
              <span>新增任务</span>
            </button>
          </div>
        </header>

        {/* Workspace Body Grid */}
        <div className="p-8 space-y-6">

          {/* --- 3D GLASS FOLDER INFINITE CAROUSEL CONTAINER SECTION --- */}
          <div className={`p-6 rounded-3xl border ${isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-gradient-to-b from-white to-blue-50/30 border-zinc-200/80 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold">文件夹管理</h2>
                <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl text-xs font-medium">
                  <button onClick={() => setActiveTab('all')} className={`px-3 py-1 rounded-lg transition-all ${activeTab === 'all' ? 'bg-white dark:bg-zinc-700 shadow-xs font-semibold' : 'text-zinc-500'}`}>
                    全部任务
                  </button>
                  <button onClick={() => setActiveTab('mine')} className={`px-3 py-1 rounded-lg transition-all ${activeTab === 'mine' ? 'bg-white dark:bg-zinc-700 shadow-xs font-semibold' : 'text-zinc-500'}`}>
                    我负责的
                  </button>
                  <button onClick={() => setActiveTab('joined')} className={`px-3 py-1 rounded-lg transition-all ${activeTab === 'joined' ? 'bg-white dark:bg-zinc-700 shadow-xs font-semibold' : 'text-zinc-500'}`}>
                    我参与的
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'}`}>
                  <Filter className="w-3.5 h-3.5 text-zinc-400" />
                  <span>筛选</span>
                </button>
                <button className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'}`}>
                  <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
                  <span>排序</span>
                </button>
              </div>
            </div>

            {/* EMBEDDED 3D GLASS FOLDER INFINITE LOOP CAROUSEL */}
            <FolderCarousel
              folders={folders}
              theme={theme}
              selectedFolderId={selectedFolder.id}
              onSelectFolder={onSelectFolder}
            />
          </div>

          {/* Bottom Timeline Section (Gantt style) */}
          <div className={`p-6 rounded-3xl border ${isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-zinc-200/80 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                <h3 className="text-sm font-bold">项目时间线</h3>
                <span className="text-xs font-mono text-zinc-400">2025年5月</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800">周 ▾</span>
                <span className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800">今天</span>
              </div>
            </div>

            {/* Timeline Progress Bar */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-xs">
                <span className="w-20 font-medium truncate">需求评审</span>
                <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 h-7 rounded-xl relative overflow-hidden flex items-center px-3">
                  <div className="absolute left-[15%] w-[35%] h-5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-lg flex items-center px-2 text-[10px] font-semibold">
                    需求评审会 5.18 - 5.24
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="w-20 font-medium truncate">产品设计</span>
                <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 h-7 rounded-xl relative overflow-hidden flex items-center px-3">
                  <div className="absolute left-[30%] w-[40%] h-5 bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 rounded-lg flex items-center px-2 text-[10px] font-semibold">
                    交互流程设计 5.22 - 6.05
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="w-20 font-medium truncate">开发实现</span>
                <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 h-7 rounded-xl relative overflow-hidden flex items-center px-3">
                  <div className="absolute left-[45%] w-[42%] h-5 bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/30 rounded-lg flex items-center px-2 text-[10px] font-semibold">
                    核心功能开发 5.26 - 6.15
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* --- RIGHT INSPECTION / AI INSIGHTS DRAWER --- */}
    </div>
  );
};
