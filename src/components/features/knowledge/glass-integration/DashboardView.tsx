import React, { useState } from 'react';
import {
  Search,
  Bell,
  Mail,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Filter,
  ArrowUpDown,
  UserCheck,
  CalendarDays,
  Tag,
  Sparkles
} from 'lucide-react';
import { FolderItem } from './types';
import { FolderCarousel } from './FolderCarousel';

interface DashboardViewProps {
  folders: FolderItem[];
  selectedFolder: FolderItem;
  onSelectFolder: (folder: FolderItem) => void;
  onOpenFolderDetail: () => void;
  theme?: 'dark' | 'light';
  /** 返回 3D 沉浸视角（塞进 header 右侧，不占新高度） */
  onBackToAmbient?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  folders,
  selectedFolder,
  onSelectFolder,
  onOpenFolderDetail,
  onBackToAmbient,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'mine' | 'joined'>('all');

  return (
    <div className={`min-h-screen w-full flex ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>
      {/* --- CENTER MAIN CONTENT AREA --- */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className={`px-8 py-4 border-b flex items-center justify-between ${isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-zinc-200/80'}`}>
          <div>
            <h1 className="text-xl font-bold tracking-tight">知识库</h1>
            <p className="text-xs text-zinc-400 mt-0.5">文件夹 · 文档 · 检索</p>
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
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[color:var(--gc-active)]" />
            </button>

            <button className={`p-2 rounded-xl border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-100 border-zinc-200'}`}>
              <Mail className="w-4 h-4 text-zinc-500" />
            </button>

            <button className="px-4 py-2 rounded-2xl bg-[color:var(--gc-active)] hover:bg-[color:var(--gc-active-deep)] text-[color:var(--gc-active-ink)] text-xs font-semibold shadow-lg shadow-black/25 flex items-center gap-1.5 transition-colors">
              <Plus className="w-4 h-4" />
              <span>新增任务</span>
            </button>
            {onBackToAmbient && (
              <button
                onClick={onBackToAmbient}
                className="px-4 py-2 rounded-2xl bg-[color:var(--gc-active)] hover:bg-[color:var(--gc-active-deep)] text-[color:var(--gc-active-ink)] text-xs font-semibold shadow-lg shadow-black/25 flex items-center gap-1.5 transition-colors"
              >
                返回 3D 沉浸视角
              </button>
            )}
          </div>
        </header>

        {/* Workspace Body Grid */}
        <div className="p-8 space-y-6">
          {/* Metric Stats Header Cards (4 Top Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-5 rounded-3xl border flex items-center justify-between ${isDark ? 'bg-zinc-900/70 border-zinc-800' : 'bg-white border-zinc-200/80 shadow-sm'}`}>
              <div>
                <div className="text-xs text-zinc-400 font-medium">今日待办</div>
                <div className="text-2xl font-bold font-sans mt-1">12 <span className="text-xs font-normal text-zinc-400">项任务</span></div>
                <div className="text-[11px] text-[color:var(--gc-active)] font-medium flex items-center gap-1 mt-2">
                  <TrendingUp className="w-3 h-3" />
                  <span>较昨日 ↑ 20%</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className={`p-5 rounded-3xl border flex items-center justify-between ${isDark ? 'bg-zinc-900/70 border-zinc-800' : 'bg-white border-zinc-200/80 shadow-sm'}`}>
              <div>
                <div className="text-xs text-zinc-400 font-medium">进行中</div>
                <div className="text-2xl font-bold font-sans mt-1">28 <span className="text-xs font-normal text-zinc-400">项任务</span></div>
                <div className="text-[11px] text-[color:var(--gc-active)] font-medium flex items-center gap-1 mt-2">
                  <TrendingUp className="w-3 h-3" />
                  <span>较昨日 ↑ 8%</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[color:var(--gc-a20)] text-[color:var(--gc-active)] flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            <div className={`p-5 rounded-3xl border flex items-center justify-between ${isDark ? 'bg-zinc-900/70 border-zinc-800' : 'bg-white border-zinc-200/80 shadow-sm'}`}>
              <div>
                <div className="text-xs text-zinc-400 font-medium">已完成</div>
                <div className="text-2xl font-bold font-sans mt-1">56 <span className="text-xs font-normal text-zinc-400">项任务</span></div>
                <div className="text-[11px] text-[color:var(--gc-active)] font-medium flex items-center gap-1 mt-2">
                  <TrendingUp className="w-3 h-3" />
                  <span>较昨日 ↑ 15%</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            <div className={`p-5 rounded-3xl border flex items-center justify-between ${isDark ? 'bg-zinc-900/70 border-zinc-800' : 'bg-white border-zinc-200/80 shadow-sm'}`}>
              <div>
                <div className="text-xs text-zinc-400 font-medium">逾期任务</div>
                <div className="text-2xl font-bold font-sans mt-1">3 <span className="text-xs font-normal text-zinc-400">项任务</span></div>
                <div className="text-[11px] text-[color:var(--gc-active)] font-medium flex items-center gap-1 mt-2">
                  <TrendingDown className="w-3 h-3" />
                  <span>较昨日 ↓ 40%</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* --- 3D GLASS FOLDER INFINITE CAROUSEL CONTAINER SECTION --- */}
          <div className={`py-4 rounded-3xl border overflow-hidden ${isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-gradient-to-b from-white to-blue-50/30 border-zinc-200/80 shadow-sm'}`}>
            <div className="flex items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold">任务看板 (3D 文件夹归档)</h2>
                <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl text-xs font-medium">
                  <button onClick={() => setActiveTab('all')} className={`px-3 py-1 rounded-lg transition-[background-color,color,box-shadow] ${activeTab === 'all' ? 'bg-white dark:bg-zinc-700 shadow-xs font-semibold text-zinc-800' : 'text-zinc-500'}`}>
                    全部任务
                  </button>
                  <button onClick={() => setActiveTab('mine')} className={`px-3 py-1 rounded-lg transition-[background-color,color,box-shadow] ${activeTab === 'mine' ? 'bg-white dark:bg-zinc-700 shadow-xs font-semibold text-zinc-800' : 'text-zinc-500'}`}>
                    我负责的
                  </button>
                  <button onClick={() => setActiveTab('joined')} className={`px-3 py-1 rounded-lg transition-[background-color,color,box-shadow] ${activeTab === 'joined' ? 'bg-white dark:bg-zinc-700 shadow-xs font-semibold text-zinc-800' : 'text-zinc-500'}`}>
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
                <div className="w-1.5 h-4 bg-[color:var(--gc-active)] rounded-full" />
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
                  <div className="absolute left-[15%] w-[35%] h-5 bg-[color:var(--gc-a20)] text-[color:var(--gc-active-deep)] dark:text-[color:var(--gc-icon)] border border-[color:var(--gc-a30)] rounded-lg flex items-center px-2 text-[10px] font-semibold">
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
      <aside className={`w-80 flex-shrink-0 border-l p-6 space-y-6 ${isDark ? 'bg-zinc-900/90 border-zinc-800' : 'bg-white border-zinc-200/80'}`}>
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Sparkles className="w-4 h-4 text-[color:var(--gc-active)]" />
            <span>智能详情</span>
          </div>
          <Search className="w-4 h-4 text-zinc-400 cursor-pointer" />
        </div>

        {/* Selected Task Detail Card */}
        <div className="space-y-4">
          <div className="text-[10px] font-mono text-zinc-400">WXB-2025-001</div>

          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base">{selectedFolder.documents[0]?.title || selectedFolder.title}</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[color:var(--gc-a20)] text-[color:var(--gc-active)] font-semibold border border-[color:var(--gc-a30)]">
              高优先级
            </span>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            {selectedFolder.description || '与业务团队对齐需求范围，明确核心目标与验收标准，输出需求评审结论。'}
          </p>

          <div className="space-y-2.5 pt-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5" /> 负责人</span>
              <span className="font-medium">Brandon</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-400 flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> 所属项目</span>
              <span className="font-medium">WenXiBuddy 2.0</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-400 flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> 截止时间</span>
              <span className="font-medium font-mono">2025-05-24 18:00</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-400">当前进度</span>
              <span className="font-medium text-[color:var(--gc-active)] font-mono">{selectedFolder.progress}%</span>
            </div>
          </div>
        </div>

        {/* AI Assistant Recommendations Box */}
        <div className={`p-4 rounded-2xl border space-y-3 ${isDark ? 'bg-zinc-800/40 border-[color:var(--gc-a30)]' : 'bg-[color:var(--gc-a10)] border-[color:var(--gc-soft-border)]'}`}>
          <div className="flex items-center gap-2 text-xs font-bold text-[color:var(--gc-active-deep)] dark:text-[color:var(--gc-icon)]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI 助手建议</span>
          </div>

          <ul className="text-xs text-zinc-600 dark:text-zinc-300 space-y-2 list-disc list-inside">
            <li>建议关联相似历史评审文档 3 份</li>
            <li>检测到潜在风险：需求范围可能变更</li>
          </ul>

          <button
            onClick={onOpenFolderDetail}
            className="w-full py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
          >
            查看建议详情与完整文档
          </button>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
          <button
            onClick={onOpenFolderDetail}
            className="w-full py-2.5 rounded-2xl bg-[color:var(--gc-active)] hover:bg-[color:var(--gc-active-deep)] text-[color:var(--gc-active-ink)] font-semibold text-xs shadow-md shadow-black/20 transition-colors"
          >
            编辑任务与文件夹文件
          </button>
        </div>
      </aside>
    </div>
  );
};
