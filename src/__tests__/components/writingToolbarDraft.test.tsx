/**
 * 编辑器顶栏「起草」按钮链路测试（用户反馈：从空白文档进编辑器，点顶栏「起草」无反应；
 * 而向导链路正常）。全真组件树（不 mock DraftPanel），只 mock 网络层与 tiptap 之外的副作用。
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import WritingEditor from "@/components/features/writing/WritingEditor";

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
});
