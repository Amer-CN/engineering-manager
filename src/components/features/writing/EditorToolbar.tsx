/* 工具栏组织结构 adapted from NiazMorshed2007/shadcn-tiptap (MIT) registry/toolbars */
/**
 * EditorToolbar — 写作中心顶部固定工具栏（R3；2026-09-05 按 shadcn-tiptap 结构重构）
 * 分组：撤销/重做 | 粗斜下删高保 | A颜色▾（文字色+背景高亮两栏弹层） | 字号▾/字体▾/对齐▾
 * （触发器显示当前值） | H1-3 | 列表 | 引用/代码/分割线/图片(URL) | 表格▾ | 清除格式 | 公文皮肤 toggle。
 * 约束：命令逻辑与 props 零改动；基础按钮用项目 Button ghost（不引 radix）；弹层项走原生
 * button+title；公文 toggle 的 title 不许删（writingPaperStyle.test 断言）；高亮色读取前先判
 * isActive("highlight")（未注册 Highlight 的精简编辑器上 getAttributes 会 throw）；Highlight
 * 已开 multicolor（WritingEditor.configure），多色高亮按命令链路与选中态结构实现。
 */
import React, { useEffect, useState } from "react";
import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { Tooltip } from "@/components/ui/Tooltip/Tooltip";
import {
  Bold, Italic, Underline, Strikethrough, Undo2, Redo2, List, ListOrdered, Square, Quote,
  Code2, Minus, Image as ImageIcon, Table2, RemoveFormatting, Highlighter, Shield,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, ChevronDown, LayoutTemplate, Check,
  type LucideIcon,
} from "lucide-react";
import { COLOR_PRESETS, HIGHLIGHT_PRESETS, FONT_SIZE_PRESETS, truncateFont } from "./toolbarPresets";

/** 字体预设：value 传给 setFontFamily（CSS font-family 全名）；display 列表短名（楷体_GB2312 全名太长，截断难看） */
const FONT_PRESETS: { value: string; display: string }[] = [
  { value: "宋体", display: "宋体" },
  { value: "黑体", display: "黑体" },
  { value: "楷体_GB2312", display: "楷体" },
  { value: "仿宋_GB2312", display: "仿宋" },
  { value: "思源宋体 CN", display: "思源宋体" },
  { value: "微软雅黑", display: "微软雅黑" },
  { value: "苹方", display: "苹方" },
];

/** 对齐四项（alignment.tsx 模式：图标 + 中文名，触发器显示当前值） */
const ALIGN_PRESETS: { key: "left" | "center" | "right" | "justify"; zh: string; Icon: LucideIcon }[] = [
  { key: "left", zh: "左对齐", Icon: AlignLeft },
  { key: "center", zh: "居中对齐", Icon: AlignCenter },
  { key: "right", zh: "右对齐", Icon: AlignRight },
  { key: "justify", zh: "两端对齐", Icon: AlignJustify },
];

/** 颜色弹层单栏配置（文字色 / 背景高亮两栏共用结构与交互：选色 + 清除） */
interface ColorSection {
  label: string;
  presets: { key: string; zh: string }[];
  current: string | null;
  onPick: (key: string) => void;
  clearZh: string;
  onClear: () => void;
  swatch: (key: string) => React.ReactNode;
}

interface EditorToolbarProps {
  editor: Editor | null;
  /** 公文皮肤开关回调（状态与持久化由父组件 usePaperStyle 持有，工具栏只触发不持有） */
  onTogglePaperStyle?: () => void;
  /** 公文皮肤当前是否启用（仅用于 toggle 按钮的 active 底色展示） */
  paperStyleOn?: boolean;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor, onTogglePaperStyle, paperStyleOn }) => {
  // 弹层互斥：同一时刻至多一个弹层展开（点任一触发器自动关旧的——修复多弹层叠加）
  type PopKind = "color" | "fontSize" | "fontFamily" | "align" | "url" | null;
  const [openPop, setOpenPop] = useState<PopKind>(null);
  const togglePop = (k: Exclude<PopKind, null>) => setOpenPop((v) => (v === k ? null : k));
  const [imageUrl, setImageUrl] = useState("");

  const state = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor) return null;
      const highlightOn = editor.isActive("highlight");
      return {
        canUndo: editor.can().undo(),
        canRedo: editor.can().redo(),
        bold: editor.isActive("bold"),
        italic: editor.isActive("italic"),
        underline: editor.isActive("underline"),
        strike: editor.isActive("strike"),
        highlight: highlightOn,
        highlightColor: highlightOn ? ((editor.getAttributes("highlight").color as string | null) ?? null) : null,
        protectedSpan: editor.isActive("protectedSpan"),
        color: (editor.getAttributes("textStyle").color as string | null) ?? null,
        // 字号：自写 FontSizeMark（mark 名 fontSize）；字体：官方 FontFamily 挂在 textStyle 上
        fontSize: (editor.getAttributes("fontSize").fontSize as string | null) ?? null,
        fontFamily: (editor.getAttributes("textStyle").fontFamily as string | null) ?? null,
        // 当前对齐：显式居中/右/两端之外一律视为左（TextAlign 默认语义，默认态点亮左对齐）
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
        imageActive: editor.isActive("image"),
      };
    },
  });

  // 关闭颜色 / 图片 URL / 字号 / 字体 浮层（点击外部或 Esc）
  useEffect(() => {
    const close = () => setOpenPop(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    const onDown = (e: MouseEvent) => {
      if (openPop && !(e.target as HTMLElement).closest(".em-toolbar")) close();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openPop]);

  if (!editor || !state) return null;

  const currentAlign = ALIGN_PRESETS.find((a) => a.key === state.align) ?? ALIGN_PRESETS[0];

  // 工具栏按钮：Button ghost + em-toolbar-btn 覆写尺寸与 is-active（accent 底色）；
  // Tooltip 包一层 inline-flex div，点击事件经冒泡到达按钮，onClick 不受影响。
  const btn = (active: boolean, label: string, onClick: () => void, node: React.ReactNode, disabled?: boolean, extraClass?: string) => (
    <Tooltip content={label} delay={400}>
      <Button
        type="button"
        variant="ghost"
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
        className={`em-toolbar-btn${active ? " is-active" : ""}${extraClass ? ` ${extraClass}` : ""}`}
      >
        {node}
      </Button>
    </Tooltip>
  );

  // 弹层菜单项：可选色块预览 + 名称 + 当前项对勾（title 供悬停与测试定位）
  const popItem = (active: boolean, name: string, onClick: () => void, preview?: React.ReactNode, style?: React.CSSProperties, extraClass?: string) => (
    <button
      type="button"
      title={name}
      aria-label={name}
      style={style}
      onClick={onClick}
      className={`em-pop-item${active ? " is-active" : ""}${extraClass ? ` ${extraClass}` : ""}`}
    >
      {preview}
      <span className="em-pop-name">{name}</span>
      {active && <Check size={13} className="em-check" />}
    </button>
  );

  // 颜色弹层单栏渲染（color-and-highlight.tsx 模式：色块 A + 名称 + 对勾，清除项兜底）
  const colorSection = (s: ColorSection) => (
    <>
      <div className="em-pop-label">{s.label}</div>
      <div className="em-color-list">
        {s.presets.map((p) =>
          popItem(s.current === p.key, p.zh, () => { s.onPick(p.key); setOpenPop(null); }, s.swatch(p.key)),
        )}
        {popItem(s.current === null, s.clearZh, () => { s.onClear(); setOpenPop(null); },
          <span className="em-swatch em-swatch-none">A</span>)}
      </div>
    </>
  );

  const insertImageByUrl = () => {
    if (!imageUrl.trim()) return;
    editor.chain().focus().setImage({ src: imageUrl.trim() }).run();
    setImageUrl("");
    setOpenPop(null);
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

      {/* A 颜色▾：两栏弹层——文字色 8 项 + 无 / 背景高亮 4 项 + 清除高亮 */}
      <div className="relative">
        {btn(
          !!state.color || !!state.highlightColor,
          "文字颜色",
          () => togglePop("color"),
          <span className="em-color-btn">
            <span className="em-color-a">
              A
              <span className="em-color-underline" style={{ background: state.color ?? "currentColor" }} />
            </span>
            <ChevronDown size={11} />
          </span>,
        )}
        {openPop === "color" && (
          <div className="em-toolbar-pop em-color-pop popover-entry">
            {colorSection({
              label: "文字颜色", presets: COLOR_PRESETS, current: state.color,
              onPick: (en) => editor.chain().focus().setColor(en).run(),
              clearZh: "无", onClear: () => editor.chain().focus().unsetColor().run(),
              swatch: (en) => <span className="em-swatch" style={{ color: en }}>A</span>,
            })}
            <div className="em-pop-divider" />
            {colorSection({
              label: "背景高亮", presets: HIGHLIGHT_PRESETS, current: state.highlightColor,
              onPick: (color) => editor.chain().focus().setHighlight({ color }).run(),
              clearZh: "清除高亮", onClear: () => editor.chain().focus().unsetHighlight().run(),
              swatch: (color) => <span className="em-swatch" style={{ background: color }}>A</span>,
            })}
          </div>
        )}
      </div>

      <span className="em-toolbar-sep" />

      {/* 字号▾：触发器显示当前值（如 16），弹层 16 档网格 + 恢复默认（unsetFontSize） */}
      <div className="relative">
        {btn(
          !!state.fontSize,
          "字号",
          () => togglePop("fontSize"),
          <span className="em-h">
            <span className="em-toolbar-current">{state.fontSize ? state.fontSize.replace(/pt$/, "") : "字号"}</span>
            <ChevronDown size={11} />
          </span>,
          undefined,
          "em-size-trigger",
        )}
        {openPop === "fontSize" && (
          <div className="em-toolbar-pop em-size-grid popover-entry">
            {FONT_SIZE_PRESETS.map((n) =>
              popItem(state.fontSize === `${n}pt`, String(n), () => {
                editor.chain().focus().setFontSize(`${n}pt`).run();
                setOpenPop(null);
              }),
            )}
            {popItem(false, "恢复默认", () => {
              editor.chain().focus().unsetFontSize().run();
              setOpenPop(null);
            }, undefined, { gridColumn: "1 / -1" })}
          </div>
        )}
      </div>

      {/* 字体▾：触发器显示当前字体名（截断 6 字符 + …），弹层列表用短名渲染（本体预览）、value 传全名 */}
      <div className="relative">
        {btn(
          !!state.fontFamily,
          "字体",
          () => togglePop("fontFamily"),
          <span className="em-h">
            <span className="em-toolbar-current">{state.fontFamily ? truncateFont(state.fontFamily) : "字体"}</span>
            <ChevronDown size={11} />
          </span>,
          undefined,
          "em-font-trigger",
        )}
        {openPop === "fontFamily" && (
          <div className="em-toolbar-pop em-pop-list popover-entry">
            {FONT_PRESETS.map((f) =>
              popItem(state.fontFamily === f.value, f.display, () => {
                editor.chain().focus().setFontFamily(f.value).run();
                setOpenPop(null);
              }, undefined, { fontFamily: f.value }, "em-font-item"),
            )}
            {popItem(false, "恢复默认", () => {
              editor.chain().focus().unsetFontFamily().run();
              setOpenPop(null);
            })}
          </div>
        )}
      </div>

      {/* 对齐▾：触发器显示当前对齐（图标+名+▾）；image 激活时禁用；弹层项 ✓ 前缀标当前项（与其他弹层统一互斥） */}
      <div className="relative">
        {btn(
          false,
          currentAlign.zh,
          () => togglePop("align"),
          <span className="em-h">
            <currentAlign.Icon size={14} />
            <span className="em-toolbar-current">{currentAlign.zh}</span>
            <ChevronDown size={11} />
          </span>,
          state.imageActive,
        )}
        {openPop === "align" && (
          <div className="em-toolbar-pop em-pop-list popover-entry">
            {ALIGN_PRESETS.map((a) =>
              popItem(state.align === a.key, `${state.align === a.key ? "✓ " : ""}${a.zh}`, () => {
                editor.chain().focus().setTextAlign(a.key).run();
                setOpenPop(null);
              }, <a.Icon size={14} />),
            )}
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
        {btn(false, "插入图片（URL）", () => togglePop("url"), <ImageIcon size={15} />)}
        {openPop === "url" && (
          <div className="em-toolbar-pop popover-entry">
            <div className="em-toolbar-url">
              <input
                autoFocus
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") insertImageByUrl(); }}
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
          title 与 Tooltip 并存（Tooltip 悬停展示、title 供读屏与既有测试断言——不许删） */}
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
