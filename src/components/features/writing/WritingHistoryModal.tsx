/**
 * WritingHistoryModal — 写作中心「版本历史」入口 + 弹窗（T2 草稿找回）
 *
 * 复合组件：顶栏「历史」按钮 + 版本列表弹窗。按钮与弹窗收在同一组件里，
 * WritingEditor 仅一行挂载（其文件行数贴着 400 上限）；接 editor 实例的
 * 模式与 WritingExportMenu / WritingCheckPanel 一致。
 *
 * 保存自动留档（后端 5min 节流、每文档保留最近 50 条）。列表按时间倒序：
 * 每条 = 时间 + 保存人 + 内容前 80 字预览 + 行数，配「恢复」按钮。
 * 恢复走 ConfirmDialog 确认 → POST restore（后端先把当前内容入档再写回
 * 版本值）→ 成功后写回编辑器（contentType markdown）、onRestored 复位
 * 保存状态、toast 提示，并刷新列表（当前内容成为新版本立即可见）。
 */

import React, { useCallback, useEffect, useState } from "react";
import type { Editor } from "@tiptap/core";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useConfirm } from "@/hooks/useConfirm";
import { useToastContext } from "@/components/ui/Toast/ToastProvider";
import {
  fetchWritingVersions,
  restoreWritingVersion,
  type WritingVersion,
} from "@/services/writing-client";

interface WritingHistoryModalProps {
  docId: number;
  editor: Editor | null;
  /** 恢复成功后复位编辑器保存状态（内容已由 restore 端点落库） */
  onRestored: () => void;
}

/** 内容前 80 字预览：折叠空白，避免 markdown 符号把预览撑乱 */
const previewOf = (md: string) => md.replace(/\s+/g, " ").trim().slice(0, 80);

const WritingHistoryModal: React.FC<WritingHistoryModalProps> = ({ docId, editor, onRestored }) => {
  const { showToast } = useToastContext();
  const { confirm, ConfirmDialog } = useConfirm();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<WritingVersion[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchWritingVersions(docId, { size: 50 });
    setLoading(false);
    if (res.success && res.data) {
      setItems(res.data.items);
      setTotal(res.data.total);
    } else {
      showToast(res.error || "版本历史加载失败", "error");
    }
  }, [docId, showToast]);

  // 弹窗打开时拉一次列表
  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const handleRestore = async (v: WritingVersion) => {
    const ok = await confirm({
      title: "恢复此版本？",
      content: `将把 ${v.createdAt} 保存的版本写回文档。当前内容会先自动入档，之后仍可从历史中找回。`,
      confirmText: "恢复",
    });
    if (!ok) return;
    setRestoring(true);
    const res = await restoreWritingVersion(docId, v.id);
    setRestoring(false);
    if (res.success) {
      // 写回编辑器：contentType markdown（@tiptap/markdown 注入，core 类型未声明需 as never，
      // 同 WritingEditor 加载文档处的写法）
      editor?.commands.setContent(res.data?.contentMd ?? v.contentMd, { contentType: "markdown" } as never);
      onRestored();
      showToast(`已恢复到 ${v.createdAt} 的版本`, "success");
      void load(); // 当前内容已入档，刷新列表可见
    } else {
      showToast(res.error || "恢复失败", "error");
    }
  };

  return (
    <>
      {/* 顶栏「历史」按钮（Icon：Clock——iconMap 无 History，按简报用 Clock） */}
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} disabled={!editor}>
        <Icon name="Clock" size={15} />
        历史
      </Button>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        size="xl"
        title={
          <span className="flex items-center gap-2">
            <Icon name="Clock" size={16} />
            版本历史{total > 0 ? `（${total} 条）` : ""}
          </span>
        }
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              保存自动留档（5 分钟内多次保存只留一条），每文档保留最近 50 条
            </span>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              关闭
            </Button>
          </div>
        }
      >
        {ConfirmDialog}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-warning-500 border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-8 text-center text-sm" style={{ color: "var(--muted)" }}>
            暂无历史版本——下次保存时会自动留档当前内容
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((v) => (
              <div
                key={v.id}
                className="flex items-start justify-between gap-3 p-3 rounded-lg"
                style={{ background: "var(--panel-2)" }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
                    <Icon name="Clock" size={13} />
                    <span>{v.createdAt}</span>
                    <span>· {v.createdBy}</span>
                    <span>· {v.contentMd.split("\n").length} 行</span>
                  </div>
                  <div className="text-sm mt-1 truncate" style={{ color: "var(--fg)" }} title={v.title}>
                    {v.title}
                  </div>
                  <div className="text-xs mt-0.5 truncate" style={{ color: "var(--muted)" }}>
                    {previewOf(v.contentMd) || "（空内容）"}
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={restoring}
                  onClick={() => void handleRestore(v)}
                >
                  <Icon name="RotateCcw" size={14} />
                  恢复
                </Button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
};

export default WritingHistoryModal;
