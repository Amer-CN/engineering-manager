/**
 * WritingIndex 向导链路测试（验收反馈「Wizard 的 AI 起草点了没反应」复现）：
 *   · 点「AI 起草」→ handleWizardDraft → (auto 时) next-style → createWritingDoc → 进编辑器
 *   · 点「空白文档」→ createWritingDoc → 进编辑器
 * 网络层 mock，验证组件状态机与 sessionStorage 交接。
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import WritingIndex from "@/components/features/writing/WritingIndex";

vi.mock("@/services/writing-client", () => ({
  fetchWritingDocs: vi.fn().mockResolvedValue({ success: true, data: { total: 0, page: 1, size: 10, items: [] } }),
  fetchWritingDocTypes: vi.fn().mockResolvedValue({
    success: true,
    data: { groups: [{ group: "周报汇报", types: [{ code: "weekly_report", label: "周报" }] }], styles: [] },
  }),
  createWritingDoc: vi.fn(),
  deleteWritingDoc: vi.fn(),
  fetchWritingFolders: vi.fn().mockResolvedValue({ success: true, data: [] }),
  fetchNextWritingStyle: vi.fn(),
}));

import { createWritingDoc, fetchNextWritingStyle } from "@/services/writing-client";
import WritingEditor from "@/components/features/writing/WritingEditor";

// 权限直通
vi.mock("@/hooks/usePermission", () => ({
  usePermission: () => ({ can: () => true }),
  RequirePermission: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// 编辑器重 mock：只验「进没进编辑器」，不加载 tiptap
vi.mock("@/components/features/writing/WritingEditor", () => ({
  default: ({ docId }: { docId: number }) => <div data-testid="editor-stub">editor-{docId}</div>,
}));

const mockedCreate = vi.mocked(createWritingDoc);
const mockedNext = vi.mocked(fetchNextWritingStyle);

beforeEach(() => {
  mockedCreate.mockReset();
  mockedNext.mockReset();
  sessionStorage.clear();
});

function openWizard() {
  const utils = render(<WritingIndex />);
  const newBtn = screen.getByRole("button", { name: /新建文档/ });
  fireEvent.click(newBtn);
  return utils;
}

describe("WritingIndex 向导 AI 起草链路", () => {
  it("选文体+素材 → 点 AI 起草（auto 档）→ resolve 风格 → 建文档 → 进编辑器", async () => {
    mockedNext.mockResolvedValue({ success: true, data: { styleId: "S2", styleName: "问题导向型", lastStyleId: "S1" } });
    mockedCreate.mockResolvedValue({ success: true, data: { id: 101 } });

    openWizard();

    // 选文体（周报 → auto 档默认）
    fireEvent.click(screen.getByRole("button", { name: /周报\/日报/ }));
    // 填素材
    fireEvent.change(screen.getByPlaceholderText(/列出关键信息即可/), {
      target: { value: "8月完成[[3]]项整改" },
    });
    // 点 AI 起草
    fireEvent.click(screen.getByRole("button", { name: /^AI 起草$/ }));

    await waitFor(() => {
      expect(mockedNext).toHaveBeenCalledWith("weekly_report");
    });
    await waitFor(() => {
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({ docType: "weekly_report", styleId: "S2" }),
      );
    });
    // 进编辑器（docId 101）
    await waitFor(() => {
      expect(screen.getByTestId("editor-stub").textContent).toBe("editor-101");
    });
    // 素材已交接给编辑器层（sessionStorage）
    const material = sessionStorage.getItem("writing:draftMaterial");
    expect(material).toBeTruthy();
    expect(JSON.parse(material!).docId).toBe(101);
  });

  it("next-style 失败 → 回落 S3 仍建文档进编辑器", async () => {
    mockedNext.mockResolvedValue({ success: false, error: "查询失败" });
    mockedCreate.mockResolvedValue({ success: true, data: { id: 102 } });

    openWizard();
    fireEvent.click(screen.getByRole("button", { name: /周报\/日报/ }));
    fireEvent.change(screen.getByPlaceholderText(/列出关键信息即可/), {
      target: { value: "素材" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^AI 起草$/ }));

    await waitFor(() => {
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({ docType: "weekly_report", styleId: "S3" }),
      );
    });
    await waitFor(() => {
      expect(screen.getByTestId("editor-stub").textContent).toBe("editor-102");
    });
  });

  it("建文档失败 → toast 报错，不进编辑器", async () => {
    mockedNext.mockResolvedValue({ success: true, data: { styleId: "S1", styleName: "x", lastStyleId: "" } });
    mockedCreate.mockResolvedValue({ success: false, error: "无权限" });

    openWizard();
    fireEvent.click(screen.getByRole("button", { name: /周报\/日报/ }));
    fireEvent.change(screen.getByPlaceholderText(/列出关键信息即可/), {
      target: { value: "素材" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^AI 起草$/ }));

    await waitFor(() => expect(mockedCreate).toHaveBeenCalled());
    // 不应出现编辑器
    await new Promise((r) => setTimeout(r, 100));
    expect(screen.queryByTestId("editor-stub")).toBeNull();
  });

  it("空白文档 → 建文档 → 进编辑器", async () => {
    mockedCreate.mockResolvedValue({ success: true, data: { id: 103 } });

    openWizard();
    fireEvent.click(screen.getByRole("button", { name: /周报\/日报/ }));
    fireEvent.click(screen.getByRole("button", { name: /空白文档（手写）/ }));

    await waitFor(() => {
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({ docType: "weekly_report", contentMd: "" }),
      );
    });
    await waitFor(() => {
      expect(screen.getByTestId("editor-stub").textContent).toBe("editor-103");
    });
  });
});
