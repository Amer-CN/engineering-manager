/**
 * WritingSlashMenu — 斜杠插入菜单（写作中心，自 WritingEditor.tsx 抽出）
 *
 * 「/」唤起。焦点始终留在编辑器："/" 之后输入的文字即过滤词（useSlashMenu.onDocUpdate
 * 从文档事务里提取），↑↓ 选择、Enter/Tab 插入、Esc 或点击外部关闭。
 * 菜单定位到光标处（view.coordsAtPos，fixed），越出视口时上翻/左移。
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { Icon } from "@/components/ui/Icon";

interface SlashItem {
  label: string;
  hint: string;
  icon: string;
  run: (editor: Editor) => void;
}

/** 插入块（与原 slashItems 一致） */
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

/** 按过滤词筛选项（label 包含或 hint 不区分大小写包含） */
export function filterSlashItems(query: string): SlashItem[] {
  const q = query.trim();
  if (!q) return slashItems;
  const lower = q.toLowerCase();
  return slashItems.filter((s) => s.label.includes(q) || s.hint.toLowerCase().includes(lower));
}

/**
 * 斜杠菜单状态机。焦点不离开编辑器：
 *  - 输入 "/" → 打开（由 handleKeyDown 触发，"/" 本身照常插入文档）
 *  - 后续输入 → onDocUpdate 从光标前文本提取 "/" 之后的词作过滤词；"/" 被删或词里出现空白 → 关闭
 *  - ↑↓ 移动高亮、Enter/Tab 执行（IME 组合中不拦截）、执行时删掉 "/" 和过滤词
 */
export function useSlashMenu() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const editorRef = useRef<Editor | null>(null);
  // handleKeyDown / onDocUpdate 在编辑器事件回调里执行，闭包读不到最新 state，用 ref 镜像
  const openRef = useRef(false);
  const queryRef = useRef("");
  const indexRef = useRef(0);
  openRef.current = open;
  queryRef.current = query;
  indexRef.current = index;

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  const attach = useCallback((ed: Editor | null) => {
    editorRef.current = ed;
  }, []);

  /** 执行菜单项：删除光标前的 "/" 及过滤词，再跑命令 */
  const execute = useCallback(
    (item: SlashItem) => {
      const ed = editorRef.current;
      if (!ed) return;
      const { from } = ed.state.selection;
      const textBefore = ed.state.doc.textBetween(Math.max(0, from - 32), from, "\n", "\0");
      const off = textBefore.lastIndexOf("/");
      if (off >= 0) {
        const absSlash = from - (textBefore.length - off);
        if (absSlash < from) {
          ed.chain().focus().deleteRange({ from: absSlash, to: from }).run();
        }
      }
      item.run(ed);
      close();
    },
    [close],
  );

  /** 挂进 editorProps.handleKeyDown；返回 true 表示已消费该键 */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent): boolean => {
      if (openRef.current && !event.isComposing) {
        const filtered = filterSlashItems(queryRef.current);
        if (filtered.length > 0 && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
          event.preventDefault();
          setIndex((i) =>
            event.key === "ArrowDown" ? (i + 1) % filtered.length : (i - 1 + filtered.length) % filtered.length,
          );
          return true;
        }
        if (event.key === "Enter" || event.key === "Tab") {
          if (filtered.length > 0) {
            event.preventDefault();
            execute(filtered[Math.min(indexRef.current, filtered.length - 1)] ?? filtered[0]);
            return true;
          }
          close(); // 无匹配：收起菜单，Enter 走编辑器默认（换行）
          return false;
        }
      }
      // IME 组合中不唤起（中文输入法选词阶段的 "/" 不应打开菜单）
      if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.isComposing) {
        const ed = editorRef.current;
        if (ed?.isActive("codeBlock")) return false; // 代码块内不唤起
        setOpen(true);
        setQuery("");
        setIndex(0);
        return false; // 让 "/" 照常插入，过滤词由 onDocUpdate 提取
      }
      return false;
    },
    [execute, close],
  );

  /** 挂进 editor onUpdate：菜单开着时从文档提取过滤词 */
  const onDocUpdate = useCallback(
    (ed: Editor) => {
      if (!openRef.current) return;
      const { from } = ed.state.selection;
      if (from <= 0) return;
      const textBefore = ed.state.doc.textBetween(Math.max(0, from - 32), from, "\n", "\0");
      const off = textBefore.lastIndexOf("/");
      if (off < 0) {
        close(); // "/" 被删掉 → 收起
        return;
      }
      const q = textBefore.slice(off + 1);
      if (/\s/.test(q)) {
        close(); // 过滤词里出现空格/换行 → 收起（对齐 Notion）
        return;
      }
      setQuery((prev) => (prev === q ? prev : q));
      setIndex(0);
    },
    [close],
  );

  return { open, query, index, setIndex, attach, handleKeyDown, onDocUpdate, execute, close };
}

interface WritingSlashMenuProps {
  editor: Editor;
  open: boolean;
  query: string;
  index: number;
  onHoverIndex: (i: number) => void;
  onSelect: (item: SlashItem) => void;
  onClose: () => void;
}

const MENU_WIDTH = 256; // w-64
const MENU_MAX_HEIGHT = 320;

const WritingSlashMenu: React.FC<WritingSlashMenuProps> = ({ editor, open, query, index, onHoverIndex, onSelect, onClose }) => {
  const rootRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => filterSlashItems(query), [query]);

  // 定位到光标处（fixed 坐标）；打开时计算一次，跟随 "/" 的锚点不随打字抖动
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    try {
      const coords = editor.view.coordsAtPos(editor.state.selection.from);
      let left = coords.left;
      let top = coords.bottom + 6;
      if (left + MENU_WIDTH > window.innerWidth - 12) left = Math.max(12, window.innerWidth - MENU_WIDTH - 12);
      if (top + MENU_MAX_HEIGHT > window.innerHeight - 12) top = Math.max(12, coords.top - MENU_MAX_HEIGHT - 6);
      setPos({ top, left });
    } catch {
      setPos({ top: 100, left: 100 });
    }
  }, [open, editor]);

  // 点外部 / Esc 关闭（对齐 WritingExportMenu 模式）；键盘导航在编辑器 handleKeyDown 里
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={rootRef}
      className="fixed z-50 w-64 rounded-xl border shadow-lg overflow-hidden bg-white"
      style={{
        borderColor: "var(--border)",
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        visibility: pos ? "visible" : "hidden",
      }}
    >
      <div
        className="px-3 py-2 border-b text-xs flex items-center gap-2"
        style={{ borderColor: "var(--border)", color: "var(--muted)" }}
      >
        <span className="shrink-0">插入</span>
        {query && <span className="truncate">·「{query}」</span>}
        <span className="ml-auto shrink-0 opacity-70">↑↓ 选 · Enter 插 · Esc 关</span>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-3 py-4 text-xs text-center" style={{ color: "var(--muted)" }}>
            没有匹配的命令
          </div>
        ) : (
          filtered.map((item, i) => (
            <button
              key={item.label}
              type="button"
              tabIndex={-1}
              onClick={() => onSelect(item)}
              onMouseEnter={() => onHoverIndex(i)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm ${
                i === index ? "bg-[color:var(--panel-2)]" : "hover:bg-[color:var(--panel-2)]"
              }`}
              style={{ color: "var(--fg)" }}
            >
              <Icon name={item.icon} size={16} />
              <span className="flex-1">{item.label}</span>
              <span className="text-xs" style={{ color: "var(--muted)" }}>{item.hint}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default WritingSlashMenu;
