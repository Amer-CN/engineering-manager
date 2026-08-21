import React from 'react';
import { Users, FileText, Folder, Layers } from 'lucide-react';
import { FolderItem } from './types';

interface GlassFolderCardProps {
  folder: FolderItem;
  isActive: boolean;
  theme?: 'dark' | 'light';
  onClick?: () => void;
  index: number;
  rotateY?: number;
  rotateX?: number;
  offset?: number;
}

export const GlassFolderCard: React.FC<GlassFolderCardProps> = ({
  folder,
  isActive,
  theme = 'dark',
  onClick,
  rotateY = -26,
  offset = 0,
}) => {
  const isDark = theme === 'dark';

  // 连续聚焦因子：0=完全偏离中心 1=正中。纸张/前袋动画由它逐帧插值驱动，
  // 与轮播位置共用同一条运动曲线（替代 isActive 布尔触发的独立 500ms CSS 时钟）
  const af = Math.max(0, 1 - Math.abs(offset));
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  // Guarantee 3 rich document items for internal paper stack
  const docs = folder.documents.length >= 3 ? folder.documents : [
    { id: 'd1', title: '核心 Loop 算法重构说明', code: 'DOC-2025-01', priority: '高' as const, status: '进行中' as const, date: '2025-05-20', assignee: 'David' },
    { id: 'd2', title: '系统架构与逻辑隔离方案', code: 'DOC-2025-02', priority: '中' as const, status: '已完成' as const, date: '2025-05-22', assignee: 'Alex' },
    { id: 'd3', title: '安全合规与数据归档报告', code: 'DOC-2025-03', priority: '低' as const, status: '未开始' as const, date: '2025-05-25', assignee: 'Elena' },
  ];

  return (
    <div
      onClick={onClick}
      className={`
        relative group cursor-pointer select-none
        w-[230px] sm:w-[245px] h-[305px] sm:h-[320px]
        flex-shrink-0 transition-all duration-300 ease-out
        ${isActive ? 'scale-[1.03]' : 'hover:scale-[1.015]'}
      `}
      style={{
        transformStyle: 'preserve-3d',
      }}
    >
      {/* =========================================================================
          1. BACK COVER PANEL (后盖板 - Z: 0px Base) - Solid Physical Backing
         ========================================================================= */}
      <div
        className={`
          absolute inset-0 rounded-[22px] border-2 overflow-hidden
          transition-colors duration-300 shadow-xl flex flex-col justify-between
          ${
            isActive
              ? 'bg-gradient-to-br from-emerald-800 via-emerald-900 to-emerald-950 border-emerald-400/80 shadow-emerald-950/60'
              : isDark
              ? 'bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950 border-zinc-600/60 shadow-black/90 group-hover:border-zinc-500'
              : 'bg-gradient-to-br from-white via-zinc-100 to-zinc-200 border-zinc-300 shadow-zinc-400/40'
          }
        `}
        style={{
          transform: 'translate3d(0px, 0px, 0px)',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Top Tab Notch */}
        <div
          className={`
            absolute top-0 left-0 w-32 h-8 rounded-br-2xl border-r border-b flex items-center px-3 gap-1.5
            ${
              isActive
                ? 'bg-emerald-700 border-emerald-500 text-white'
                : isDark
                ? 'bg-zinc-800 border-zinc-700 text-white/90'
                : 'bg-zinc-100 border-zinc-300 text-zinc-800'
            }
          `}
        >
          <Folder className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase truncate">
            {folder.englishTitle || 'ARCHIVE'}
          </span>
        </div>

        {/* Inner Back Wall Grid / Texture */}
        <div className="absolute inset-x-4 top-12 bottom-4 border border-dashed border-white/10 rounded-xl pointer-events-none opacity-20 flex items-center justify-center">
          <Layers className="w-12 h-12 text-white/20" />
        </div>

        {/* Deep Pocket Internal Floor Shadow (暗色袋底阴影 - 表现 3D 腔体深度) */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 via-black/10 to-transparent pointer-events-none rounded-b-[20px]" />
      </div>

      {/* =========================================================================
          2. SOLID INSET BOTTOM FLOOR (底部精准 3D 封底 - 封闭 Z:0 到 Z:12px 间隙)
             Inset-x-6 keeps it strictly inside the 22px rounded corner bounds!
             Closes the bottom gap completely when viewed from side angles without any 3D protrusion artifacts.
         ========================================================================= */}
      <div
        className={`
          absolute inset-x-6 bottom-0 pointer-events-none overflow-hidden z-0
          ${
            isActive
              ? 'bg-emerald-950 border-t border-emerald-400/40'
              : isDark
              ? 'bg-zinc-900 border-t border-white/20'
              : 'bg-zinc-300 border-t border-zinc-400'
          }
        `}
        style={{
          height: '12px',
          transformOrigin: 'bottom center',
          transform: 'rotateX(-90deg)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/10 pointer-events-none" />
      </div>

      {/* =========================================================================
          3. INTERNAL PAPER DOCUMENTS (内部阶梯展开的纸张 - Full Length Paper Stack)
             Placing papers neatly tucked deep inside the 12px folder pocket!
             When active, papers fan out dramatically upwards and sideways!
         ========================================================================= */}
      <div
        className="absolute inset-x-3.5 top-7 bottom-2 pointer-events-none z-10"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* --- PAPER SHEET 3 (Backmost Document - Z: 3px) --- */}
        <div
          className={`
            absolute top-0 inset-x-2.5 h-[250px] rounded-xl p-3 bg-zinc-200 text-zinc-800
            border-t-2 border-l-2 border-b-2 border-r-2 border-t-white border-l-white border-b-zinc-400 border-r-zinc-400
            flex flex-col justify-between overflow-hidden shadow-md
          `}
          style={{
            transform: `translate3d(${lerp(0, -8, af)}px, ${lerp(16, -24, af)}px, 3px) rotate(${lerp(0, -4, af)}deg)`,
          }}
        >
          <div>
            {/* Top Index Tag for Paper 3 */}
            <div className="flex items-center justify-between text-[9px] font-mono text-zinc-600 border-b border-zinc-300 pb-1">
              <span className="font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">{docs[2]?.code || 'DOC-03'}</span>
              <span className="px-1 py-0.2 bg-zinc-300 rounded text-zinc-800 text-[8px] font-bold">
                {docs[2]?.priority || '常规'}
              </span>
            </div>
            <div className="text-[10px] font-extrabold truncate text-zinc-800 my-1">
              {docs[2]?.title || '历史归档记录'}
            </div>
            <div className="space-y-1.5 opacity-60 mt-3">
              <div className="h-1 bg-zinc-400 rounded w-full" />
              <div className="h-1 bg-zinc-400 rounded w-2/3" />
              <div className="h-1 bg-zinc-400 rounded w-4/5" />
            </div>
          </div>
          <div className="space-y-1.5 opacity-40 pb-2">
            <div className="h-1 bg-zinc-400 rounded w-full" />
            <div className="h-1 bg-zinc-400 rounded w-1/2" />
          </div>
        </div>

        {/* --- PAPER SHEET 2 (Middle Document - Z: 6px) --- */}
        <div
          className={`
            absolute top-1 inset-x-1.5 h-[255px] rounded-xl p-3 bg-zinc-100 text-zinc-900
            border-t-2 border-l-2 border-b-2 border-r-2 border-t-white border-l-white border-b-zinc-400 border-r-zinc-400
            flex flex-col justify-between overflow-hidden shadow-md
          `}
          style={{
            transform: `translate3d(${lerp(0, 8, af)}px, ${lerp(18, -16, af)}px, 6px) rotate(${lerp(0, 3.5, af)}deg)`,
          }}
        >
          <div>
            {/* Top Index Tag for Paper 2 */}
            <div className="flex items-center justify-between text-[9px] font-mono text-zinc-600 border-b border-zinc-200 pb-1">
              <span className="font-bold text-amber-900 bg-amber-100 px-1.5 py-0.2 rounded">{docs[1]?.code || 'DOC-02'}</span>
              <span className="text-[8px] bg-amber-200 text-amber-950 font-extrabold px-1.5 py-0.2 rounded border border-amber-300">
                {docs[1]?.priority || '中'}
              </span>
            </div>
            <div className="text-[10px] font-extrabold truncate text-zinc-900 my-1">
              {docs[1]?.title || '系统架构设计原件'}
            </div>
            <div className="flex items-center justify-between text-[8px] text-zinc-600 bg-zinc-50 p-1 rounded border border-zinc-200 mt-2">
              <span>负责人: {docs[1]?.assignee || 'Alex'}</span>
              <span className="text-amber-700 font-bold">{docs[1]?.status}</span>
            </div>
            <div className="space-y-1.5 opacity-50 mt-3">
              <div className="h-1 bg-zinc-400 rounded w-full" />
              <div className="h-1 bg-zinc-400 rounded w-3/4" />
            </div>
          </div>
          <div className="space-y-1.5 opacity-40 pb-2">
            <div className="h-1 bg-zinc-400 rounded w-5/6" />
            <div className="h-1 bg-zinc-400 rounded w-2/3" />
          </div>
        </div>

        {/* --- PAPER SHEET 1 (Frontmost Main Document - Z: 9px) --- */}
        <div
          className={`
            absolute top-2 inset-x-0 h-[265px] rounded-xl p-3.5
            border-t-2 border-l-2 border-b-2 border-r-2 border-t-white border-l-white border-b-zinc-300 border-r-zinc-300 bg-white text-zinc-900
            flex flex-col justify-between overflow-hidden shadow-lg
          `}
          style={{
            transform: `translate3d(0px, ${lerp(20, -6, af)}px, 9px) rotate(${lerp(0, -0.5, af)}deg)`,
          }}
        >
          <div>
            <div className="flex items-center justify-between border-b border-zinc-200 pb-1.5 mb-2">
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[10px] font-bold font-mono tracking-wider text-zinc-800">
                  {docs[0]?.code || 'DOC-2025-01'}
                </span>
              </div>
              <span
                className={`text-[8px] px-1.5 py-0.3 rounded-full font-extrabold ${
                  docs[0]?.priority === '高'
                    ? 'bg-red-100 text-red-700 border border-red-200'
                    : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                }`}
              >
                {docs[0]?.priority || '高'}优先级
              </span>
            </div>

            <div className="text-xs font-black text-zinc-900 truncate leading-snug">
              {docs[0]?.title || folder.title}
            </div>

            <div className="mt-2 flex items-center justify-between text-[9px] bg-zinc-50 p-1.5 rounded-lg border border-zinc-200 shadow-sm">
              <span className="text-zinc-700 font-bold truncate">负责人: {docs[0]?.assignee || 'David'}</span>
              <span className="text-emerald-600 font-extrabold">{docs[0]?.status || '进行中'}</span>
            </div>

            <div className="space-y-1.5 opacity-60 mt-4">
              <div className="h-1 bg-zinc-300 rounded w-full" />
              <div className="h-1 bg-zinc-300 rounded w-5/6" />
              <div className="h-1 bg-zinc-300 rounded w-4/5" />
            </div>
          </div>

          <div className="space-y-1.5 opacity-50 pb-2 border-t border-zinc-100 pt-2">
            <div className="h-1 bg-zinc-300 rounded w-full" />
            <div className="h-1 bg-zinc-300 rounded w-2/3" />
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. FROSTED GLASS FRONT POCKET (磨砂玻璃前口袋 - Z: 10px 悬浮腔体)
             Bottom edge remains strictly anchored at Z: 10px (no bottom translation on active).
             When active, top tilts forward gently via rotateX(-4.5deg) around bottom center axis!
         ========================================================================= */}
      <div
        className={`
          absolute bottom-0 inset-x-0 h-[158px] rounded-b-[22px] rounded-t-2xl p-4
          flex flex-col justify-between backdrop-blur-2xl border-t-2 border-x-2 border-b-2
          transition-colors duration-300
          ${
            isActive
              ? 'bg-gradient-to-b from-emerald-500/85 via-emerald-600/90 to-emerald-800/95 border-emerald-300/80 text-white shadow-lg'
              : isDark
              ? 'bg-gradient-to-b from-zinc-800/85 via-zinc-900/90 to-black/95 border-white/30 text-white shadow-lg group-hover:border-white/50'
              : 'bg-gradient-to-b from-white/95 via-white/85 to-zinc-100/90 border-white/90 text-zinc-900 shadow-md'
          }
        `}
        style={{
          transformOrigin: 'bottom center',
          transform: `translate3d(0px, 0px, 10px) rotateX(${lerp(-1, -4.5, af)}deg)`,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Rounded Bottom Glass Rim Specular Reflection */}
        <div className="absolute bottom-0 inset-x-0 h-3 rounded-b-[20px] bg-gradient-to-t from-white/30 via-white/10 to-transparent pointer-events-none" />

        {/* Top Rim Specular Gloss Highlight */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-white/90 to-transparent pointer-events-none" />

        <div className="flex items-center justify-between" style={{ transform: 'translate3d(0px, 0px, 4px)' }}>
          <div
            className={`
              inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold
              backdrop-blur-md transition-colors shadow-md
              ${
                isActive
                  ? 'bg-white/30 text-white border border-white/40'
                  : 'bg-black/30 dark:bg-white/20 border border-white/30 text-white'
              }
            `}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{folder.memberCount}</span>
          </div>

          <div
            className={`
              text-xs font-mono font-extrabold px-2 py-0.5 rounded-lg backdrop-blur-md shadow-sm
              ${
                isActive
                  ? 'bg-emerald-950/60 text-emerald-200 border border-emerald-300/40'
                  : 'bg-black/30 text-white border border-white/25'
              }
            `}
          >
            {folder.progress}%
          </div>
        </div>

        <div className="mt-auto" style={{ transform: 'translate3d(0px, 0px, 8px)' }}>
          <div
            className={`
              text-lg font-extrabold tracking-tight truncate transition-colors duration-300
              ${
                isActive
                  ? 'text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]'
                  : isDark
                  ? 'text-zinc-100 group-hover:text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]'
                  : 'text-zinc-900 group-hover:text-black'
              }
            `}
          >
            {folder.title}
          </div>

          {folder.englishTitle && (
            <div className="text-[11px] font-mono opacity-80 truncate font-semibold mt-0.5">
              {folder.englishTitle}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

