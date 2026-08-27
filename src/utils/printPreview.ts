/**
 * printPreview.ts — 写作中心「预览态」：Markdown → 打印预览 HTML（R13 三态分离）
 *
 * 三态架构：编辑（tiptap 流式，无页）/ 预览（本文件，浏览器打印分页）/ 交付（docxExport 模板导出）。
 * 样式与 docxExport 的 GB/T 9704 映射同源（字体/字号/行距/缩进逐项对齐）：
 *   - 文档标题：宋体 22pt 加粗居中（2 号）
 *   - 一级标题（#）：黑体 16pt（3 号）
 *   - 二级标题（##）：楷体_GB2312 16pt
 *   - 三级标题（###）/正文：仿宋_GB2312 16pt，行距固定 28 磅，首行缩进 2 字符
 *   - 列表：圆点/编号 + ☐/☑ 任务前缀；引用：缩进灰字；分割线：细线
 * 清洗：复用 stripProtectedSpans + stripStyleAnnotationLines（与导出同一套，预览即所见即所得）。
 * 输出为完整 HTML 文档字符串，进 iframe srcdoc 渲染；@page A4 由浏览器打印引擎真实分页。
 */

import { stripProtectedSpans, stripStyleAnnotationLines } from "./docxExport";

/** GB/T 字体（与 docxExport.ts 同源；导出改字体时两处同步） */
const FONT_TITLE = "宋体";
const FONT_H1 = "黑体";
const FONT_H2 = "楷体_GB2312";
const FONT_BODY = "仿宋_GB2312";

/** 行内标记转 HTML：**粗** *斜* ~~删~~ ==高亮== `[code]`（markdown 语义子集，与编辑器能力对齐） */
function inlineToHtml(text: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  // 先整体转义，再按标记拆分包标签；标记内的内容已被转义，无注入面
  let out = esc(text);
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  out = out.replace(/==([^=]+)==/g, '<mark style="background:#fef3c7">$1</mark>');
  out = out.replace(/`([^`]+)`/g, '<code style="font-family:Consolas,monospace;font-size:.9em">$1</code>');
  out = out.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
  return out;
}

/** 逐行 markdown → 正文 HTML 块（覆盖编辑器支持的全部块类型） */
function markdownToBodyHtml(markdown: string): string {
  const lines = markdown.split("\n");
  const blocks: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const t = raw.trim();
    if (!t) {
      i++;
      continue;
    }
    // 标题
    let m = /^(#{1,3})\s+(.*)$/.exec(t);
    if (m) {
      const level = m[1].length;
      const fonts = [FONT_H1, FONT_H2, FONT_BODY];
      blocks.push(
        `<h${level} style="font-family:${fonts[level - 1]};font-size:16pt;font-weight:700;margin:12pt 0 6pt;line-height:28pt">${inlineToHtml(m[2])}</h${level}>`,
      );
      i++;
      continue;
    }
    // 任务清单
    m = /^[-*]\s+\[([ xX])\]\s+(.*)$/.exec(t);
    if (m) {
      const box = m[1].toLowerCase() === "x" ? "☑" : "☐";
      blocks.push(
        `<p style="margin:0;line-height:28pt;text-indent:2em">${box} ${inlineToHtml(m[2])}</p>`,
      );
      i++;
      continue;
    }
    // 无序列表
    m = /^[-*]\s+(.*)$/.exec(t);
    if (m) {
      blocks.push(
        `<p style="margin:0;line-height:28pt;text-indent:2em">• ${inlineToHtml(m[1])}</p>`,
      );
      i++;
      continue;
    }
    // 有序列表
    m = /^\d+[.、]\s+(.*)$/.exec(t);
    if (m) {
      const num = t.split(/[.、]/)[0];
      blocks.push(
        `<p style="margin:0;line-height:28pt;text-indent:2em">${num}. ${inlineToHtml(m[1])}</p>`,
      );
      i++;
      continue;
    }
    // 引用（含「> 本周风格」标注行——清洗已剔除，此处兜底普通引用）
    m = /^>\s?(.*)$/.exec(t);
    if (m) {
      blocks.push(
        `<p style="margin:0;line-height:28pt;text-indent:2em;color:#6b7280">${inlineToHtml(m[1])}</p>`,
      );
      i++;
      continue;
    }
    // 分割线
    if (/^---+$/.test(t)) {
      blocks.push('<hr style="border:none;border-top:1px solid #d1d5db;margin:8pt 0">');
      i++;
      continue;
    }
    // 表格（简单 | 语法）
    if (t.startsWith("|") && t.endsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }
      const rows = tableLines
        .filter((l) => !/^\|[\s:|-]+\|$/.test(l))
        .map((l) =>
          l
            .replace(/^\||\|$/g, "")
            .split("|")
            .map((c) => c.trim()),
        );
      if (rows.length > 0) {
        const html =
          `<table style="border-collapse:collapse;width:100%;margin:6pt 0">` +
          rows
            .map(
              (r, ri) =>
                "<tr>" +
                r
                  .map(
                    (c) =>
                      `<td style="border:1px solid #9ca3af;padding:4pt 6pt;font-family:${FONT_BODY};font-size:12pt;${ri === 0 ? "font-weight:700;background:#f3f4f6" : ""}">${inlineToHtml(c)}</td>`,
                  )
                  .join("") +
                "</tr>",
            )
            .join("") +
          "</table>";
        blocks.push(html);
      }
      continue;
    }
    // 普通段落
    blocks.push(`<p style="margin:0;line-height:28pt;text-indent:2em">${inlineToHtml(t)}</p>`);
    i++;
  }
  return blocks.join("\n");
}

/** 标题行的 HTML 转义（文档标题，非行内解析） */
function escapeTitle(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * 生成完整打印预览 HTML 文档（进 iframe srcdoc）。
 * @param markdown 编辑器 markdown 原文（内部做与导出一致的清洗）
 * @param title 文档标题
 */
export function buildPrintPreviewHtml(markdown: string, title: string): string {
  const cleaned = stripStyleAnnotationLines(stripProtectedSpans(markdown));
  const body = markdownToBodyHtml(cleaned);
  const titleHtml = `<h1 style="font-family:${FONT_TITLE};font-size:22pt;font-weight:700;text-align:center;margin:0 0 18pt;line-height:32pt">${escapeTitle(title)}</h1>`;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>${escapeTitle(title)}</title>
<style>
  @page { size: A4; margin: 25mm 22mm; }
  html, body { margin: 0; padding: 0; background: #fff; }
  .page {
    width: 210mm; min-height: 297mm; box-sizing: border-box;
    padding: 25mm 22mm; margin: 0 auto; background: #fff;
    font-family: ${FONT_BODY}; font-size: 16pt; color: #1f2328;
  }
  /* 打印：只留纸张内容，隐藏预览壳层交互件 */
  @media print {
    body { background: none; }
    .no-print { display: none !important; }
    .page { width: auto; min-height: auto; padding: 0; }
  }
</style>
</head>
<body><div class="page">${titleHtml}${body}</div></body>
</html>`;
}
