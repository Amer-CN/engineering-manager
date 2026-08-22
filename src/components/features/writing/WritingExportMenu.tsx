/**
 * WritingExportMenu — 写作中心导出菜单（红头文件 R1）
 *
 * 「导出」按钮点开下拉：普通 docx 导出 / 红头文件导出（GB/T 9704 模板）。
 * 红头需补元数据（机关标志 / 发文字号 / 主送 / 落款 / 成文日期 / 版记），
 * 成文日期默认今天。确认后 exportRedHeaderDocx 填充模板下载。
 */

import React, { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/hooks/useToast";
import { exportMarkdownAsDocx } from "@/utils/docxExport";
import { exportRedHeaderDocx } from "@/utils/redHeaderExport";

interface WritingExportMenuProps {
  editor: Editor | null;
  title: string;
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

const WritingExportMenu: React.FC<WritingExportMenuProps> = ({ editor, title }) => {
  const { showToast } = useToast();
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

  // 普通导出（沿用 docxExport 公文样式）
  const handlePlain = () => {
    if (!editor) return;
    setMenuOpen(false);
    void exportMarkdownAsDocx(editor.getMarkdown(), title).catch(() => {
      showToast("导出失败", "error");
    });
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
    } catch {
      showToast("红头导出失败", "error");
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

  return (
    <div className="relative" ref={rootRef}>
      <Button variant="ghost" size="sm" onClick={() => setMenuOpen((v) => !v)}>
        <Icon name="FileDown" size={15} />
        导出
      </Button>

      {menuOpen && (
        <div
          className="absolute right-0 z-50 mt-1 w-44 rounded-xl border shadow-lg overflow-hidden bg-white py-1"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            onClick={handlePlain}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[color:var(--panel-2)]"
            style={{ color: "var(--fg)" }}
          >
            <Icon name="FileText" size={15} />
            普通文档
          </button>
          <button
            onClick={() => setRedOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[color:var(--panel-2)]"
            style={{ color: "var(--fg)" }}
          >
            <Icon name="Landmark" size={15} />
            红头文件
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
