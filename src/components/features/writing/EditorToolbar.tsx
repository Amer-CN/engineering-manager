/**
 * EditorToolbar — 写作中心顶部固定工具栏（R3）
 *
 * 分组：撤销/重做 | 粗体/斜体/下划线/删除线/高亮/保护标记/文字颜色 |
 *       字号/字体/对齐（左中右两端） | H1-3 |
 *       有序/无序/任务清单 | 引用/代码块/分割线/图片(URL) | 表格（插入+行列增删） | 清除格式
 *       右侧独立：公文版式皮肤 toggle（状态由父组件 usePaperStyle 持有）
 * 激活态用 editor.isActive() 经 useEditorState 订阅；样式走 var(--accent) 等现有 token。
 * 悬停提示走项目自有 Tooltip（content=原中文 title 文案，delay=400，原生 title 已删避免双提示）；
 * 浮层内部按钮（色板/字号/字体/URL 插入）保留原生 title（属菜单项，不接 Tooltip）。
 * 粘贴截图由 WritingEditor 的 handlePaste 处理（base64 内嵌，>2MB 拒绝）。
 */

import React, { useEffect, useState } from "react";
import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { Icon } from "@/components/ui/Icon";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { Tooltip } from "@/components/ui/Tooltip/Tooltip";
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
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ChevronDown,
  LayoutTemplate,
} from "lucide-react";

/** 文字颜色预设（CSS 命名色，避免硬编码 hex、跟随主题感知；title 用中文，后续加色只改本表） */
const COLOR_PRESETS: { en: string; zh: string }[] = [
  { en: "red", zh: "红色" },
  { en: "orange", zh: "橙色" },
  { en: "gold", zh: "金黄色" },
  { en: "green", zh: "绿色" },
  { en: "skyblue", zh: "天蓝色" },
  { en: "blue", zh: "蓝色" },
  { en: "purple", zh: "紫色" },
  { en: "gray", zh: "灰色" },
];

/** 字号预设（pt 单位，与 printPreview / docxExport 的 GB/T 9704 版式一致） */
const FONT_SIZE_PRESETS = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 48, 72];

/** 字体预设（公文常用五件套 + 常见系统字体；值为 CSS font-family 名） */
const FONT_PRESETS = ["宋体", "黑体", "楷体_GB2312", "仿宋_GB2312", "思源宋体 CN", "微软雅黑", "苹方"];

interface EditorToolbarProps {
  editor: Editor | null;
  /** 公文皮肤开关回调（状态与持久化由父组件 usePaperStyle 持有，工具栏只触发不持有） */
  onTogglePaperStyle?: () => void;
  /** 公文皮肤当前是否启用（仅用于 toggle 按钮的 active 底色展示） */
  paperStyleOn?: boolean;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor, onTogglePaperStyle, paperStyleOn }) => {
  const [colorOpen, setColorOpen] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  const [fontSizeOpen, setFontSizeOpen] = useState(false);
  const [fontFamilyOpen, setFontFamilyOpen] = useState(false);
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
        // 字号：自写 FontSizeMark（mark 名 fontSize）；字体：官方 FontFamily 挂在 textStyle 上
        fontSize: (editor.getAttributes("fontSize").fontSize as string | null) ?? null,
        fontFamily: (editor.getAttributes("textStyle").fontFamily as string | null) ?? null,
        // 当前对齐：显式居中/右/两端之外一律视为左（默认态点亮左对齐键）
        align: editor.isActive({ textAlign: "center" })
          ? "center"
          : editor.isActive({ textAlign: "right" })
            ? "right"
            : editor.isActive({ textAlign: "justify" })
              ? "justify"
              : "left",
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

  // 关闭颜色 / 图片 URL / 字号 / 字体 浮层（点击外部或 Esc）
  useEffect(() => {
    const close = () => {
      setColorOpen(false);
      setUrlOpen(false);
      setFontSizeOpen(false);
      setFontFamilyOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onDown = (e: MouseEvent) => {
      if ((colorOpen || urlOpen || fontSizeOpen || fontFamilyOpen) && !(e.target as HTMLElement).closest(".em-toolbar")) close();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [colorOpen, urlOpen, fontSizeOpen, fontFamilyOpen]);

  if (!editor || !state) return null;

  // 全部按钮包 Tooltip（content 用原中文 title 文案）；原生 title 已删，aria-label 保留供读屏与测试。
  // Tooltip 内部包一层 inline-flex div，点击事件经冒泡到达按钮，onClick 不受影响。
  const btn = (active: boolean, title: string, onClick: () => void, node: React.ReactNode, disabled?: boolean) => (
    <Tooltip content={title} delay={400}>
      <button
        type="button"
        aria-label={title}
        disabled={disabled}
        onClick={onClick}
        className={`em-toolbar-btn${active ? " is-active" : ""}`}
      >
        {node}
      </button>
    </Tooltip>
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
                  key={c.en}
                  type="button"
                  title={c.zh}
                  className="em-color-swatch"
                  style={{ background: c.en }}
                  onClick={() => {
                    editor.chain().focus().setColor(c.en).run();
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

      {/* 字号下拉（pt 单位；当前选中显示字号 + 向下箭头，选中态高亮） */}
      <div className="relative">
        {btn(
          !!state.fontSize,
          "字号",
          () => setFontSizeOpen((v) => !v),
          <span className="em-h">
            {state.fontSize ? state.fontSize.replace(/pt$/, "") : "字号"}
            <ChevronDown size={12} />
          </span>,
        )}
        {fontSizeOpen && (
          <div className="em-toolbar-pop em-size-grid">
            {FONT_SIZE_PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                title={`${n}pt`}
                className={`em-toolbar-btn${state.fontSize === `${n}pt` ? " is-active" : ""}`}
                onClick={() => {
                  editor.chain().focus().setFontSize(`${n}pt`).run();
                  setFontSizeOpen(false);
                }}
              >
                {n} pt
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 字体下拉（当前选中显示字体名 + 向下箭头，选中态高亮） */}
      <div className="relative">
        {btn(
          !!state.fontFamily,
          "字体",
          () => setFontFamilyOpen((v) => !v),
          <span className="em-h">
            {state.fontFamily ?? "字体"}
            <ChevronDown size={12} />
          </span>,
        )}
        {fontFamilyOpen && (
          <div className="em-toolbar-pop em-pop-list">
            {FONT_PRESETS.map((name) => (
              <button
                key={name}
                type="button"
                title={name}
                style={{ fontFamily: name }}
                className={`em-toolbar-btn${state.fontFamily === name ? " is-active" : ""}`}
                onClick={() => {
                  editor.chain().focus().setFontFamily(name).run();
                  setFontFamilyOpen(false);
                }}
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 对齐四键：左 / 中 / 右 / 两端（TextAlign，作用于段落） */}
      {btn(state.align === "left", "左对齐", () => editor.chain().focus().setTextAlign("left").run(), <AlignLeft size={15} />)}
      {btn(state.align === "center", "居中对齐", () => editor.chain().focus().setTextAlign("center").run(), <AlignCenter size={15} />)}
      {btn(state.align === "right", "右对齐", () => editor.chain().focus().setTextAlign("right").run(), <AlignRight size={15} />)}
      {btn(state.align === "justify", "两端对齐", () => editor.chain().focus().setTextAlign("justify").run(), <AlignJustify size={15} />)}

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

      {/* 公文版式皮肤 toggle：右侧独立；状态由父组件 usePaperStyle 持有并持久化
          title 与 Tooltip 并存（Tooltip 悬停展示、title 供读屏与既有测试断言） */}
      <Tooltip content="切换公文版式（仿宋/黑体/楷体，所见即所得）" delay={400}>
        <button
          type="button"
          title="切换公文版式（仿宋/黑体/楷体，所见即所得）"
          aria-label="切换公文版式（仿宋/黑体/楷体，所见即所得）"
          className={`em-toolbar-btn em-paper-toggle${paperStyleOn ? " is-active" : ""}`}
          onClick={() => onTogglePaperStyle?.()}
        >
          <LayoutTemplate size={15} />
        </button>
      </Tooltip>
    </div>
  );
};

export default EditorToolbar;