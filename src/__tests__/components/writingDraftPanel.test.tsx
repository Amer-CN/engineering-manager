/**
 * WritingDraftPanel 集成行为测试（验收反馈「点生成没反应」的复现用例）：
 *   · 填好素材点「生成」→ streamingDraft 被调用且带 AbortSignal
 *   · content/done 事件 → 流式预览出现文本、onGenerated 收到完整内容、generating 复位
 *   · HTTP 失败文案经 failMsg 透传 toast；静默截断提示中断且半成品可应用
 *   · 卸载 → abort + discarded，迟到的 done 不写文档（R8 契约）
 * 网络层全部 mock，只验真实组件交互链路。
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import WritingDraftPanel from "@/components/features/writing/WritingDraftPanel";
import * as writingClient from "@/services/writing-client";

vi.mock("@/services/writing-client", () => ({
  fetchWritingDocTypes: vi.fn().mockResolvedValue({
    success: true,
    data: { groups: [{ group: "周报汇报", types: [{ code: "summary", label: "工作总结" }] }], styles: [] },
  }),
  streamingDraft: vi.fn(),
}));

// 模块级 spy：组件任意时刻渲染捕获的都是同一个 showToast 引用
const toastSpy = vi.fn();
vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ showToast: toastSpy }),
}));

import { useToast } from "@/hooks/useToast";

const mockedStream = vi.mocked(writingClient.streamingDraft);

function setup(props: Partial<React.ComponentProps<typeof WritingDraftPanel>> = {}) {
  const onGenerated = vi.fn();
  const onClose = vi.fn();
  const utils = render(
    <WritingDraftPanel
      docId={1}
      docType="summary"
      material="2026年8月完成[[3]]个隐患整改"
      onGenerated={onGenerated}
      onClose={onClose}
      {...props}
    />,
  );
  const generateBtn = () => screen.getByRole("button", { name: /生成/ });
  return { onGenerated, onClose, generateBtn, ...utils };
}

beforeEach(() => {
  mockedStream.mockReset();
  toastSpy.mockClear();
});

describe("WritingDraftPanel 生成点击链路", () => {
  it("点生成 → streamingDraft 携 AbortSignal 调用，done 后 onGenerated 收到内容且 generating 复位", async () => {
    mockedStream.mockImplementation(async (_body, onEvent, _signal) => {
      onEvent({ type: "content", text: "# 季度总结\n\n" });
      onEvent({ type: "content", text: "完成 3 项整改。" });
      onEvent({ type: "done", content: "# 季度总结\n\n完成 3 项整改。" });
      return undefined;
    });

    const { onGenerated, generateBtn } = setup();

    fireEvent.click(generateBtn());

    await waitFor(() => expect(onGenerated).toHaveBeenCalled());
    expect(onGenerated).toHaveBeenCalledWith("# 季度总结\n\n完成 3 项整改。");
    expect(mockedStream).toHaveBeenCalledTimes(1);
    const arg = mockedStream.mock.calls[0];
    expect(arg[0].docType).toBe("summary");
    expect(arg[0].material).toContain("[[3]]");
    expect(arg[2]).toBeInstanceOf(AbortSignal);

    await waitFor(() => expect(generateBtn().getAttribute("disabled")).toBeNull());
  });

  it("HTTP 失败：failMsg 文案透传 toast，不调用 onGenerated", async () => {
    mockedStream.mockResolvedValue("LLM 调用失败: InternalServerError");

    const { onGenerated, generateBtn } = setup();
    fireEvent.click(generateBtn());

    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith("LLM 调用失败: InternalServerError", "error"),
    );
    expect(onGenerated).not.toHaveBeenCalled();
  });

  it("静默截断：流结束未收到 done → toast 中断且保留已生成文本可应用", async () => {
    mockedStream.mockImplementation(async (_body, onEvent, _signal) => {
      onEvent({ type: "content", text: "半截内容" });
      return undefined; // 未发 done 就结束
    });

    const { onGenerated, generateBtn } = setup();
    fireEvent.click(generateBtn());

    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith("生成连接中断", "error"),
    );
    // 半成品仍可手动应用
    await waitFor(() => expect(screen.getByRole("button", { name: /应用内容/ })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: /应用内容/ }));
    await waitFor(() => expect(onGenerated).toHaveBeenCalledWith("半截内容"));
  });

  it("卸载时 abort 流且迟到的 done 不再写文档（R8 契约）", async () => {
    let capturedSignal: AbortSignal | undefined;
    let pendingDone: (() => void) | null = null;
    mockedStream.mockImplementation(async (_body, onEvent, signal) => {
      capturedSignal = signal;
      onEvent({ type: "content", text: "部分" });
      await new Promise<void>((resolve) => { pendingDone = resolve; }); // 挂起模拟流进行中
      onEvent({ type: "done", content: "部分+迟到内容" });
      return undefined;
    });

    const { onGenerated, unmount, generateBtn } = setup();
    fireEvent.click(generateBtn());
    await waitFor(() => expect(capturedSignal).toBeTruthy());

    // 用户关闭面板/离开页面 → 组件卸载 → cleanup abort + 置丢弃标志
    unmount();

    // 放行挂起的 done → 因 discarded 不应写入文档；底层流已被中止
    pendingDone?.();
    await waitFor(() => expect(capturedSignal!.aborted).toBe(true));
    expect(onGenerated).not.toHaveBeenCalled();
  });
});
