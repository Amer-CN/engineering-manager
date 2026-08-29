/**
 * WritingExportMenu — 写作中心导出菜单（多格式中心 R15）
 *
 * 「导出」按钮点开下拉，7 项（含分隔线）：
 *   ① Markdown（.md）        — contentMd 原文下载（text/markdown）
 *   ② 纯文本（.txt）         — stripMarkdownSyntax(contentMd) 下载（text/plain）
 *   ③ 网页 HTML（.html）     — buildPrintPreviewHtml(contentMd, title) 下载（text/html）
 *   ─────────────
 *   ⑤ Word 普通版式（.docx） — 现有 docxExport 公文样式链路
 *   ⑥ Word 红头文件（.docx） — 现有红头表单链路（GB/T 9704 模板，保留表单）
 *   ⑦ PDF                   — onOpenPreview() 打开打印预览，用户在预览里打印/另存 PDF
 *
 * 红头需补元数据（机关标志 / 发文字号 / 主送 / 落款 / 成文日期 / 版记），
 * 成文日期默认今天。确认后 exportRedHeaderDocx 填充模板下载。
 * 导出链路本体（printPreview / docxExport / redHeaderExport）不动，仅加调用。
 */

import React, { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { useToastContext } from "@/components/ui/Toast/ToastProvider";
import { exportMarkdownAsDocx } from "@/utils/docxExport";
import { exportRedHeaderDocx } from "@/utils/redHeaderExport";
import { downloadTextFile, stripMarkdownSyntax } from "@/utils/exportFormats";
import { buildPrintPreviewHtml } from "@/utils/printPreview";

interface WritingExportMenuProps {
  editor: Editor | null;
  title: string;
  /** R15：PDF 导出入口——打开打印预览（用户在预览里打印/另存 PDF），与顶栏「预览」按钮同源 */
  onOpenPreview: () => void;
}

/** 红头元数据表单（单对象 state，控制在 useState 数量上限内） */
interface RedForm {
  orgName: string;
  docNumber: string;
  recipient: string;
  sender: string;
  date: string;
  recordInfo: string;
}

/** 成文日期默认今天（YYYY-MM-DD，本地时区） */
function today(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

const inputStyle = {
  borderColor: "var(--border)",
  background: "var(--panel)",
  color: "var(--fg)",
} as const;

const labelStyle = { color: "var(--fg-2)" } as const;

const WritingExportMenu: React.FC<WritingExportMenuProps> = ({ editor, title, onOpenPreview }) => {
  const { showToast } = useToastContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const [redOpen, setRedOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<RedForm>({
    orgName: "",
    docNumber: "",
    recipient: "",
    sender: "",
    date: today(),
    recordInfo: "",
  });
  const rootRef = useRef<HTMLDivElement>(null);

  const setField = (key: keyof RedForm, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  // 点外部 / Esc 关闭
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // 普通导出（沿用 docxExport 公文样式）；busy 防连点（生成中禁用，双击不会并发两次）
  const handlePlain = () => {
    if (!editor || busy) return;
    setMenuOpen(false);
    setBusy(true);
    void exportMarkdownAsDocx(editor.getMarkdown(), title)
      .catch(() => {
        showToast("导出失败", "error");
      })
      .finally(() => setBusy(false));
  };

  // 红头导出：校验必填 → exportRedHeaderDocx
  const handleRedExport = async () => {
    if (!editor) return;
    if (!form.orgName.trim()) {
      showToast("请填写机关标志名", "error");
      return;
    }
    setBusy(true);
    try {
      await exportRedHeaderDocx(editor.getMarkdown(), {
        title,
        orgName: form.orgName.trim(),
        docNumber: form.docNumber.trim(),
        recipient: form.recipient.trim(),
        sender: form.sender.trim() || form.orgName.trim(),
        date: form.date.trim(),
        recordInfo: form.recordInfo.trim(),
      });
      showToast("红头文件已生成下载", "success");
      setRedOpen(false);
      setMenuOpen(false);
    } catch (e) {
      // 具体报错：拼进后端/异常消息，msg 为空回退原文案
      const msg = (e as Error).message;
      showToast(msg ? `红头导出失败：${msg}` : "红头导出失败", "error");
    } finally {
      setBusy(false);
    }
  };

  // R15 多格式：md/txt/html 由 downloadTextFile 实现（busy 共用，防连点）
  const handleTextExport = (ext: "md" | "txt" | "html") => {
    if (!editor || busy) return;
    const md = editor.getMarkdown();
    setMenuOpen(false);
    setBusy(true);
    try {
      if (ext === "md") {
        downloadTextFile(`${title}.md`, md, "text/markdown");
      } else if (ext === "txt") {
        downloadTextFile(`${title}.txt`, stripMarkdownSyntax(md), "text/plain");
      } else {
        downloadTextFile(`${title}.html`, buildPrintPreviewHtml(md, title), "text/html");
      }
    } catch {
      showToast("导出失败", "error");
    } finally {
      setBusy(false);
    }
  };

  const field = (
    label: string,
    key: keyof RedForm,
    placeholder: string,
  ) => (
    <div>
      <label className="text-xs font-medium block mb-1" style={labelStyle}>
        {label}
      </label>
      <input
        value={form[key]}
        onChange={(e) => setField(key, e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 px-3 rounded-lg text-sm border focus:outline-none"
        style={inputStyle}
      />
    </div>
  );

  /** 菜单项样式（统一）：图标 + 主文案 + 可选副文案 */
  const itemCls =
    "w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[color:var(--panel-2)] disabled:opacity-50";

  return (
    <div className="relative" ref={rootRef}>
      {/* 导出按钮：busy（生成中）时禁用，防连点并发两次导出 */}
      <Button variant="ghost" size="sm" onClick={() => setMenuOpen((v) => !v)} disabled={busy}>
        <Icon name="FileDown" size={15} />
        导出
      </Button>

      {menuOpen && (
        <div
          className="absolute right-0 z-50 mt-1 w-56 rounded-xl border shadow-lg overflow-hidden bg-white py-1"
          style={{ borderColor: "var(--border)" }}
        >
          {/* ① Markdown 原文 */}
          <button
            onClick={() => handleTextExport("md")}
            disabled={busy}
            className={itemCls}
            style={{ color: "var(--fg)" }}
          >
            <Icon name="Braces" size={15} />
            <span className="flex flex-col items-start">
              <span>Markdown</span>
              <span className="text-xs" style={{ color: "var(--muted)" }}>.md 原文</span>
            </span>
          </button>
          {/* ② 纯文本（剥 markdown 标记） */}
          <button
            onClick={() => handleTextExport("txt")}
            disabled={busy}
            className={itemCls}
            style={{ color: "var(--fg)" }}
          >
            <Icon name="FileText" size={15} />
            <span className="flex flex-col items-start">
              <span>纯文本</span>
              <span className="text-xs" style={{ color: "var(--muted)" }}>.txt</span>
            </span>
          </button>
          {/* ③ 网页 HTML（复用打印预览样式） */}
          <button
            onClick={() => handleTextExport("html")}
            disabled={busy}
            className={itemCls}
            style={{ color: "var(--fg)" }}
          >
            <Icon name="Code" size={15} />
            <span className="flex flex-col items-start">
              <span>网页 HTML</span>
              <span className="text-xs" style={{ color: "var(--muted)" }}>.html</span>
            </span>
          </button>

          {/* ④ 分隔线 */}
          <div className="my-1 border-t" style={{ borderColor: "var(--border)" }} />

          {/* ⑤ Word 普通版式 */}
          <button
            onClick={handlePlain}
            disabled={busy}
            className={itemCls}
            style={{ color: "var(--fg)" }}
          >
            <Icon name="FileDown" size={15} />
            <span className="flex flex-col items-start">
              <span>Word 普通版式</span>
              <span className="text-xs" style={{ color: "var(--muted)" }}>.docx</span>
            </span>
          </button>
          {/* ⑥ Word 红头文件（保留表单链路） */}
          <button
            onClick={() => setRedOpen(true)}
            disabled={busy}
            className={itemCls}
            style={{ color: "var(--fg)" }}
          >
            <Icon name="Landmark" size={15} />
            <span className="flex flex-col items-start">
              <span>Word 红头文件</span>
              <span className="text-xs" style={{ color: "var(--muted)" }}>.docx</span>
            </span>
          </button>
          {/* ⑦ PDF：打开打印预览，用户在预览里打印/另存 PDF */}
          <button
            onClick={() => {
              setMenuOpen(false);
              onOpenPreview();
            }}
            disabled={busy}
            className={itemCls}
            style={{ color: "var(--fg)" }}
          >
            <Icon name="Printer" size={15} />
            <span className="flex flex-col items-start">
              <span>PDF</span>
              <span className="text-xs" style={{ color: "var(--muted)" }}>通过打印预览</span>
            </span>
          </button>
        </div>
      )}

      {/* 红头元数据表单（遮罩用纯半透明底色；玻璃效果仅限白名单浮层） */}
      {redOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setRedOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border shadow-xl bg-white"
            style={{ borderColor: "var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
              <h3 className="text-sm font-semibold" style={{ color: "var(--fg)" }}>
                红头文件导出
              </h3>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                GB/T 9704 公文格式：{title}
              </p>
            </div>
            <div className="space-y-3 p-4">
              {field("机关标志名 *", "orgName", "如：某某建设工程有限公司")}
              {field("发文字号", "docNumber", "如：某建司发〔2026〕12号")}
              {field("主送机关", "recipient", "如：各项目部、各部门：")}
              {field("落款机关", "sender", "默认同机关标志名")}
              {field("成文日期", "date", "YYYY-MM-DD")}
              {field("抄送 / 印发信息（可空）", "recordInfo", "版记，如：抄送：监理单位。")}
            </div>
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t" style={{ borderColor: "var(--border)" }}>
              <Button variant="ghost" size="sm" onClick={() => setRedOpen(false)}>
                取消
              </Button>
              <Button size="sm" onClick={() => void handleRedExport()} loading={busy} disabled={busy}>
                <Icon name="FileDown" size={15} />
                导出
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WritingExportMenu;
