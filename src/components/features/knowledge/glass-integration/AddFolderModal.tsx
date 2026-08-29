import React, { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';
import { FolderItem } from './types';

interface AddFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddFolder: (folder: FolderItem) => void;
  theme?: 'dark' | 'light';
}

export const AddFolderModal: React.FC<AddFolderModalProps> = ({
  isOpen,
  onClose,
  onAddFolder,
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';
  const [title, setTitle] = useState('');
  const [englishTitle, setEnglishTitle] = useState('');
  const [period, setPeriod] = useState('2025 · Q3');
  const [category] = useState('项目规划');
  const [description, setDescription] = useState('');
  const [progress, setProgress] = useState(50);
  const [memberCount, setMemberCount] = useState(3);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newFolder: FolderItem = {
      id: `folder-${Date.now()}`,
      title: title.trim(),
      englishTitle: englishTitle.trim() || undefined,
      period: period.trim() || '2025 · Q3',
      category: category.trim() || '通用文件夹',
      description: description.trim() || '用户自定义新建文件夹',
      progress,
      memberCount,
      highlightColor: 'emerald',
      documents: [
        {
          id: `doc-${Date.now()}-1`,
          title: `${title.trim()} 初始文件`,
          code: `WXB-2025-${Math.floor(100 + Math.random() * 900)}`,
          priority: '高',
          status: '进行中',
          date: new Date().toLocaleDateString(),
          assignee: 'Brandon',
        },
      ],
    };

    onAddFolder(newFolder);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fadeIn">
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className={`
          relative z-10 w-full max-w-md rounded-3xl p-6 md:p-8
          shadow-2xl border backdrop-blur-2xl transition-all duration-300 space-y-5
          ${isDark ? 'bg-zinc-900/90 border-white/20 text-white' : 'bg-white/95 border-white/80 text-zinc-900'}
        `}
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2 font-bold text-lg">
            <FolderPlus className="w-5 h-5 text-[color:var(--gc-icon)]" />
            <span>新建 3D 玻璃文件夹</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/10 hover:bg-white/20">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-zinc-400 mb-1 font-medium">文件夹名称 (中文)</label>
            <input
              type="text"
              placeholder="例如: 智能合约"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className={`w-full p-3 rounded-xl border outline-none text-xs font-medium ${isDark ? 'bg-zinc-800 border-white/20 text-white' : 'bg-zinc-50 border-zinc-300'}`}
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-medium">英文名称 (可选)</label>
            <input
              type="text"
              placeholder="例如: Smart Contracts"
              value={englishTitle}
              onChange={(e) => setEnglishTitle(e.target.value)}
              className={`w-full p-3 rounded-xl border outline-none text-xs font-medium ${isDark ? 'bg-zinc-800 border-white/20 text-white' : 'bg-zinc-50 border-zinc-300'}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1 font-medium">周期 / 时间轴</label>
              <input
                type="text"
                placeholder="2025 · Q3"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className={`w-full p-3 rounded-xl border outline-none text-xs ${isDark ? 'bg-zinc-800 border-white/20 text-white' : 'bg-zinc-50 border-zinc-300'}`}
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">成员数量</label>
              <input
                type="number"
                min="1"
                max="20"
                value={memberCount}
                onChange={(e) => setMemberCount(parseInt(e.target.value) || 1)}
                className={`w-full p-3 rounded-xl border outline-none text-xs ${isDark ? 'bg-zinc-800 border-white/20 text-white' : 'bg-zinc-50 border-zinc-300'}`}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-zinc-400 mb-1 font-medium">
              <span>初始完成进度</span>
              <span className="font-mono text-[color:var(--gc-icon)]">{progress}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => setProgress(parseInt(e.target.value))}
              className="w-full accent-[color:var(--gc-active)] cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-medium">文件夹说明</label>
            <textarea
              rows={2}
              placeholder="描述该文件夹的主要文档内容或项目目标..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full p-3 rounded-xl border outline-none text-xs ${isDark ? 'bg-zinc-800 border-white/20 text-white' : 'bg-zinc-50 border-zinc-300'}`}
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border text-zinc-400 hover:text-white"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[color:var(--gc-active)] hover:bg-[color:var(--gc-active-deep)] text-[color:var(--gc-active-ink)] font-semibold shadow-lg shadow-black/30"
            >
              创建并加入循环
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
