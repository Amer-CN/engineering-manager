/**
 * EditorToolbar — 写作中心顶部固定工具栏（R3）
 *
 * 分组：撤销/重做 | 粗体/斜体/下划线/删除线/高亮/文字颜色 | H1-3 |
 *       有序/无序/任务清单 | 引用/代码块/分割线/图片(URL) | 表格（插入+行列增删） | 清除格式
 * 激活态用 editor.isActive() 经 useEditorState 订阅；样式走 var(--accent) 等现有 token。
 * 粘贴截图由 WritingEditor 的 handlePaste 处理（base64 内嵌，>2MB 拒绝）。
 */

import React, { useEffect, useState } from "react";
import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { Icon } from "@/components/ui/Icon";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Undo2,
  Redo2,
  List,
  ListOrdered,
  Square,
  Quote,
  Code2,
  Minus,
  Image as ImageIcon,
  Table2,
  RemoveFormatting,
  Highlighter,
  Shield,
} from "lucide-react";

/** 文字颜色预设（CSS 命名色，避免硬编码 hex、跟随主题感知） */
const COLOR_PRESETS = ["red", "orange", "gold", "green", "skyblue", "blue", "purple", "gray"];

interface EditorToolbarProps {
  editor: Editor | null;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor }) => {
  const [colorOpen, setColorOpen] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  const state = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor) return null;
      return {
        canUndo: editor.can().undo(),
        canRedo: editor.can().redo(),
        bold: editor.isActive("bold"),
        italic: editor.isActive("italic"),
        underline: editor.isActive("underline"),
        strike: editor.isActive("strike"),
        highlight: editor.isActive("highlight"),
        protectedSpan: editor.isActive("protectedSpan"),
        color: (editor.getAttributes("textStyle").color as string | null) ?? null,
        h1: editor.isActive("heading", { level: 1 }),
        h2: editor.isActive("heading", { level: 2 }),
        h3: editor.isActive("heading", { level: 3 }),
        ol: editor.isActive("orderedList"),
        ul: editor.isActive("bulletList"),
        task: editor.isActive("taskList"),
        blockquote: editor.isActive("blockquote"),
        codeBlock: editor.isActive("codeBlock"),
        inTable: editor.isActive("table"),
      };
    },
  });

  // 关闭颜色 / 图片 URL 浮层（点击外部或 Esc）
  useEffect(() => {
    const close = () => {
      setColorOpen(false);
      setUrlOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onDown = (e: MouseEvent) => {
      if ((colorOpen || urlOpen) && !(e.target as HTMLElement).closest(".em-toolbar")) close();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [colorOpen, urlOpen]);

  if (!editor || !state) return null;

  const btn = (active: boolean, title: string, onClick: () => void, node: React.ReactNode, disabled?: boolean) => (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={`em-toolbar-btn${active ? " is-active" : ""}`}
    >
      {node}
    </button>
  );

  const insertImageByUrl = () => {
    if (!imageUrl.trim()) return;
    editor.chain().focus().setImage({ src: imageUrl.trim() }).run();
    setImageUrl("");
    setUrlOpen(false);
  };

  return (
    <div className="em-toolbar">
      {btn(state.canUndo, "撤销", () => editor.chain().focus().undo().run(), <Undo2 size={15} />, !state.canUndo)}
      {btn(state.canRedo, "重做", () => editor.chain().focus().redo().run(), <Redo2 size={15} />, !state.canRedo)}

      <span className="em-toolbar-sep" />

      {btn(state.bold, "粗体", () => editor.chain().focus().toggleBold().run(), <Bold size={15} />)}
      {btn(state.italic, "斜体", () => editor.chain().focus().toggleItalic().run(), <Italic size={15} />)}
      {btn(state.underline, "下划线", () => editor.chain().focus().toggleUnderline().run(), <Underline size={15} />)}
      {btn(state.strike, "删除线", () => editor.chain().focus().toggleStrike().run(), <Strikethrough size={15} />)}
      {btn(state.highlight, "高亮", () => editor.chain().focus().toggleHighlight().run(), <Highlighter size={15} />)}
      {btn(state.protectedSpan, "保护标记（Protected Span）：选中文字后包裹 [[ ]]", () => editor.chain().focus().toggleProtectedSpan().run(), <Shield size={15} />)}

      <span className="em-toolbar-sep" />

      {/* 文字颜色 */}
      <div className="relative">
        {btn(
          !!state.color,
          "文字颜色",
          () => setColorOpen((v) => !v),
          <span className="em-color-btn">
            <span className="em-color-underline" style={{ background: state.color ?? "currentColor" }} />
            A
          </span>,
        )}
        {colorOpen && (
          <div className="em-toolbar-pop">
            <div className="em-color-grid">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  className="em-color-swatch"
                  style={{ background: c }}
                  onClick={() => {
                    editor.chain().focus().setColor(c).run();
                    setColorOpen(false);
                  }}
                />
              ))}
              <button
                type="button"
                title="清除文字颜色"
                className="em-color-swatch em-color-clear"
                onClick={() => {
                  editor.chain().focus().unsetColor().run();
                  setColorOpen(false);
                }}
              >
                无
              </button>
            </div>
          </div>
        )}
      </div>

      <span className="em-toolbar-sep" />

      {btn(state.h1, "一级标题", () => editor.chain().focus().toggleHeading({ level: 1 }).run(), <span className="em-h">H1</span>)}
      {btn(state.h2, "二级标题", () => editor.chain().focus().toggleHeading({ level: 2 }).run(), <span className="em-h">H2</span>)}
      {btn(state.h3, "三级标题", () => editor.chain().focus().toggleHeading({ level: 3 }).run(), <span className="em-h">H3</span>)}

      <span className="em-toolbar-sep" />

      {btn(state.ol, "有序列表", () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered size={15} />)}
      {btn(state.ul, "无序列表", () => editor.chain().focus().toggleBulletList().run(), <List size={15} />)}
      {btn(state.task, "任务清单", () => editor.chain().focus().toggleTaskList().run(), <Square size={15} />)}

      <span className="em-toolbar-sep" />

      {btn(state.blockquote, "引用", () => editor.chain().focus().toggleBlockquote().run(), <Quote size={15} />)}
      {btn(state.codeBlock, "代码块", () => editor.chain().focus().toggleCodeBlock().run(), <Code2 size={15} />)}
      {btn(false, "分割线", () => editor.chain().focus().setHorizontalRule().run(), <Minus size={15} />)}

      {/* 图片：URL 插入（粘贴截图走编辑器 handlePaste） */}
      <div className="relative">
        {btn(false, "插入图片（URL）", () => setUrlOpen((v) => !v), <ImageIcon size={15} />)}
        {urlOpen && (
          <div className="em-toolbar-pop">
            <div className="em-toolbar-url">
              <input
                autoFocus
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") insertImageByUrl();
                }}
                placeholder="图片 URL，回车插入"
                className="em-url-input"
              />
              <button type="button" title="插入" className="em-url-btn" disabled={!imageUrl.trim()} onClick={insertImageByUrl}>
                <Icon name="ArrowRight" size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <span className="em-toolbar-sep" />

      <DropdownMenu
        align="end"
        trigger={btn(state.inTable, "表格：插入 / 行列增删", () => {}, <Table2 size={15} />)}
        items={[
          { key: "insert", label: "插入表格（2×2）", onClick: () => editor.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run() },
          { key: "addRowBefore", label: "上方加行", onClick: () => editor.chain().focus().addRowBefore().run() },
          { key: "addRowAfter", label: "下方加行", onClick: () => editor.chain().focus().addRowAfter().run() },
          { key: "addColBefore", label: "左侧加列", onClick: () => editor.chain().focus().addColumnBefore().run() },
          { key: "addColAfter", label: "右侧加列", onClick: () => editor.chain().focus().addColumnAfter().run() },
          { key: "delRow", label: "删除行", danger: true, onClick: () => editor.chain().focus().deleteRow().run() },
          { key: "delCol", label: "删除列", danger: true, onClick: () => editor.chain().focus().deleteColumn().run() },
          { key: "delTable", label: "删除表格", danger: true, onClick: () => editor.chain().focus().deleteTable().run() },
        ]}
      />

      <span className="em-toolbar-sep" />

      {btn(false, "清除格式", () => editor.chain().focus().unsetAllMarks().clearNodes().run(), <RemoveFormatting size={15} />)}
    </div>
  );
};

export default EditorToolbar;