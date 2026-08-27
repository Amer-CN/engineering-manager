/**
 * WritingPreviewModal — 写作中心「预览态」（R13 三态分离）
 *
 * 全屏 Modal 内嵌 iframe（srcdoc 渲染 printPreview 生成的 GB/T 版式 HTML），
 * 浏览器原生 A4 分页即真实分页。工具条：「打印 / 另存为 PDF」调 iframe contentWindow.print()；
 * 提示条说明三态关系（编辑视图无页概念，版式以本预览与 docx 导出为准）。
 * 每 30 行 HTML 只在 open 变化时重建（useMemo），预览期间可继续编辑不做实时同步——
 * 预览是交付前的「快照检查」，不是第二编辑器。
 */

import React, { useMemo, useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { buildPrintPreviewHtml } from "@/utils/printPreview";

interface WritingPreviewModalProps {
  open: boolean;
  onClose: () => void;
  markdown: string;
  title: string;
}

const WritingPreviewModal: React.FC<WritingPreviewModalProps> = ({ open, onClose, markdown, title }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const html = useMemo(
    () => (open ? buildPrintPreviewHtml(markdown, title.trim() || "未命名文档") : ""),
    [open, markdown, title],
  );

  const handlePrint = () => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.focus();
      win.print();
    } catch {
      // WebView2 某些版本对跨 frame print 受限时，退回新窗口打印
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(html);
        w.document.close();
        window.setTimeout(() => w.print(), 300);
      }
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      size="full"
      title={
        <span className="flex items-center gap-2">
          <Icon name="Eye" size={16} />
          打印预览（A4 分页 · GB/T 版式）
        </span>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            编辑视图为连续单页；分页与版式以本预览和导出 docx 为准
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              关闭
            </Button>
            <Button onClick={handlePrint}>
              <Icon name="Printer" size={15} />
              打印 / 另存为 PDF
            </Button>
          </div>
        </div>
      }
    >
      <div className="h-full flex flex-col" style={{ minHeight: "60vh" }}>
        {/* 灰底纸感容器：iframe 白纸居中，模拟打印纸叠 */}
        <div
          className="flex-1 overflow-auto rounded-lg"
          style={{ background: "var(--panel-2)", padding: "16px 0" }}
        >
          <iframe
            ref={iframeRef}
            title="文档打印预览"
            srcDoc={html}
            className="block mx-auto bg-white"
            style={{ width: "794px", maxWidth: "100%", minHeight: "70vh", border: "none", boxShadow: "0 1px 6px rgba(0,0,0,.18)" }}
          />
        </div>
      </div>
    </Modal>
  );
};

export default WritingPreviewModal;
