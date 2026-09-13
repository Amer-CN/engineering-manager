/**
 * 写作中心「公文版式皮肤」三件套测试（对应任务简报第 3 项新增测试文件）：
 * 1. usePaperStyle：初始值读 localStorage / toggle 写入 / 重新挂载（模拟刷新）恢复
 * 2. FontSizeMark（自写 mark）：setFontSize 序列化为 <span style="font-size:16pt">；
 *    unsetFontSize 删除 span 保留文本；getAttributes("fontSize") 可读当前字号
 * 3. EditorToolbar：公文皮肤 toggle 点击触发回调、title 完整（防翻译丢失）
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, renderHook, screen, fireEvent, act } from "@testing-library/react";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { usePaperStyle } from "@/hooks/usePaperStyle";
import FontSizeMark from "@/components/features/writing/FontSizeMark";
import EditorToolbar from "@/components/features/writing/EditorToolbar";

const KEY = "writing.paperStyle";

beforeEach(() => {
  localStorage.clear();
});

describe("usePaperStyle", () => {
  it("初始值读 localStorage：'1' → 开；无记录 → 关", () => {
    localStorage.setItem(KEY, "1");
    const on = renderHook(() => usePaperStyle());
    expect(on.result.current[0]).toBe(true);
    on.unmount();

    localStorage.removeItem(KEY);
    const off = renderHook(() => usePaperStyle());
    expect(off.result.current[0]).toBe(false);
  });

  it("toggle 写回 localStorage：关→开写 '1'，开→关写 '0'", () => {
    const { result } = renderHook(() => usePaperStyle());
    expect(result.current[0]).toBe(false);

    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);
    expect(localStorage.getItem(KEY)).toBe("1");

    act(() => result.current[1]());
    expect(result.current[0]).toBe(false);
    expect(localStorage.getItem(KEY)).toBe("0");
  });

  it("重新挂载（模拟刷新页面）后从 localStorage 恢复开关状态", () => {
    const first = renderHook(() => usePaperStyle());
    act(() => first.result.current[1]());
    first.unmount();

    const second = renderHook(() => usePaperStyle());
    expect(second.result.current[0]).toBe(true);
  });
});

describe("FontSizeMark（自写 mark，TextStyle 子类）", () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [StarterKit, TextStyle, FontSizeMark],
      content: "abc",
    });
  });

  afterEach(() => {
    editor.destroy();
  });

  it("setFontSize('16pt') → HTML 序列化为 <span style=\"font-size:16pt\">abc</span>", () => {
    editor.chain().selectAll().setFontSize("16pt").run();
    // 注：ProseMirror renderSpec 走 element.style.cssText，CSSOM 会把 "font-size:16pt"
    // 规范化为 "font-size: 16pt;"（空格 + 尾分号），浏览器与 jsdom 行为一致，两种形式语义相同
    expect(editor.getHTML()).toMatch(/^<p><span style="font-size: ?16pt;?">abc<\/span><\/p>$/);
  });

  it("unsetFontSize → 删除 span、保留文本", () => {
    editor.chain().selectAll().setFontSize("16pt").run();
    expect(editor.getHTML()).toMatch(/font-size/);

    editor.chain().unsetFontSize().run();
    expect(editor.getHTML()).toBe("<p>abc</p>");
  });

  it("当前字号可经 editor.getAttributes('fontSize') 读出（工具栏 active 态数据源）", () => {
    editor.chain().selectAll().setFontSize("22pt").run();
    expect(editor.getAttributes("fontSize").fontSize).toBe("22pt");
  });
});

describe("EditorToolbar 公文皮肤 toggle", () => {
  it("按钮 title 完整；点击触发 onTogglePaperStyle 回调", () => {
    const editor = new Editor({
      extensions: [StarterKit, TextStyle, FontSizeMark],
      content: "",
    });
    const onToggle = vi.fn();
    render(<EditorToolbar editor={editor} onTogglePaperStyle={onToggle} paperStyleOn={false} />);

    const btn = screen.getByRole("button", { name: "切换公文版式（仿宋/黑体/楷体，所见即所得）" });
    expect(btn.getAttribute("title")).toBe("切换公文版式（仿宋/黑体/楷体，所见即所得）");
    fireEvent.click(btn);
    expect(onToggle).toHaveBeenCalledTimes(1);

    editor.destroy();
  });
});
