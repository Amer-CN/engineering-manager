/**
 * WritingCheckPanel — 交稿体检面板（写作中心 R6）
 *
 * 四项本地检查（逻辑在 runWritingCheck 纯函数里，不依赖 DOM，可单测）：
 *   1. [[...]] Protected Span 残留标记（导出前应清零）
 *   2. 标题层级跳号（如 H1 直接降到 H3，跳过 H2）
 *   3. 字数统计（textContent 去空白字符数）
 *   4. 空洞套话检测（黑名单：高度重视/积极推进/切实抓好/认真部署/迅速行动/全面落实）
 *
 * 第 5 项（v0.12 新增，走后端 API，纯统计无 LLM）：
 *   5. 量化风格体检 — 按文体对照 style-params.md 参考区间（中位数 + p25-p75），
 *      判定哲学：单项区间外 = hint（不理会），同向 ≥3 项 / 硬冲突 = warn；
 *      无参数文种仅做标点纪律与元评论检测。
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { Editor, JSONContent } from "@tiptap/core";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { styleCheckWriting, type WritingStyleCheckItem, type WritingStyleCheckResponse } from "@/services/writing-client";

/** 单项检查结果 */
export interface CheckResult {
  id: "marker" | "heading" | "wordcount" | "cliche";
  label: string;
  ok: boolean;
  /** 警告时的摘要（如「发现 2 处」）；通过时的摘要（如「无残留」） */
  summary: string;
  /** 警告详情行（每条一行文本） */
  details: string[];
}

/** 套话黑名单（前三个来自 SKILL.md 输出规范第 7 条明文，后三个同频公文套话） */
const CLICHE_WORDS = ["高度重视", "积极推进", "切实抓好", "认真部署", "迅速行动", "全面落实"] as const;

/** 上下文展示宽度：命中词前后各取的字符数 */
const CONTEXT_CHARS = 12;

/** 递归遍历 doc JSON，收集所有 heading 节点的 { level, text } */
function collectHeadings(node: JSONContent, out: { level: number; text: string }[]): void {
  if (node.type === "heading") {
    out.push({ level: node.attrs?.level ?? 1, text: flattenText(node) });
  }
  for (const child of node.content ?? []) collectHeadings(child, out);
}

/** 递归取 doc JSON 的纯文本（等价 ProseMirror 的 doc.textContent） */
function flattenText(node: JSONContent): string {
  if (node.text) return node.text;
  return (node.content ?? []).map(flattenText).join("");
}

/** ── 检查 1：[[...]] 残留标记 ── */
function checkMarkers(text: string): CheckResult {
  const re = /\[\[([^\[\]]+?)\]\]/g;
  const matches: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) matches.push(m[1]);
  const ok = matches.length === 0;
  const details = ok ? [] : matches.slice(0, 5).map((s) => `[[${s}]]`);
  if (matches.length > 5) details.push(`…等共 ${matches.length} 处`);
  return {
    id: "marker",
    label: "保护标记残留",
    ok,
    summary: ok ? "无 [[ ]] 残留" : `发现 ${matches.length} 处 [[ ]] 残留`,
    details,
  };
}

/** ── 检查 2：标题层级跳号（只报「从 level n 直接降到 ≥n+2」） ── */
function checkHeadingSkips(doc: JSONContent): CheckResult {
  const headings: { level: number; text: string }[] = [];
  collectHeadings(doc, headings);
  const skips: string[] = [];
  for (let i = 1; i < headings.length; i++) {
    const prev = headings[i - 1].level;
    const cur = headings[i].level;
    if (cur >= prev + 2) {
      skips.push(`H${prev}「${headings[i - 1].text.slice(0, 10)}」→ H${cur}「${headings[i].text.slice(0, 10)}」，跳过 H${prev + 1}`);
    }
  }
  return {
    id: "heading",
    label: "标题层级",
    ok: skips.length === 0,
    summary: skips.length === 0 ? "层级连续" : `发现 ${skips.length} 处跳号`,
    details: skips.slice(0, 5),
  };
}

/** ── 检查 3：字数（去空白字符数） ── */
function checkWordCount(text: string): CheckResult {
  const count = text.replace(/\s/g, "").length;
  return {
    id: "wordcount",
    label: "字数统计",
    ok: true,
    summary: `${count} 字`,
    details: [],
  };
}

/** ── 检查 4：空洞套话 ── */
function checkCliches(text: string): CheckResult {
  const details: string[] = [];
  let total = 0;
  for (const word of CLICHE_WORDS) {
    let count = 0;
    let firstIdx = -1;
    let from = 0;
    for (;;) {
      const i = text.indexOf(word, from);
      if (i < 0) break;
      if (count === 0) firstIdx = i;
      count++;
      from = i + word.length;
    }
    if (count > 0) {
      total += count;
      const ctxStart = Math.max(0, firstIdx - CONTEXT_CHARS);
      const ctxEnd = Math.min(text.length, firstIdx + word.length + CONTEXT_CHARS);
      details.push(`「${word}」× ${count}：…${text.slice(ctxStart, ctxEnd)}…`);
    }
  }
  return {
    id: "cliche",
    label: "空洞套话",
    ok: total === 0,
    summary: total === 0 ? "未命中黑名单" : `命中 ${total} 处（${details.length} 个词）`,
    details,
  };
}

/**
 * 交稿体检主函数（纯函数，不依赖 DOM）。
 * @param input 编辑器 doc JSON（推荐）或 markdown 字符串
 */
export function runWritingCheck(input: JSONContent | string): CheckResult[] {
  // 字符串输入：markdown / 纯文本。标题层级从 markdown 标题行解析。
  if (typeof input === "string") {
    const text = input;
    const headings: { level: number; text: string }[] = [];
    for (const line of text.split("\n")) {
      const m = /^(#{1,3})\s+(.*)$/.exec(line.trim());
      if (m) headings.push({ level: m[1].length, text: m[2] });
    }
    return [
      checkMarkers(text),
      checkHeadingSkips({ type: "doc", content: headings.map((h) => ({ type: "heading", attrs: { level: h.level }, content: [{ type: "text", text: h.text }] })) }),
      checkWordCount(text),
      checkCliches(text),
    ];
  }
  const text = flattenText(input);
  return [checkMarkers(text), checkHeadingSkips(input), checkWordCount(text), checkCliches(text)];
}

interface WritingCheckPanelProps {
  editor: Editor;
  open: boolean;
  onClose: () => void;
  /** 文体代码（量化体检的文种映射用）；未传时后端按无参数文种降级（仅标点纪律） */
  docType?: string | null;
}

/** 体检单项 verdict 展示（ok 区间内 / hint 单项区间外 / warn 硬冲突或同向偏离） */
function styleVerdictMark(v: WritingStyleCheckItem["verdict"]): { mark: string; color: string } {
  if (v === "ok") return { mark: "✓", color: "var(--success)" };
  if (v === "warn") return { mark: "⚠", color: "var(--warning)" };
  return { mark: "△", color: "var(--muted)" };
}

const WritingCheckPanel: React.FC<WritingCheckPanelProps> = ({ editor, open, onClose, docType }) => {
  const results = useMemo<CheckResult[]>(
    () => (open ? runWritingCheck(editor.getJSON()) : []),
    [open, editor],
  );

  // ── 第 5 项：量化风格体检（面板打开即随前四项刷新节奏触发，可手动重跑） ──
  const [styleReport, setStyleReport] = useState<WritingStyleCheckResponse | null>(null);
  const [styleBusy, setStyleBusy] = useState(false);
  const [styleError, setStyleError] = useState<string | null>(null);

  const runStyleCheck = useCallback(async () => {
    setStyleBusy(true);
    setStyleError(null);
    try {
      const res = await styleCheckWriting({ docType: docType ?? "", content: editor.getText() });
      if (res.success && res.data) setStyleReport(res.data);
      else setStyleError(res.error || "体检失败，请稍后重试");
    } catch {
      setStyleError("体检请求失败");
    } finally {
      setStyleBusy(false);
    }
  }, [editor, docType]);

  useEffect(() => {
    if (!open) return;
    setStyleReport(null);
    setStyleError(null);
    void runStyleCheck();
  }, [open, runStyleCheck]);

  // Esc 关闭（模式同 WritingExportMenu：document keydown）
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const warnCount = results.filter((r) => !r.ok).length;
  const hardCount = styleReport?.hardWarnings.length ?? 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="w-full max-w-md max-h-[85vh] flex flex-col rounded-xl border shadow-xl bg-white"
        style={{ borderColor: "var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--fg)" }}>
            <Icon name="FileCheck" size={15} />
            交稿体检
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="关闭">
            <Icon name="X" size={15} />
          </Button>
        </div>

        <div className="space-y-2 p-4 flex-1 overflow-y-auto">
          {results.map((r) => (
            <div key={r.id} className="rounded-lg border p-3" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2 text-sm" style={{ color: "var(--fg)" }}>
                <span style={{ color: r.ok ? "var(--success)" : "var(--warning)" }}>{r.ok ? "✓" : "⚠"}</span>
                <span className="font-medium">{r.label}</span>
                <span className="ml-auto text-xs" style={{ color: r.ok ? "var(--success)" : "var(--warning)" }}>
                  {r.summary}
                </span>
              </div>
              {r.details.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {r.details.map((d, i) => (
                    <li key={i} className="text-xs" style={{ color: "var(--muted)" }}>
                      · {d}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {/* 第 5 项：量化风格体检（后端纯统计，对照 style-params.md 参考区间） */}
          <div className="rounded-lg border p-3" style={{ borderColor: "var(--border)" }} data-testid="styleparams-check">
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--fg)" }}>
              <Icon name="FileCheck" size={15} />
              <span className="font-medium">量化风格体检</span>
              <span className="text-xs" style={{ color: "var(--muted)" }}>
                {styleBusy ? "检测中…" : styleReport ? styleReport.genre : styleError ? "不可用" : ""}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => void runStyleCheck()}
                disabled={styleBusy}
              >
                {styleBusy ? "体检中" : "运行体检"}
              </Button>
            </div>

            {styleError && (
              <div className="mt-2 text-xs" style={{ color: "var(--warning)" }}>
                · {styleError}
              </div>
            )}

            {styleReport && (
              <>
                <div className="mt-2">
                  {styleReport.items.map((item) => {
                    const { mark, color } = styleVerdictMark(item.verdict);
                    const range =
                      item.low != null && item.high != null
                        ? `参考 ${item.low}-${item.high}（中位 ${item.median}）`
                        : "无参考区间";
                    return (
                      <div key={item.id} className="flex items-center gap-2 py-0.5 text-xs" style={{ color: "var(--fg)" }}>
                        <span style={{ color }}>{mark}</span>
                        <span>{item.label}</span>
                        <span style={{ color: "var(--muted)" }}>{range}</span>
                        <span className="ml-auto font-medium">
                          {item.actual}
                          {item.unit}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {styleReport.hardWarnings.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {styleReport.hardWarnings.map((w, i) => (
                      <li key={i} className="text-xs" style={{ color: "var(--warning)" }}>
                        ⚠ {w}
                      </li>
                    ))}
                  </ul>
                )}

                {styleReport.notes.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {styleReport.notes.map((n, i) => (
                      <li key={i} className="text-xs" style={{ color: "var(--muted)" }}>
                        · {n}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>

        <div className="px-4 py-3 border-t text-xs" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
          {warnCount === 0 && hardCount === 0
            ? "四项检查全部通过，可以交稿"
            : `共 ${warnCount + hardCount} 项提醒`}
        </div>
      </div>
    </div>
  );
};

export default WritingCheckPanel;
