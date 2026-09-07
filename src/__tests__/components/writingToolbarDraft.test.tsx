/**
 * 编辑器顶栏「起草」按钮链路测试（用户反馈：从空白文档进编辑器，点顶栏「起草」无反应；
 * 而向导链路正常）。全真组件树（不 mock DraftPanel），只 mock 网络层与 tiptap 之外的副作用。
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import WritingEditor from "@/components/features/writing/WritingEditor";

// WritingEditor 链上挂了 useActiveLlmModel（react-query）——本文件不测模型显示，mock 掉免 QueryClientProvider
vi.mock("@/hooks/data/useActiveLlmModel", () => ({
  useActiveLlmModel: () => ({ data: null, isLoading: false }),
}));

vi.mock("@/services/writing-client", () => ({
  fetchWritingDoc: vi.fn().mockResolvedValue({
    success: true,
    data: {
      id: 1, title: "空白测试", docType: "weekly_report", styleId: "S3", projectId: null,
      sourceType: "manual", sourceRef: null, contentMd: "", createdBy: "admin",
      createdAt: "2026-08-24 10:00:00", updatedAt: "2026-08-24 10:00:00", folderId: null,
    },
  }),
  updateWritingDoc: vi.fn().mockResolvedValue({ success: true }),
  writingAssist: vi.fn(),
  fetchWritingDocTypes: vi.fn().mockResolvedValue({
    success: true,
    data: { groups: [{ group: "周报汇报", types: [{ code: "weekly_report", label: "周报" }] }], styles: [] },
  }),
  streamingDraft: vi.fn(),
}));

vi.mock("@/services/knowledge-client", () => ({
  ingestKnowledgeDocument: vi.fn(),
}));

vi.mock("@/hooks/usePermission", () => ({
  usePermission: () => ({ can: () => true }),
}));

import { fetchWritingDoc } from "@/services/writing-client";

beforeEach(() => {
  vi.mocked(fetchWritingDoc).mockClear();
  sessionStorage.clear();
});

describe("编辑器顶栏起草按钮", () => {
  it("文档加载完成后点顶栏「起草」→ 起草抽屉弹出（含文体/素材/生成按钮）", async () => {
    const utils = render(<WritingEditor docId={1} onBack={vi.fn()} />);

    // 等文档加载完成（标题输入框出现且值为文档标题）
    await waitFor(() => {
      expect((screen.getByDisplayValue("空白测试") as HTMLInputElement).value).toBe("空白测试");
    });

    // 顶栏「起草」按钮（与「AI 起草」footer 按钮区分：精确匹配「起草」）
    const toolbarDraft = screen.getByRole("button", { name: /^起草$/ });
    fireEvent.click(toolbarDraft);

    // 抽屉应弹出：标题「AI 起草」+ 生成按钮 + 素材输入区
    await waitFor(() => {
      expect(screen.getByText("AI 起草")).toBeTruthy();
    });
    expect(screen.getByRole("button", { name: /生成/ })).toBeTruthy();
    expect(screen.getByPlaceholderText(/隐患整改/)).toBeTruthy();
  });

  it("文档未加载完（doc=null）时点起草 → 面板仍应弹出（不依赖 doc 状态）", async () => {
    // fetchWritingDoc 永不 resolve，模拟慢加载
    vi.mocked(fetchWritingDoc).mockReturnValue(new Promise(() => {}) as never);

    render(<WritingEditor docId={1} onBack={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /^起草$/ }));

    await waitFor(() => {
      expect(screen.getByText("AI 起草")).toBeTruthy();
    });
  });

  it("工具栏渲染新增控件：字号/字体下拉、对齐触发器（显示当前值）、公文皮肤 toggle", async () => {
    render(<WritingEditor docId={1} onBack={vi.fn()} />);

    // 等编辑器就绪、工具栏渲染（不依赖 fetchWritingDoc：上一用例把 mock 换成了永不 resolve，
    // mockClear 只清调用记录不清实现，文档不会加载完成）
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "切换公文版式（仿宋/黑体/楷体，所见即所得）" })).toBeTruthy();
    });

    // 对齐从四个独立按钮合并为一个下拉触发器（shadcn-tiptap alignment 模式）：
    // 触发器 aria-label=当前对齐名（默认左对齐），aria-label 与 title 一致
    for (const name of ["字号", "字体", "左对齐"]) {
      expect(screen.getByRole("button", { name })).toBeTruthy();
    }
    // 旧四键中键名含"对齐"的触发器不应成对出现（合并后只有一个对齐控件）
    expect(screen.queryByRole("button", { name: "居中对齐" })).toBeNull();
  });
});

/* ── shadcn-tiptap 结构重构：触发器显示当前值 + 颜色两栏弹层（行为验收）── */
import { Editor } from "@tiptap/core";
import { EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, FontFamily } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import FontSizeMark from "@/components/features/writing/FontSizeMark";
import EditorToolbar from "@/components/features/writing/EditorToolbar";

/**
 * jsdom 无布局引擎：工具栏命令链 chain().focus() 末尾的 scrollIntoView 会走
 * EditorView.coordsAtPos → Range.getClientRects，缺该方法时抛未捕获异常冒泡
 * （断言本身通过，但 vitest 退出非零）。打与 bubbleToolbar.test.tsx 相同的最小零尺寸补丁。
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

describe("EditorToolbar 触发器显示当前值（shadcn-tiptap 结构）", () => {
  // EditorContent 必须挂载：命令链 chain().focus() 依赖真实 view（未挂载编辑器 focus 会静默失败）
  const setup = () => {
    const editor = new Editor({
      extensions: [StarterKit, TextStyle, FontFamily, FontSizeMark, TextAlign.configure({ types: ["paragraph", "heading"] }), Highlight.configure({ multicolor: true })],
      content: "abc",
    });
    render(
      <>
        <EditorContent editor={editor} />
        <EditorToolbar editor={editor} />
      </>,
    );
    return editor;
  };

  it("标题（H1）可对齐：toggleHeading 后 setTextAlign 生效（types 含 heading）", () => {
    const editor = setup();

    editor.chain().focus().toggleHeading({ level: 1 }).run();
    editor.chain().focus().setTextAlign("center").run();

    expect(editor.isActive("heading", { level: 1 })).toBe(true);
    expect(editor.isActive({ textAlign: "center" })).toBe(true);
    // undo 后对齐回到默认（heading 仍在）
    editor.chain().focus().undo().run();
    expect(editor.isActive({ textAlign: "center" })).toBe(false);

    editor.destroy();
  });

  it("对齐下拉：触发器初始显示「左对齐」，点菜单「居中对齐」后触发器文案变「居中对齐」", async () => {
    const editor = setup();

    // 初始触发器显示当前值：左对齐（TextAlign 默认语义）
    expect(screen.getByRole("button", { name: "左对齐" })).toBeTruthy();

    // 打开弹层：当前项「✓ 左对齐」（pop-item button，与其他弹层统一互斥模式）→ 点居中
    fireEvent.click(screen.getByRole("button", { name: "左对齐" }));
    expect(await screen.findByRole("button", { name: "✓ 左对齐" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "居中对齐" }));

    // 对齐命令生效 → 触发器 aria-label 与可见文案更新为「居中对齐」
    expect(editor.isActive({ textAlign: "center" })).toBe(true);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "居中对齐" })).toBeTruthy();
      expect(screen.queryByRole("button", { name: "左对齐" })).toBeNull();
    });

    // 重开弹层：当前项已换成「居中对齐」（✓ 前缀跟随）
    fireEvent.click(screen.getByRole("button", { name: "居中对齐" }));
    expect(await screen.findByRole("button", { name: "✓ 居中对齐" })).toBeTruthy();

    editor.destroy();
  });

  it("颜色弹层两栏：文字色 8 项 + 无，背景高亮 4 项 + 清除高亮", () => {
    const editor = setup();

    // 打开 A 颜色弹层
    fireEvent.click(screen.getByRole("button", { name: "文字颜色" }));

    // 两栏栏头都在
    expect(screen.getByText("文字颜色", { selector: ".em-pop-label" })).toBeTruthy();
    expect(screen.getByText("背景高亮", { selector: ".em-pop-label" })).toBeTruthy();

    // 文字色 8 项 + 「无」；背景高亮 4 项 + 「清除高亮」（弹层项 title 定位，不走 Button）
    for (const zh of ["红色", "橙色", "金黄色", "绿色", "天蓝色", "蓝色", "紫色", "灰色", "无",
                      "黄色高亮", "绿色高亮", "蓝色高亮", "粉色高亮", "清除高亮"]) {
      expect(screen.getByTitle(zh)).toBeTruthy();
    }

    editor.destroy();
  });

  it("Highlight multicolor：setHighlight({color}) 后 getAttributes 取回该色", () => {
    const editor = setup();

    // 选中 "abc" 后设指定色高亮（multicolor 未开时 color 属性会被丢弃）
    editor.chain().focus().setTextSelection({ from: 1, to: 4 }).run();
    editor.chain().focus().setHighlight({ color: "#fde047" }).run();

    expect(editor.getAttributes("highlight").color).toBe("#fde047");

    editor.destroy();
  });
});
