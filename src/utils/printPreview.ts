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

/** 行内标记转 HTML：**粗** *斜* ~~删~~ ==高亮== `[code]` ![图片]（markdown 语义子集，与编辑器能力对齐） */
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
  // 图片（阶段三）：![alt](src)——仅接受 base64 dataUrl 或 http(s) URL，其余写法原样保留不误伤。
  // 放在其余标记之后：base64 字符集不含 * ~ ` 等标记字符，src 不会被上面的替换破坏。
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (all, alt: string, src: string) => {
    if (!/^data:image\//.test(src) && !/^https?:\/\//.test(src)) return all;
    return `<img src="${src}" alt="${alt}" style="max-width:100%">`;
  });
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
    // 独立成行的图片（阶段三）：居中展示；行内混排的图片由 inlineToHtml 处理
    if (/^!\[[^\]]*\]\([^)\s]+\)$/.test(t)) {
      blocks.push(`<p style="margin:6pt 0;text-align:center">${inlineToHtml(t)}</p>`);
      i++;
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

// ── sourceHtml 白名单清洗（050 双写：编辑器 HTML 是样式唯一载体）──

/** 允许保留的标签：p/h1-3/span/mark/u/strong/em/del/s/ul/ol/li/blockquote + table 系 + br/hr/img（编辑器输出集） */
const PRINT_KEEP_TAGS = new Set([
  "p", "h1", "h2", "h3", "span", "mark", "u", "strong", "em", "del", "s",
  "ul", "ol", "li", "blockquote", "br", "hr", "img",
  "table", "thead", "tbody", "tr", "td", "th",
]);

/** 整树丢弃（脚本/样式/壳层，防注入） */
const PRINT_DROP_TAGS = new Set(["script", "style", "link", "meta", "iframe", "object", "embed"]);

/** style 属性白名单（050：color/background(-color)/font-size/font-family/text-align） */
const PRINT_STYLE_PROPS = new Set(["color", "background", "background-color", "font-size", "font-family", "text-align"]);

/** 过滤 style 属性：仅保留白名单属性声明（保持原声明文本） */
function filterStyleAttr(style: string): string {
  return style
    .split(";")
    .map((d) => d.trim())
    .filter(Boolean)
    .filter((d) => PRINT_STYLE_PROPS.has(d.slice(0, d.indexOf(":")).trim().toLowerCase()))
    .join(";");
}

/** img src 协议白名单（与 pasteSanitizer 同源：data:image/ 非 svg，或 http(s)） */
function isSafeImgSrc(src: string): boolean {
  const v = src.trim().toLowerCase();
  if (v.startsWith("data:image/")) return !v.startsWith("data:image/svg+xml");
  return /^https?:\/\//.test(v);
}

/** 递归重建：白名单标签保留（style 过滤），未识别标签去标签留内容，DROP 整树丢弃 */
function rebuildPrintNode(src: Node, out: Node): void {
  const doc = out.ownerDocument!;
  for (const child of Array.from(src.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      out.appendChild(child.cloneNode(true));
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue; // 注释等一律丢弃
    const el = child as Element;
    const tag = el.tagName.toLowerCase();
    if (tag.includes(":") || PRINT_DROP_TAGS.has(tag)) continue;
    if (!PRINT_KEEP_TAGS.has(tag)) {
      rebuildPrintNode(el, out); // 未识别标签：递归上提子节点
      continue;
    }
    const created = doc.createElement(tag);
    if (tag === "img") {
      const imgSrc = el.getAttribute("src");
      if (imgSrc && isSafeImgSrc(imgSrc)) created.setAttribute("src", imgSrc);
      const alt = el.getAttribute("alt");
      if (alt != null) created.setAttribute("alt", alt);
    }
    if (tag === "td" || tag === "th") {
      for (const name of ["colspan", "rowspan"]) {
        const v = el.getAttribute(name);
        if (v != null) created.setAttribute(name, v);
      }
    }
    const style = el.getAttribute("style");
    if (style) {
      const filtered = filterStyleAttr(style);
      if (filtered) created.setAttribute("style", filtered);
    }
    rebuildPrintNode(el, created);
    out.appendChild(created);
  }
}

/** 清洗编辑器 HTML：白名单标签 + style 白名单属性，供打印预览/网页导出直接使用 */
function sanitizeSourceHtml(html: string): string {
  if (typeof html !== "string" || html.trim() === "") return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  const out = doc.createElement("div");
  rebuildPrintNode(doc.body, out);
  return out.innerHTML;
}

/**
 * 生成完整打印预览 HTML 文档（进 iframe srcdoc）。
 * @param markdown 编辑器 markdown 原文（内部做与导出一致的清洗）
 * @param title 文档标题
 * @param sourceHtml 编辑器 getHTML()（050 双写）；非空时经白名单清洗直接用（样式唯一载体），
 *   为空/缺省走 markdown 路径（与现状逐字节一致）
 */
export function buildPrintPreviewHtml(markdown: string, title: string, sourceHtml?: string): string {
  const cleaned = stripStyleAnnotationLines(stripProtectedSpans(markdown));
  const body =
    sourceHtml && sourceHtml.trim() !== ""
      ? sanitizeSourceHtml(sourceHtml)
      : markdownToBodyHtml(cleaned);
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
