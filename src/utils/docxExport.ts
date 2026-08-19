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

export async function exportMarkdownAsDocx(markdown: string, title: string): Promise<void> {
  const lines = markdown.split("\n");
  const children: (Paragraph | Table)[] = [];

  // 文档标题（宋体加粗 2 号居中，公文头）
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: title || "未命名文档", bold: true, font: FONT_TITLE, size: 44 })],
    }),
  );

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