import React, { useState } from 'react';
import { X, Plus, FileText, CheckCircle2, Users, Trash2, Calendar } from 'lucide-react';
import { FolderItem, DocumentItem } from './types';

interface FolderDetailModalProps {
  folder: FolderItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateFolder: (updated: FolderItem) => void;
  theme?: 'dark' | 'light';
  /** 只读模式（真实库无状态字段）：隐藏 新建文件/删除/状态勾选编辑 */
  readonly?: boolean;
}

export const FolderDetailModal: React.FC<FolderDetailModalProps> = ({
  folder,
  isOpen,
  onClose,
  onUpdateFolder,
  theme = 'dark',
  readonly: isReadonly = false,
}) => {
  const isDark = theme === 'dark';
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocCode, setNewDocCode] = useState('');
  const [newDocPriority, setNewDocPriority] = useState<'高' | '中' | '低'>('中');
  const [isAddingDoc, setIsAddingDoc] = useState(false);

  if (!isOpen || !folder) return null;

  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim()) return;

    const newDoc: DocumentItem = {
      id: `doc-${Date.now()}`,
      title: newDocTitle.trim(),
      code: newDocCode.trim() || `WXB-2025-0${folder.documents.length + 10}`,
      priority: newDocPriority,
      status: '进行中',
      date: new Date().toLocaleDateString(),
      assignee: 'Brandon',
    };

    const updatedFolder: FolderItem = {
      ...folder,
      documents: [newDoc, ...folder.documents],
    };

    onUpdateFolder(updatedFolder);
    setNewDocTitle('');
    setNewDocCode('');
    setIsAddingDoc(false);
  };

  const handleToggleDocStatus = (docId: string) => {
    const updatedDocs = folder.documents.map((d) => {
      if (d.id === docId) {
        const nextStatus: FolderItem['documents'][number]['status'] = d.status === '已完成' ? '进行中' : '已完成';
        return { ...d, status: nextStatus };
      }
      return d;
    });

    // Recalculate progress percentage
    const completedCount = updatedDocs.filter((d) => d.status === '已完成').length;
    const newProgress = updatedDocs.length > 0 ? Math.round((completedCount / updatedDocs.length) * 100) : folder.progress;

    onUpdateFolder({
      ...folder,
      documents: updatedDocs,
      progress: newProgress,
    });
  };

  const handleDeleteDoc = (docId: string) => {
    const updatedDocs = folder.documents.filter((d) => d.id !== docId);
    onUpdateFolder({
      ...folder,
      documents: updatedDocs,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm p-4 sm:p-6 animate-fadeIn">
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Slide-over Glass Drawer */}
      <div
        className={`
          relative z-10 w-full max-w-xl h-full max-h-[90vh] rounded-3xl p-6 md:p-8
          flex flex-col shadow-2xl overflow-y-auto border backdrop-blur-2xl transition-colors duration-300
          ${
            isDark
              ? 'bg-zinc-900/90 border-white/20 text-white'
              : 'bg-white/95 border-white/80 text-zinc-900'
          }
        `}
      >
        {/* Top Header */}
        <div className="flex items-start justify-between pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[color:var(--gc-a20)] text-[color:var(--gc-icon)] border border-[color:var(--gc-a30)]">
                {folder.category}
              </span>
              <span className="text-xs font-mono text-zinc-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {folder.period}
              </span>
            </div>

            <h2 className="text-2xl font-bold tracking-tight flex items-baseline gap-2">
              <span>{folder.title}</span>
              {folder.englishTitle && (
                <span className="text-sm font-mono text-zinc-400">({folder.englishTitle})</span>
              )}
            </h2>

            {folder.description && (
              <p className="text-xs text-zinc-400 mt-2 max-w-md">{folder.description}</p>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Folder Stats Overview Bar */}
        <div className="grid grid-cols-3 gap-3 my-6">
          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-zinc-800/50 border-white/10' : 'bg-zinc-50 border-zinc-200'}`}>
            <div className="text-xs text-zinc-400 mb-1">当前完成度</div>
            <div className="text-2xl font-bold font-mono text-[color:var(--gc-icon)]">{folder.progress}%</div>
            <div className="w-full bg-zinc-700/50 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-[color:var(--gc-icon)] h-full rounded-full transition-transform duration-500" style={{ transformOrigin: 'left', width: '100%', transform: `scaleX(${folder.progress / 100})` }} />
            </div>
          </div>

          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-zinc-800/50 border-white/10' : 'bg-zinc-50 border-zinc-200'}`}>
            <div className="text-xs text-zinc-400 mb-1">包含文档</div>
            <div className="text-2xl font-bold font-mono">{folder.documents.length}</div>
            <div className="text-[10px] text-zinc-500 mt-1">关联知识库</div>
          </div>

          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-zinc-800/50 border-white/10' : 'bg-zinc-50 border-zinc-200'}`}>
            <div className="text-xs text-zinc-400 mb-1">协作成员</div>
            <div className="text-2xl font-bold font-mono flex items-center gap-1">
              <Users className="w-5 h-5 text-[color:var(--gc-icon)]" />
              <span>{folder.memberCount}</span>
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">项目组成员</div>
          </div>
        </div>

        {/* Document List Header & Add Button */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-[color:var(--gc-icon)]" />
            <span>项目关键文件 / 任务 (Documents)</span>
          </h3>

          {!isReadonly && (
            <button
              onClick={() => setIsAddingDoc(!isAddingDoc)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新建文件</span>
            </button>
          )}
        </div>

        {/* Inline New Document Form */}
        {!isReadonly && isAddingDoc && (
          <form onSubmit={handleAddDocument} className={`p-4 rounded-2xl border mb-4 space-y-3 ${isDark ? 'bg-zinc-800/70 border-emerald-500/40' : 'bg-emerald-50 border-emerald-200'}`}>
            <div className="text-xs font-semibold text-emerald-400">添加新文件到 [{folder.title}]</div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="文件/需求名称 (例如: 原型设计规范)"
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                required
                className={`p-2 rounded-xl text-xs border outline-none ${isDark ? 'bg-zinc-900 border-white/20' : 'bg-white border-zinc-300'}`}
              />
              <input
                type="text"
                placeholder="编号 (如 WXB-2025-099)"
                value={newDocCode}
                onChange={(e) => setNewDocCode(e.target.value)}
                className={`p-2 rounded-xl text-xs border outline-none ${isDark ? 'bg-zinc-900 border-white/20' : 'bg-white border-zinc-300'}`}
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-zinc-400">优先级:</span>
                {(['高', '中', '低'] as const).map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setNewDocPriority(p)}
                    className={`px-2 py-0.5 rounded text-[10px] ${newDocPriority === p ? 'bg-emerald-500 text-white' : 'bg-zinc-700/50 text-zinc-400'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingDoc(false)}
                  className="px-3 py-1 rounded text-xs text-zinc-400 hover:text-white"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 rounded text-xs bg-emerald-500 text-white hover:bg-emerald-600"
                >
                  保存
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Document Items List */}
        <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
          {folder.documents.map((doc) => {
            const isCompleted = doc.status === '已完成';
            return (
              <div
                key={doc.id}
                className={`
                  p-3.5 rounded-2xl border flex items-center justify-between transition-colors group
                  ${
                    isDark
                      ? 'bg-zinc-800/40 hover:bg-zinc-800/80 border-white/10'
                      : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  {isReadonly ? (
                    <CheckCircle2
                      className={`w-5 h-5 ${isCompleted ? 'text-[color:var(--gc-icon)]' : 'text-zinc-500'}`}
                    />
                  ) : (
                    <button
                      onClick={() => handleToggleDocStatus(doc.id)}
                      className={`p-1 rounded-full transition-colors ${isCompleted ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-mono px-1.5 py-0.2 rounded text-[10px] ${isDark ? 'bg-white/10 text-zinc-300' : 'bg-zinc-200 text-zinc-700'}`}>
                        {doc.code}
                      </span>
                      <span className={`text-xs font-medium ${isCompleted ? 'line-through text-zinc-500' : ''}`}>
                        {doc.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-zinc-400 mt-1">
                      <span>负责人: {doc.assignee}</span>
                      <span>•</span>
                      <span>截止: {doc.date}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isReadonly && (
                    <span
                      className={`
                        text-[10px] px-2 py-0.5 rounded-full font-medium
                        ${
                          doc.priority === '高'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : doc.priority === '中'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-zinc-500/20 text-zinc-400'
                        }
                      `}
                    >
                      {doc.priority}优先级
                    </span>
                  )}

                  {!isReadonly && (
                    <button
                      onClick={() => handleDeleteDoc(doc.id)}
                      className="p-1 rounded text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="删除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {folder.documents.length === 0 && (
            <div className="text-center py-12 text-zinc-500 text-xs">
              {isReadonly ? '该文件夹下暂无文档。' : '该文件夹下暂无文件，点击上方“新建文件”添加。'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
