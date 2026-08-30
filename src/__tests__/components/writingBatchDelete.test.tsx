/**
 * WritingIndex 批量删除测试（P3）：
 *   a) 勾选 2 行 + 点批量删除 → 确认后 deleteWritingDoc 被调 2 次且列表刷新
 *   b) 全选 → 删除数 = 当前页数
 *   c) 无 writing:delete 权限 → 复选框/全选/批量删除按钮不渲染
 *   d) 确认弹窗取消 → 不删除
 * mock 模式照 writingWizardFlow.test.tsx（网络层 mock + 权限直通 + 编辑器桩）。
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import WritingIndex from "@/components/features/writing/WritingIndex";

const { canMock, toastMock } = vi.hoisted(() => ({
  canMock: vi.fn(),
  // useToastContext 无 Provider 时每次返回新对象 → showToast 引用不稳 → loadDocs 反复重建刷列表；
  // 用稳定对象 mock 掉，保证列表渲染确定（真实 ToastProvider 的 context value 也不稳定，不能用真组件包）
  toastMock: {
    showToast: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock("@/services/writing-client", () => ({
  fetchWritingDocs: vi.fn(),
  fetchWritingDocTypes: vi.fn().mockResolvedValue({
    success: true,
    data: { groups: [{ group: "周报汇报", types: [{ code: "weekly_report", label: "周报" }] }], styles: [] },
  }),
  createWritingDoc: vi.fn(),
  deleteWritingDoc: vi.fn(),
  fetchWritingFolders: vi.fn().mockResolvedValue({ success: true, data: [] }),
  fetchNextWritingStyle: vi.fn(),
  createWritingFolder: vi.fn(),
  moveWritingDoc: vi.fn(),
}));

import { fetchWritingDocs, deleteWritingDoc } from "@/services/writing-client";

// 权限 mock：canMock 可按用例改写（默认全 true，用例 c 关掉 writing:delete）
vi.mock("@/hooks/usePermission", () => ({
  usePermission: () => ({ can: canMock }),
  RequirePermission: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Toast mock：稳定 showToast 引用，避免 loadDocs 因依赖变化反复重建
vi.mock("@/components/ui/Toast/ToastProvider", () => ({
  useToastContext: () => toastMock,
}));

// 编辑器重 mock：不加载 tiptap
vi.mock("@/components/features/writing/WritingEditor", () => ({
  default: ({ docId }: { docId: number }) => <div data-testid="editor-stub">editor-{docId}</div>,
}));

const mockedFetchDocs = vi.mocked(fetchWritingDocs);
const mockedDelete = vi.mocked(deleteWritingDoc);

function mkDoc(id: number, title: string) {
  return {
    id,
    title,
    docType: "weekly_report",
    styleId: null,
    projectId: null,
    sourceType: "manual",
    sourceRef: null,
    contentMd: "",
    folderId: null,
    createdBy: "tester",
    createdAt: "2026-08-01T10:00:00",
    updatedAt: "2026-08-01T10:00:00",
  };
}

beforeEach(() => {
  canMock.mockReset();
  canMock.mockReturnValue(true);
  mockedFetchDocs.mockReset();
  mockedFetchDocs.mockResolvedValue({
    success: true,
    data: { total: 3, page: 1, size: 10, items: [mkDoc(1, "文档一"), mkDoc(2, "文档二"), mkDoc(3, "文档三")] },
  });
  mockedDelete.mockReset();
  mockedDelete.mockResolvedValue({ success: true });
});

describe("WritingIndex 批量删除（P3）", () => {
  it("a) 勾选 2 行 + 点批量删除 → 确认后 deleteWritingDoc 被调 2 次且列表刷新", async () => {
    render(<WritingIndex />);
    await screen.findByText("文档一");

    fireEvent.click(screen.getByLabelText("选中 文档一"));
    fireEvent.click(screen.getByLabelText("选中 文档二"));
    fireEvent.click(screen.getByRole("button", { name: /删除选中（2）/ }));

    // ConfirmDialog 确认按钮按文案定位（与触发按钮「删除选中（2）」区分，精确匹配）
    fireEvent.click(await screen.findByRole("button", { name: "删除选中" }));

    await waitFor(() => expect(mockedDelete).toHaveBeenCalledTimes(2));
    expect(mockedDelete).toHaveBeenCalledWith(1);
    expect(mockedDelete).toHaveBeenCalledWith(2);
    // 列表刷新：mount 1 次 + 删除后 loadDocs 1 次
    await waitFor(() => expect(mockedFetchDocs).toHaveBeenCalledTimes(2));
  });

  it("b) 全选 → 确认后删除数 = 当前页数（3）", async () => {
    render(<WritingIndex />);
    await screen.findByText("文档一");

    fireEvent.click(screen.getByLabelText("全选"));
    fireEvent.click(screen.getByRole("button", { name: /删除选中（3）/ }));
    fireEvent.click(await screen.findByRole("button", { name: "删除选中" }));

    await waitFor(() => expect(mockedDelete).toHaveBeenCalledTimes(3));
    expect(mockedDelete).toHaveBeenCalledWith(3);
  });

  it("c) 无 writing:delete 权限 → 复选框/全选/批量删除按钮不渲染", async () => {
    canMock.mockImplementation((p: string) => p !== "writing:delete");
    render(<WritingIndex />);
    await screen.findByText("文档一");

    expect(screen.queryByLabelText("全选")).toBeNull();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: /删除选中/ })).toBeNull();
    // 行内「删除」按钮与复选框同源权限，同样不渲染
    expect(screen.queryAllByRole("button", { name: "删除" })).toHaveLength(0);
  });

  it("d) 确认弹窗取消 → 不删除、弹窗关闭", async () => {
    render(<WritingIndex />);
    await screen.findByText("文档一");

    fireEvent.click(screen.getByLabelText("选中 文档三"));
    fireEvent.click(screen.getByRole("button", { name: /删除选中（1）/ }));
    fireEvent.click(await screen.findByRole("button", { name: "取消" }));

    // Modal 退场有 0.15s AnimatePresence 动画，等弹窗真正卸载
    await waitFor(
      () => expect(screen.queryByRole("button", { name: "删除选中" })).toBeNull(),
      { timeout: 2000 },
    );
    expect(mockedDelete).not.toHaveBeenCalled();
  });
});
