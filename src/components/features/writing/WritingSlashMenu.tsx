/**
 * WritingSlashMenu — 斜杠插入菜单（写作中心，自 WritingEditor.tsx 抽出，行为不变）
 *
 * 「/」唤起，输入过滤，点击插入块级元素。插入前删掉刚输入的 "/"。
 */

import React from "react";
import type { Editor } from "@tiptap/core";
import { Icon } from "@/components/ui/Icon";

interface SlashItem {
  label: string;
  hint: string;
  icon: string;
  run: (editor: Editor) => void;
}

interface WritingSlashMenuProps {
  editor: Editor;
  open: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  onClose: () => void;
}

/** 插入块（与原 WritingEditor slashItems 一致，纯搬运） */
export const slashItems: SlashItem[] = [
  { label: "一级标题", hint: "Heading 1", icon: "Heading1", run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: "二级标题", hint: "Heading 2", icon: "Heading2", run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: "三级标题", hint: "Heading 3", icon: "Heading3", run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: "无序列表", hint: "Bullet List", icon: "List", run: (e) => e.chain().focus().toggleBulletList().run() },
  { label: "有序列表", hint: "Ordered List", icon: "ListOrdered", run: (e) => e.chain().focus().toggleOrderedList().run() },
  { label: "任务清单", hint: "Task List", icon: "Square", run: (e) => e.chain().focus().toggleTaskList().run() },
  { label: "代码块", hint: "Code Block", icon: "Braces", run: (e) => e.chain().focus().toggleCodeBlock().run() },
  { label: "高亮", hint: "Highlight", icon: "PaintBucket", run: (e) => e.chain().focus().toggleHighlight().run() },
  { label: "图片", hint: "URL / 粘贴截图", icon: "Image", run: (e) => { const url = window.prompt("输入图片 URL（也可直接粘贴截图）"); if (url) e.chain().focus().setImage({ src: url.trim() }).run(); } },
  { label: "表格", hint: "Table 2×2", icon: "Table", run: (e) => e.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run() },
  { label: "引用", hint: "Blockquote", icon: "Quote", run: (e) => e.chain().focus().toggleBlockquote().run() },
  { label: "分割线", hint: "Horizontal Rule", icon: "Minus", run: (e) => e.chain().focus().setHorizontalRule().run() },
];

const WritingSlashMenu: React.FC<WritingSlashMenuProps> = ({ editor, open, query, onQueryChange, onClose }) => {
  if (!open) return null;
  const filtered = slashItems.filter(
    (s) => !query || s.label.includes(query) || s.hint.toLowerCase().includes(query.toLowerCase()),
  );

  const runSlash = (item: SlashItem) => {
    // 删除刚输入的 "/"（光标前一个字符），再执行命令
    const { from } = editor.state.selection;
    const before = editor.state.doc.textBetween(from - 1, from, " ");
    if (before === "/") {
      editor.chain().focus().deleteRange({ from: from - 1, to: from }).run();
    }
    item.run(editor);
    onClose();
  };

  return (
    <div
      className="absolute z-50 w-64 rounded-xl border shadow-lg overflow-hidden bg-white"
      style={{ borderColor: "var(--border)", left: 80, top: 80 }}
    >
      <div className="px-3 py-2 border-b text-xs" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
        插入
      </div>
      <input
        autoFocus
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        placeholder="搜索命令…"
        className="w-full px-3 py-2 text-sm bg-transparent focus:outline-none"
        style={{ color: "var(--fg)" }}
      />
      <div className="max-h-64 overflow-y-auto">
        {filtered.map((item) => (
          <button
            key={item.label}
            onClick={() => runSlash(item)}
            className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-[color:var(--panel-2)]"
            style={{ color: "var(--fg)" }}
          >
            <Icon name={item.icon} size={16} />
            <span className="flex-1">{item.label}</span>
            <span className="text-xs" style={{ color: "var(--muted)" }}>{item.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default WritingSlashMenu;
