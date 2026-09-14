import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, ImageRun } from "docx";

/**
 * Markdown → docx 公文样式导出
 *
 * 映射规则（公文体）：
 *   - 一级/二级/三级标题 → HeadingLevel（黑体，居中可选）
 *   - 有序/无序列表 → 带编号/圆点段落
 *   - 任务清单（- [ ] / - [x]）→「☐ / ☑」前缀段落
 *   - 粗体 **x** → bold；斜体 *x* → italics；删除线 ~~x~~ → strike；高亮 ==x== → 黄色底纹
 *   - 图片 ![alt](src) → ImageRun（base64/远程 URL，内嵌；超宽等比缩到 440pt）
 *   - 表格（简单解析 | a | b |）→ docx Table
 *   - 引用 > → 缩进 + 灰色
 *   - 分割线 --- → 空段
 *   - 正文 → 仿宋_GB2312 3 号（16pt），行距固定 28 磅，首行缩进 2 字符
 *   - 标题字体按 GB/T 9704-2012：文档标题宋体（小标宋回落）加粗 2 号居中；
 *     一级标题（一、）黑体 3 号；二级标题（（一））楷体_GB2312 3 号；三级标题（1.）仿宋_GB2312 3 号
 */

// GB/T 9704-2012《党政机关公文格式》字体字号（字号 half-point：2号=22pt→44，3号=16pt→32）
const FONT_TITLE = "宋体"; // 文档标题（小标宋体，Windows 无小标宋，回落到宋体）
const FONT_H1 = "黑体"; // 一级标题（一、）
const FONT_H2 = "楷体_GB2312"; // 二级标题（（一））
const FONT_BODY = "仿宋_GB2312"; // 正文 / 三级标题（1.）

/** 行距固定 28 磅（1/20 磅单位：28*20=560） */
const LINE_SPACING_28PT = { line: 560, lineRule: "exact" as const };

/** 图片最大渲染宽度（pt，A4 版心约 451pt） */
const IMG_MAX_WIDTH = 440;

/**
 * 剥掉 [[...]] Protected Span 标记（导出清洗）。
 * 正则与 protectedSpan.ts 的 markdownTokenizer 一致（非贪婪、内容不含方括号）；
 * 嵌套残壳时从最内层剥起，循环 replace 到不动点（上限 3 轮防死循环）。
 */
export function stripProtectedSpans(markdown: string): string {
  let out = markdown;
  for (let i = 0; i < 3; i++) {
    const next = out.replace(/\[\[([^\[\]]+?)\]\]/g, "$1");
    if (next === out) break;
    out = next;
  }
  return out;
}

/**
 * 整行剔除「> 本周风格：…」风格标注行（R4 风格轮换写进正文的元信息，公文导出不得携带）。
 * 兼容「>本周风格」无空格写法与前导空白；其余 blockquote 行不动（由 classify 各自处理）。
 */
export function stripStyleAnnotationLines(markdown: string): string {
  return markdown
    .split("\n")
    .filter((line) => !/^\s*>\s*本周风格：/.test(line))
    .join("\n");
}

interface MdLine {
  text: string;
  kind: "h1" | "h2" | "h3" | "ul" | "ol" | "quote" | "hr" | "table" | "task" | "image" | "para";
  order?: number; // ol 序号
  checked?: boolean; // task 是否勾选
}

function classify(line: string, olIndex: number): MdLine {
  const t = line.trim();
  if (/^#\s+/.test(t)) return { text: t.replace(/^#\s+/, ""), kind: "h1" };
  if (/^##\s+/.test(t)) return { text: t.replace(/^##\s+/, ""), kind: "h2" };
  if (/^###\s+/.test(t)) return { text: t.replace(/^###\s+/, ""), kind: "h3" };
  const task = /^[-*]\s+\[([ xX])\]\s+/.exec(t);
  if (task) return { text: t.slice(task[0].length), kind: "task", checked: task[1].toLowerCase() === "x" };
  if (/^!\[[^\]]*\]\([^)]*\)$/.test(t)) return { text: t, kind: "image" };
  if (/^[-*]\s+/.test(t)) return { text: t.replace(/^[-*]\s+/, ""), kind: "ul" };
  if (/^\d+[.、]\s+/.test(t)) return { text: t.replace(/^\d+[.、]\s+/, ""), kind: "ol", order: olIndex };
  if (/^>\s?/.test(t)) return { text: t.replace(/^>\s?/, ""), kind: "quote" };
  if (/^---+$/.test(t)) return { text: "", kind: "hr" };
  if (t.startsWith("|") && t.endsWith("|") && t.includes("|")) return { text: t, kind: "table" };
  return { text: line, kind: "para" };
}

interface InlineStyle {
  bold?: boolean;
  italics?: boolean;
  strike?: boolean;
  highlight?:
    | "none" | "black" | "blue" | "cyan" | "green" | "magenta" | "red" | "white" | "yellow"
    | "darkBlue" | "darkCyan" | "darkGray" | "darkGreen" | "darkMagenta" | "darkRed" | "darkYellow" | "lightGray";
  color?: string;
}

const INLINE_DELIMS: { open: string; close: string; apply: InlineStyle }[] = [
  { open: "**", close: "**", apply: { bold: true } },
  { open: "~~", close: "~~", apply: { strike: true } },
  { open: "==", close: "==", apply: { highlight: "yellow" } },
  { open: "*", close: "*", apply: { italics: true } },
];

/** 解析行内标记（**粗** / *斜* / ~~删~~ / ==高亮==，可嵌套）→ TextRun[] */
function parseInline(text: string, base: InlineStyle = {}): TextRun[] {
  // 找最早出现的起始标记；同位置优先更长标记（** 先于 *）
  let best: { start: number; open: string; close: string; apply: InlineStyle } | null = null;
  for (const d of INLINE_DELIMS) {
    const i = text.indexOf(d.open);
    if (i >= 0 && (!best || i < best.start || (i === best.start && d.open.length > best.open.length))) {
      best = { start: i, open: d.open, close: d.close, apply: d.apply };
    }
  }
  if (!best) return [new TextRun({ text, font: FONT_BODY, ...base })];
  const end = text.indexOf(best.close, best.start + best.open.length);
  if (end < 0) {
    // 无闭合标记 → 当作字面量
    return [
      new TextRun({ text: text.slice(0, best.start + best.open.length), font: FONT_BODY, ...base }),
      ...parseInline(text.slice(best.start + best.open.length), base),
    ];
  }
  const runs: TextRun[] = [];
  if (best.start > 0) runs.push(new TextRun({ text: text.slice(0, best.start), font: FONT_BODY, ...base }));
  runs.push(...parseInline(text.slice(best.start + best.open.length, end), { ...base, ...best.apply }));
  runs.push(...parseInline(text.slice(end + best.close.length), base));
  return runs;
}

function mdLineToParagraph(ml: MdLine): Paragraph {
  switch (ml.kind) {
    case "h1":
      return new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: ml.text, bold: true, font: FONT_H1, size: 32 })],
      });
    case "h2":
      return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: ml.text, bold: true, font: FONT_H2, size: 32 })],
      });
    case "h3":
      return new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: ml.text, bold: true, font: FONT_BODY, size: 32 })],
      });
    case "task":
      return new Paragraph({
        children: [
          new TextRun({ text: ml.checked ? "☑ " : "☐ ", bold: true, font: FONT_BODY }),
          ...parseInline(ml.text),
        ],
      });
    case "ul":
      return new Paragraph({ bullet: { level: 0 }, children: parseInline(ml.text) });
    case "ol":
      return new Paragraph({ numbering: { reference: "ol", level: 0 }, children: parseInline(ml.text) });
    case "quote":
      return new Paragraph({
        indent: { left: 400 },
        children: parseInline(ml.text, { italics: true, color: "666666" }),
      });
    case "hr":
      return new Paragraph({ children: [new TextRun({ text: "───────", color: "CCCCCC" })] });
    case "para":
    default:
      return new Paragraph({
        spacing: { after: 120, ...LINE_SPACING_28PT },
        indent: { firstLine: 640 },
        children: parseInline(ml.text),
      });
  }
}

function mdTableToRows(tableText: string): string[][] {
  const lines = tableText.trim().split("\n");
  return lines
    .filter((l) => l.includes("|"))
    .map((l) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim()));
}

// ── 图片：base64 数据 → bytes；尺寸嗅探（PNG/JPEG）──

function dataUrlToBytes(url: string): Uint8Array | null {
  const m = /^data:[^;,]+;base64,([\s\S]+)$/.exec(url);
  if (!m) return null;
  try {
    const bin = atob(m[1].trim());
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

async function fetchImageBytes(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

function sniffImageType(bytes: Uint8Array): "png" | "jpg" | "gif" {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpg";
  if (String.fromCharCode(bytes[0], bytes[1], bytes[2]) === "GIF") return "gif";
  return "png";
}

function readImageSize(bytes: Uint8Array): { w: number; h: number } | null {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length >= 24 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    // PNG IHDR：宽度/高度在偏移 16/20
    if (String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]) === "IHDR") {
      return { w: dv.getUint32(16), h: dv.getUint32(20) };
    }
    return null;
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    // JPEG：扫描 SOF 段取尺寸
    let off = 2;
    while (off + 9 < bytes.length) {
      if (bytes[off] === 0xff) {
        const marker = bytes[off + 1];
        const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
        if (isSof) return { w: dv.getUint16(off + 7), h: dv.getUint16(off + 5) };
        off += 2 + dv.getUint16(off + 2);
      } else {
        off++;
      }
    }
    return null;
  }
  return null;
}

const IMG_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;

/** 单行 markdown 图片（可多个）→ 居中 ImageRun 段落；含文字则拆段 */
async function markdownImageParagraphs(line: string): Promise<Paragraph[]> {
  const paras: Paragraph[] = [];
  let m: RegExpExecArray | null;
  let last = 0;
  IMG_RE.lastIndex = 0;
  while ((m = IMG_RE.exec(line))) {
    const alt = m[1] || "（图片）";
    const src = m[2].trim();
    if (m.index > last) paras.push(new Paragraph({ children: parseInline(line.slice(last, m.index)) }));
    const bytes = src.startsWith("data:") ? dataUrlToBytes(src) : await fetchImageBytes(src);
    if (bytes) {
      const size = readImageSize(bytes);
      if (size) {
        const scale = Math.min(1, IMG_MAX_WIDTH / size.w);
        paras.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                type: sniffImageType(bytes),
                data: bytes,
                transformation: {
                  width: Math.round(size.w * scale),
                  height: Math.round(size.h * scale),
                },
              }),
            ],
          }),
        );
      } else {
        paras.push(new Paragraph({ children: [new TextRun({ text: alt, italics: true, font: FONT_BODY })] }));
      }
    } else {
      paras.push(new Paragraph({ children: [new TextRun({ text: alt, italics: true, font: FONT_BODY })] }));
    }
    last = m.index + m[0].length;
  }
  if (last < line.length) paras.push(new Paragraph({ children: parseInline(line.slice(last)) }));
  return paras;
}

/** 文档标题段（宋体加粗 2 号居中，公文头；markdown / HTML 两路径共用） */
function titleParagraph(title: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [new TextRun({ text: title || "未命名文档", bold: true, font: FONT_TITLE, size: 44 })],
  });
}

/** 打包 docx 并触发浏览器下载（markdown / HTML 两路径共用） */
async function downloadDocx(doc: Document, title: string): Promise<void> {
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title || "文档"}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportMarkdownAsDocx(markdown: string, title: string, sourceHtml?: string): Promise<void> {
  // 050 双写：编辑器 HTML 非空 → 样式保留路径（HTML→docx 映射）；否则走现有 markdown 路径（逐字节不变）
  if (sourceHtml && sourceHtml.trim() !== "") {
    await downloadDocx(
      new Document({
        numbering: {
          config: [{ reference: "ol", levels: [{ level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.LEFT }] }],
        },
        sections: [{ children: [titleParagraph(title), ...htmlToDocxChildren(sourceHtml)] }],
        styles: {
          default: {
            document: { run: { font: FONT_BODY, size: 32 } },
          },
        },
      }),
      title,
    );
    return;
  }

  markdown = stripProtectedSpans(markdown);
  markdown = stripStyleAnnotationLines(markdown);
  const lines = markdown.split("\n");
  const children: (Paragraph | Table)[] = [];

  // 文档标题（宋体加粗 2 号居中，公文头）
  children.push(titleParagraph(title));

  let olIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const t = raw.trim();
    if (!t) continue;

    const ml = classify(raw, olIndex);
    if (ml.kind === "ol") olIndex++;

    if (ml.kind === "image") {
      children.push(...(await markdownImageParagraphs(ml.text)));
      continue;
    }

    if (ml.kind === "table") {
      // 收集连续表格行
      const tableLines = [raw];
      while (i + 1 < lines.length && lines[i + 1].trim().includes("|")) {
        tableLines.push(lines[i + 1]);
        i++;
      }
      const rows = mdTableToRows(tableLines.join("\n"));
      if (rows.length > 0) {
        const header = rows[0];
        const body = rows.slice(1).filter((r) => !r.every((c) => /^[-:]+$/.test(c))); // 去掉 |---| 分隔行
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                tableHeader: true,
                children: header.map(
                  (c) =>
                    new TableCell({
                      shading: { fill: "EEEEEE" },
                      children: [new Paragraph({ children: [new TextRun({ text: c, bold: true, font: FONT_BODY })] })],
                    }),
                ),
              }),
              ...body.map(
                (row) =>
                  new TableRow({
                    children: row.map(
                      (c) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: c, font: FONT_BODY })] })] }),
                    ),
                  }),
              ),
            ],
          }),
        );
      }
      continue;
    }

    children.push(mdLineToParagraph(ml));
  }

  const doc = new Document({
    numbering: {
      config: [{ reference: "ol", levels: [{ level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.LEFT }] }],
    },
    sections: [{ children }],
    styles: {
      default: {
        document: { run: { font: FONT_BODY, size: 32 } },
      },
    },
  });

  await downloadDocx(doc, title);
}

// ── 050 双写：编辑器 HTML → docx（样式保留路径）──
// 映射（简报清单）：p/h1-3（text-align 对齐）/ul ol li/blockquote/hr/table
//   + span 的 color/font-size/font-family + mark 背景色→highlight（黄/绿/青/品红近似）；
// 白名单外标签只取文本（docx 无注入面）；图片不在映射清单内，忽略。

/** 行内格式累积态（walks 期间自外向内叠加） */
interface HtmlRunFmt {
  bold?: boolean;
  italics?: boolean;
  strike?: boolean;
  /** docx IRunOptions.underline 只收对象形式（布尔 false 不合法），u 标记置 {} */
  underline?: {};
  color?: string; // RRGGBB（无 #）
  size?: number; // half-point
  font?: string;
  highlight?: "yellow" | "green" | "cyan" | "magenta";
}

/** #rgb / #rrggbb / rgb(a) → [r,g,b]；解析失败返回 null */
function cssColorToRgb(value: string): [number, number, number] | null {
  const v = value.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(v);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].split("").map((c) => c + c).join("") : hex[1];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const rgb = /^rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(v);
  if (rgb) {
    return [rgb[1], rgb[2], rgb[3]].map((n) => Math.min(255, parseInt(n, 10))) as [number, number, number];
  }
  return null;
}

/** 色值 → docx RRGGBB（无 #）；解析失败返回 undefined（走默认色） */
function toDocxColor(value: string): string | undefined {
  const rgb = cssColorToRgb(value);
  if (!rgb) return undefined;
  return rgb.map((n) => n.toString(16).padStart(2, "0")).join("").toUpperCase();
}

/** mark 背景色 → 最近的高亮枚举（黄/绿/青/品红，按色相环距离；解析失败回落黄色） */
function nearestHighlight(value: string): "yellow" | "green" | "cyan" | "magenta" {
  const anchors: [name: "yellow" | "green" | "cyan" | "magenta", hue: number][] = [
    ["yellow", 60],
    ["green", 120],
    ["cyan", 180],
    ["magenta", 300],
  ];
  const rgb = cssColorToRgb(value);
  if (!rgb) return "yellow";
  const [r, g, b] = rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let hue = 0;
  if (max !== min) {
    const d = max - min;
    if (max === r) hue = ((g - b) / d) % 6;
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue = ((hue * 60) + 360) % 360;
  }
  let best: "yellow" | "green" | "cyan" | "magenta" = "yellow";
  let bestDist = 361;
  for (const [name, h] of anchors) {
    const dist = Math.min(Math.abs(hue - h), 360 - Math.abs(hue - h));
    if (dist < bestDist) {
      bestDist = dist;
      best = name;
    }
  }
  return best;
}

/** font-size → docx half-point（pt×2，px 按 0.75 换算 pt）；解析失败返回 undefined */
function toHalfPoints(value: string): number | undefined {
  const m = /^\s*([\d.]+)\s*(pt|px)?\s*$/i.exec(value);
  if (!m) return undefined;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  const pt = (m[2] ?? "").toLowerCase() === "px" ? n * 0.75 : n;
  return Math.max(1, Math.round(pt * 2));
}

/** text-align 样式 → AlignmentType；未声明/未知返回 undefined（走 docx 默认左对齐） */
function alignmentFrom(el: Element): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined {
  const m = /(?:^|;)\s*text-align\s*:\s*([a-z]+)/i.exec(el.getAttribute("style") ?? "");
  switch (m?.[1]?.toLowerCase()) {
    case "center":
      return AlignmentType.CENTER;
    case "right":
      return AlignmentType.RIGHT;
    case "justify":
      return AlignmentType.JUSTIFIED;
    case "left":
      return AlignmentType.LEFT;
    default:
      return undefined;
  }
}

/** 从元素 style 提取白名单属性叠加到 fmt（span：color/font-size/font-family；mark：背景色→highlight） */
function fmtFromElement(el: Element, base: HtmlRunFmt, isMark: boolean): HtmlRunFmt {
  const fmt = { ...base };
  const style = el.getAttribute("style") ?? "";
  for (const decl of style.split(";")) {
    const idx = decl.indexOf(":");
    if (idx < 0) continue;
    const prop = decl.slice(0, idx).trim().toLowerCase();
    const value = decl.slice(idx + 1).trim();
    if (prop === "color") fmt.color = toDocxColor(value) ?? fmt.color;
    else if (prop === "font-size") fmt.size = toHalfPoints(value) ?? fmt.size;
    else if (prop === "font-family") fmt.font = value.split(",")[0].replace(/["']/g, "").trim() || fmt.font;
    else if (isMark && (prop === "background" || prop === "background-color")) fmt.highlight = nearestHighlight(value);
  }
  return fmt;
}

/** 递归收集行内 TextRun（strong/b/em/i/del/s/u/mark/span + 文本；br→换行；img/script/style 忽略） */
function htmlInlineRuns(node: Node, base: HtmlRunFmt): TextRun[] {
  const runs: TextRun[] = [];
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent ?? "";
      if (text) runs.push(new TextRun({ text, ...base, font: base.font ?? FONT_BODY }));
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    const el = child as Element;
    const tag = el.tagName.toLowerCase();
    if (tag === "br") {
      runs.push(new TextRun({ text: "", break: 1 }));
      continue;
    }
    let fmt = { ...base };
    if (tag === "strong" || tag === "b") fmt.bold = true;
    else if (tag === "em" || tag === "i") fmt.italics = true;
    else if (tag === "del" || tag === "s") fmt.strike = true;
    else if (tag === "u") fmt.underline = {};
    else if (tag === "mark") fmt = fmtFromElement(el, fmt, true);
    else if (tag === "span" || tag === "font") fmt = fmtFromElement(el, fmt, false);
    else if (tag === "img" || tag === "script" || tag === "style") continue;
    runs.push(...htmlInlineRuns(el, fmt));
  }
  return runs;
}

/** ul/ol → 列表段落（li 行内内容 + 嵌套列表递归，展平为 level 0，与 markdown 路径一致） */
function collectHtmlList(listEl: Element, ordered: boolean, out: (Paragraph | Table)[]): void {
  for (const child of Array.from(listEl.children)) {
    const tag = child.tagName.toLowerCase();
    if (tag === "li") {
      const inlineNodes: Node[] = [];
      const nested: Element[] = [];
      for (const c of Array.from(child.childNodes)) {
        if (c.nodeType === Node.ELEMENT_NODE && ["ul", "ol"].includes((c as Element).tagName.toLowerCase())) {
          nested.push(c as Element);
        } else {
          inlineNodes.push(c);
        }
      }
      const holder = child.ownerDocument!.createElement("div");
      for (const c of inlineNodes) holder.appendChild(c.cloneNode(true));
      out.push(
        ordered
          ? new Paragraph({ numbering: { reference: "ol", level: 0 }, children: htmlInlineRuns(holder, {}) })
          : new Paragraph({ bullet: { level: 0 }, children: htmlInlineRuns(holder, {}) }),
      );
      for (const n of nested) collectHtmlList(n, n.tagName.toLowerCase() === "ol", out);
    } else if (tag === "ul" || tag === "ol") {
      collectHtmlList(child, tag === "ol", out);
    }
  }
}

/** table → docx Table（首行表头加灰底加粗，同 markdown 路径；无行返回 null） */
function htmlTableToDocx(tableEl: Element): Table | null {
  const trs: Element[] = [];
  for (const section of Array.from(tableEl.children)) {
    const st = section.tagName.toLowerCase();
    if (st === "tr") trs.push(section);
    else if (st === "thead" || st === "tbody" || st === "tfoot") {
      for (const tr of Array.from(section.children)) {
        if (tr.tagName.toLowerCase() === "tr") trs.push(tr);
      }
    }
  }
  const rowDefs = trs
    .map((tr) => Array.from(tr.children).filter((c) => ["td", "th"].includes(c.tagName.toLowerCase())))
    .filter((cells) => cells.length > 0);
  if (rowDefs.length === 0) return null;
  const mkCell = (cell: Element, header: boolean) =>
    new TableCell({
      ...(header ? { shading: { fill: "EEEEEE" } } : {}),
      children: [new Paragraph({ children: htmlInlineRuns(cell, header ? { bold: true, font: FONT_BODY } : { font: FONT_BODY }) })],
    });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: rowDefs[0].map((c) => mkCell(c, true)) }),
      ...rowDefs.slice(1).map((row) => new TableRow({ children: row.map((c) => mkCell(c, false)) })),
    ],
  });
}

/** 块级节点 → Paragraph/Table；未识别块级标签（div/pre/section…）递归上提子节点 */
function htmlBlocks(root: Node, out: (Paragraph | Table)[]): void {
  for (const child of Array.from(root.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = (child.textContent ?? "").trim();
      if (text) out.push(new Paragraph({ children: [new TextRun({ text, font: FONT_BODY })] }));
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    const el = child as Element;
    const tag = el.tagName.toLowerCase();
    const align = alignmentFrom(el);
    switch (tag) {
      case "h1":
      case "h2":
      case "h3": {
        const fonts = { h1: FONT_H1, h2: FONT_H2, h3: FONT_BODY } as const;
        const levels = { h1: HeadingLevel.HEADING_1, h2: HeadingLevel.HEADING_2, h3: HeadingLevel.HEADING_3 } as const;
        out.push(
          new Paragraph({
            heading: levels[tag],
            ...(align ? { alignment: align } : {}),
            children: htmlInlineRuns(el, { bold: true, font: fonts[tag], size: 32 }),
          }),
        );
        break;
      }
      case "p":
        out.push(
          new Paragraph({
            spacing: { after: 120, ...LINE_SPACING_28PT },
            indent: { firstLine: 640 },
            ...(align ? { alignment: align } : {}),
            children: htmlInlineRuns(el, {}),
          }),
        );
        break;
      case "ul":
        collectHtmlList(el, false, out);
        break;
      case "ol":
        collectHtmlList(el, true, out);
        break;
      case "blockquote":
        out.push(
          new Paragraph({
            indent: { left: 400 },
            children: htmlInlineRuns(el, { italics: true, color: "666666" }),
          }),
        );
        break;
      case "hr":
        out.push(new Paragraph({ children: [new TextRun({ text: "───────", color: "CCCCCC" })] }));
        break;
      case "table": {
        const table = htmlTableToDocx(el);
        if (table) out.push(table);
        break;
      }
      default:
        htmlBlocks(el, out);
    }
  }
}

/** 编辑器 HTML → docx children（050 双写样式保留路径；无块级内容时返回空数组，产物仅含标题段） */
function htmlToDocxChildren(html: string): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  htmlBlocks(doc.body, children);
  return children;
}