/**
 * BubbleToolbar（选中文本格式浮条）测试
 *
 * 覆盖：
 *  - shouldShow 判定（adapted from novel）：空选不弹 / 选中弹出 / 收起隐藏 /
 *    codeBlock 内选中不弹 / 节点选择（isNodeSelection，选中图片）不弹
 *  - 浮条结构：4 分组 3 个分隔 + 8 色色点内联展开 + 全部按钮
 *  - 命令生效：粗体 / 文字颜色 / 标题
 *  - AI 改写入口：注入回调时点击触发（WritingEditor 经此复用 runAiAction）；未注入时置灰占位
 *
 * 说明：BubbleMenu 由 tiptap v3 的 floating-ui 定位（show 时挂载到编辑器父容器，
 * hide 时整体移出 DOM），故「不弹」断言用 .em-bubble 不在文档内（null）表达。
 */
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { Editor } from "@tiptap/core";
import { EditorContent } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import BubbleToolbar from "@/components/features/writing/BubbleToolbar";

/**
 * jsdom 无布局引擎：Range 上缺 getClientRects / getBoundingClientRect，
 * BubbleMenu 定位链路（posToDOMRect → EditorView.coordsAtPos）会抛
 * "target.getClientRects is not a function"，并以未捕获异常冒泡
 * （show() 先于 updatePosition 执行，浮条可见性断言本身不受影响，但会让 vitest 退出非零）。
 * 在本文件内打最小零尺寸补丁（test-setup.ts 属全局 setup，不属本任务改动范围）。
 */
const rangeProto = Range.prototype as unknown as Record<string, unknown>;
if (typeof rangeProto.getClientRects !== "function") {
  rangeProto.getClientRects = function () {
    return [] as unknown as DOMRectList;
  };
}
if (typeof rangeProto.getBoundingClientRect !== "function") {
  rangeProto.getBoundingClientRect = function () {
    return { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0 } as DOMRect;
  };
}
const elementProto = Element.prototype as unknown as Record<string, unknown>;
if (typeof elementProto.getClientRects !== "function") {
  elementProto.getClientRects = function () {
    return [] as unknown as DOMRectList;
  };
}

/**
 * 文档结构与定位常量（tiptap 解析 HTML 内容后的 ProseMirror 位置）：
 *   段落 "Hello World"（pos 0，size 13）→ 图片节点（pos 13，原子节点 size 1）
 *   → 代码块（pos 14，size 13，文本区从 pos 15 起，"const a = 1" 共 11 字符）
 */
const CONTENT = '<p>Hello World</p><img src="x.png"><pre><code>const a = 1</code></pre>';
const POS_PARAGRAPH_TEXT = { from: 1, to: 6 }; // 选中 "Hello"
const POS_CODEBLOCK_TEXT = { from: 15, to: 20 }; // 选中代码块内 "const"
const POS_IMAGE_NODE = 13;

const editors: Editor[] = [];

function makeEditor(): Editor {
  const editor = new Editor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Highlight,
      TextStyle,
      Color,
      Image.configure({ allowBase64: true }),
    ],
    content: CONTENT,
  });
  editors.push(editor);
  return editor;
}

function setup(onAiRewrite?: () => void) {
  const editor = makeEditor();
  const utils = render(
    <>
      <EditorContent editor={editor} />
      <BubbleToolbar editor={editor} onAiRewrite={onAiRewrite} />
    </>,
  );
  return { editor, ...utils };
}

/** 选中正文文字并等浮条出现（BubbleMenu 默认 updateDelay=250ms 去抖） */
async function selectAndWait(editor: Editor) {
  editor.commands.setTextSelection(POS_PARAGRAPH_TEXT);
  await waitFor(() => expect(bubble()).not.toBeNull(), { timeout: 2000 });
}

const bubble = () => document.querySelector<HTMLElement>(".em-bubble");

afterEach(() => {
  cleanup();
  editors.splice(0).forEach((e) => e.destroy());
});

describe("BubbleToolbar shouldShow 判定（adapted from novel）", () => {
  it("空选区不弹浮条", () => {
    setup();
    expect(bubble()).toBeNull();
  });

  it("选中文字弹出浮条，含四分组全部按钮", async () => {
    const { editor } = setup();
    await selectAndWait(editor);

    expect(bubble()).toBeVisible();
    for (const name of ["粗体", "斜体", "下划线", "删除线", "高亮", "一级标题", "二级标题", "三级标题", "AI 改写所选文字"]) {
      expect(screen.getByRole("button", { name })).toBeTruthy();
    }
  });

  it("收起选区（回到空选）浮条隐藏", async () => {
    const { editor } = setup();
    await selectAndWait(editor);

    editor.commands.setTextSelection(1);
    await waitFor(() => expect(bubble()).toBeNull(), { timeout: 2000 });
  });

  it("codeBlock 内选中不弹浮条", async () => {
    const { editor } = setup();
    await selectAndWait(editor);

    editor.commands.setTextSelection(POS_CODEBLOCK_TEXT);
    await waitFor(() => expect(bubble()).toBeNull(), { timeout: 2000 });
  });

  it("节点选择（isNodeSelection，选中图片）不弹浮条", async () => {
    const { editor } = setup();
    await selectAndWait(editor);

    editor.view.dispatch(
      editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, POS_IMAGE_NODE)),
    );
    await waitFor(() => expect(bubble()).toBeNull(), { timeout: 2000 });
  });
});

describe("BubbleToolbar 浮条结构与命令", () => {
  it("结构：4 分组共 3 个分隔符 + 8 色色点内联展开 + 9 个功能按钮", async () => {
    const { editor } = setup();
    await selectAndWait(editor);

    const el = bubble()!;
    expect(el.querySelectorAll(".em-bubble-sep")).toHaveLength(3);
    expect(el.querySelectorAll(".em-bubble-color")).toHaveLength(8);
    // 9 = 粗体/斜体/下划线/删除线/高亮/H1/H2/H3/AI 改写（未注入回调时 AI 为置灰占位按钮）
    expect(el.querySelectorAll(".em-bubble-btn")).toHaveLength(9);
  });

  it("点击粗体按钮 → editor.isActive(\"bold\") 为 true", async () => {
    const { editor } = setup();
    await selectAndWait(editor);

    fireEvent.click(screen.getByRole("button", { name: "粗体" }));
    expect(editor.isActive("bold")).toBe(true);
  });

  it("点击红色色点 → 文字颜色 red 生效", async () => {
    const { editor } = setup();
    await selectAndWait(editor);

    fireEvent.click(screen.getByRole("button", { name: "红色" }));
    expect((editor.getAttributes("textStyle").color as string | null)).toBe("red");
  });

  it("点击一级标题按钮 → heading level 1 激活", async () => {
    const { editor } = setup();
    await selectAndWait(editor);

    fireEvent.click(screen.getByRole("button", { name: "一级标题" }));
    expect(editor.isActive("heading", { level: 1 })).toBe(true);
  });

  it("AI 改写按钮：注入 onAiRewrite 时点击触发一次；未注入时置灰占位不响应", async () => {
    const onAiRewrite = vi.fn();
    const { editor, unmount } = setup(onAiRewrite);
    await selectAndWait(editor);

    fireEvent.click(screen.getByRole("button", { name: "AI 改写所选文字" }));
    expect(onAiRewrite).toHaveBeenCalledTimes(1);
    unmount();

    // 未注入回调（WritingEditor 之外暂无现成 AI 改写入口）：按钮 disabled 占位
    const editor2 = makeEditor();
    render(
      <>
        <EditorContent editor={editor2} />
        <BubbleToolbar editor={editor2} />
      </>,
    );
    editor2.commands.setTextSelection(POS_PARAGRAPH_TEXT);
    await waitFor(() => expect(bubble()).not.toBeNull(), { timeout: 2000 });
    const aiBtn = screen.getByRole("button", { name: "AI 改写所选文字" }) as HTMLButtonElement;
    expect(aiBtn.disabled).toBe(true);
  });
});
