/* 浮条交互逻辑 adapted from steven-tey/novel (Apache 2.0) packages/headless/src/components/editor-bubble.tsx */
/**
 * BubbleToolbar — 选中文本格式浮条（Notion/novel 式交互）
 *
 * tiptap v3 的 BubbleMenu 从 @tiptap/react/menus 子路径导入（根入口不导出，
 * floating-ui 定位为内置能力，无需 novel 时代的 tippy）。
 * shouldShow 判定逻辑借自 novel 的 EditorBubble（见文件头归注）：
 * 不可编辑 / 图片激活 / 空选区 / 节点选择（isNodeSelection）→ 不弹；
 * 项目补充：代码块内选中也不弹（浮条格式操作对代码块无意义）。
 * 浮条内容四分组：粗斜下删 | 高亮 + 8 色色点（内联展开，无二级浮层）| H1-3 | AI 改写。
 * AI 改写复用 WritingEditor 的 runAiAction 入口（与 WritingAiMenu 同一回调），
 * 经 onAiRewrite 注入；未注入时按钮置灰占位（见 TODO 注释）。
 * 样式走 index.css 的 .em-bubble*（独立于 em-toolbar，不共用避免耦合）。
 */

import React from "react";
import type { Editor } from "@tiptap/core";
import { isNodeSelection } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { BubbleMenu, type BubbleMenuProps } from "@tiptap/react/menus";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  Sparkles,
} from "lucide-react";

/** 8 色文字颜色预设（与 EditorToolbar 的 COLOR_PRESETS 同源简化版，独立定义不 import 工具栏） */
const BUBBLE_COLOR_PRESETS: { en: string; zh: string }[] = [
  { en: "red", zh: "红色" },
  { en: "orange", zh: "橙色" },
  { en: "gold", zh: "金黄色" },
  { en: "green", zh: "绿色" },
  { en: "skyblue", zh: "天蓝色" },
  { en: "blue", zh: "蓝色" },
  { en: "purple", zh: "紫色" },
  { en: "gray", zh: "灰色" },
];

/** adapted from novel：不可编辑 / 图片激活 / 空选 / 节点选择 / 代码块 → 不弹浮条 */
const shouldShow: NonNullable<BubbleMenuProps["shouldShow"]> = ({ editor, state }) => {
  if (!editor.isEditable || editor.isActive("image")) return false;
  const { empty } = state.selection;
  if (empty) return false;
  if (isNodeSelection(state.selection)) return false;
  // 项目补充：代码块内选中不弹（浮条格式操作对代码块无意义）
  if (editor.isActive("codeBlock")) return false;
  return true;
};

interface BubbleToolbarProps {
  editor: Editor;
  /** AI 改写入口：复用 WritingEditor 内 WritingAiMenu 的同一回调（runAiAction）；缺省时按钮置灰 */
  onAiRewrite?: () => void;
}

const BubbleToolbar: React.FC<BubbleToolbarProps> = ({ editor, onAiRewrite }) => {
  const state = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor) return null;
      return {
        bold: editor.isActive("bold"),
        italic: editor.isActive("italic"),
        underline: editor.isActive("underline"),
        strike: editor.isActive("strike"),
        highlight: editor.isActive("highlight"),
        color: (editor.getAttributes("textStyle").color as string | null) ?? null,
        h1: editor.isActive("heading", { level: 1 }),
        h2: editor.isActive("heading", { level: 2 }),
        h3: editor.isActive("heading", { level: 3 }),
      };
    },
  });

  if (!state) return null;

  // 复用 EditorToolbar 的 btn 命令模式（独立实现，不 import EditorToolbar）；
  // 浮条按钮保留原生 title + aria-label（本组件不接 Tooltip，与 EditorToolbar 的 Tooltip 方案互不影响）
  const btn = (active: boolean, title: string, onClick: () => void, node: React.ReactNode) => (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`em-bubble-btn${active ? " is-active" : ""}`}
    >
      {node}
    </button>
  );

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={shouldShow}
      options={{ placement: "top", offset: 8 }}
      className="em-bubble popover-entry"
    >
      {/* 分组1：粗体 / 斜体 / 下划线 / 删除线（lucide 图标同现有工具栏） */}
      {btn(state.bold, "粗体", () => editor.chain().focus().toggleBold().run(), <Bold size={15} />)}
      {btn(state.italic, "斜体", () => editor.chain().focus().toggleItalic().run(), <Italic size={15} />)}
      {btn(state.underline, "下划线", () => editor.chain().focus().toggleUnderline().run(), <Underline size={15} />)}
      {btn(state.strike, "删除线", () => editor.chain().focus().toggleStrike().run(), <Strikethrough size={15} />)}

      <span className="em-bubble-sep" />

      {/* 分组2：高亮 + 8 色色点（内联展开，不做二级浮层） */}
      {btn(state.highlight, "高亮", () => editor.chain().focus().toggleHighlight().run(), <Highlighter size={15} />)}
      {BUBBLE_COLOR_PRESETS.map((c) => (
        <button
          key={c.en}
          type="button"
          title={c.zh}
          aria-label={c.zh}
          className={`em-bubble-color${state.color === c.en ? " is-active" : ""}`}
          style={{ background: c.en }}
          onClick={() => editor.chain().focus().setColor(c.en).run()}
        />
      ))}

      <span className="em-bubble-sep" />

      {/* 分组3：H1 / H2 / H3 */}
      {btn(state.h1, "一级标题", () => editor.chain().focus().toggleHeading({ level: 1 }).run(), <span className="em-h">H1</span>)}
      {btn(state.h2, "二级标题", () => editor.chain().focus().toggleHeading({ level: 2 }).run(), <span className="em-h">H2</span>)}
      {btn(state.h3, "三级标题", () => editor.chain().focus().toggleHeading({ level: 3 }).run(), <span className="em-h">H3</span>)}

      <span className="em-bubble-sep" />

      {/* 分组4：AI 改写（复用 WritingEditor 的 runAiAction，与 WritingAiMenu 同一入口） */}
      {onAiRewrite ? (
        btn(false, "AI 改写所选文字", onAiRewrite, <Sparkles size={15} />)
      ) : (
        // TODO: 未注入 onAiRewrite（WritingEditor 之外暂无现成 AI 改写回调）时置灰占位，不实现点击行为
        <button
          type="button"
          title="AI 改写所选文字"
          aria-label="AI 改写所选文字"
          disabled
          className="em-bubble-btn"
        >
          <Sparkles size={15} />
        </button>
      )}
    </BubbleMenu>
  );
};

export default BubbleToolbar;
