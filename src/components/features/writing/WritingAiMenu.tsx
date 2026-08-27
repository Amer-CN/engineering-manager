/**
 * WritingAiMenu — 行内 AI 浮动菜单（自 WritingEditor 抽出，R13 行数治理）
 *
 * 选中文字后浮出：改写/润色/扩写/缩写四动作，调 /api/writing/assist。
 * 定位：选区终点坐标上方 40px（视口顶部 8px 钳制、右侧 280px 防溢出）。
 */

import React from "react";
import { Icon } from "@/components/ui/Icon";

/** 行内 AI 动作（与后端 /api/writing/assist 的 instruction 对齐） */
const AI_ACTIONS = [
  { id: "rewrite", label: "改写", icon: "Wand2" },
  { id: "polish", label: "润色", icon: "Sparkles" },
  { id: "expand", label: "扩写", icon: "Maximize2" },
  { id: "shorten", label: "缩写", icon: "Minimize2" },
] as const;

interface WritingAiMenuProps {
  position: { top: number; left: number };
  busy: boolean;
  onAction: (actionId: string) => void;
}

const WritingAiMenu: React.FC<WritingAiMenuProps> = ({ position, busy, onAction }) => (
  <div
    className="fixed z-50 flex items-center gap-1 rounded-xl border shadow-lg px-2 py-1.5 bg-white"
    style={{
      borderColor: "var(--border)",
      top: Math.max(8, position.top - 40),
      left: Math.min(position.left, window.innerWidth - 280),
    }}
  >
    {AI_ACTIONS.map((a) => (
      <button
        key={a.id}
        onClick={() => onAction(a.id)}
        disabled={busy}
        className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg hover:bg-[color:var(--panel-2)] disabled:opacity-50"
        style={{ color: "var(--fg)" }}
      >
        <Icon name={a.icon} size={13} />
        {a.label}
      </button>
    ))}
  </div>
);

export default WritingAiMenu;
