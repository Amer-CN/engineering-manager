import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType } from "docx";

/**
 * Markdown → docx 公文样式导出
 *
 * 映射规则（公文体）：
 *   - 一级/二级/三级标题 → HeadingLevel（黑体，居中可选）
 *   - 有序/无序列表 → 带编号/圆点段落
 *   - 粗体 → TextRun.bold；斜体 → italics
 *   - 表格（简单解析 | a | b |）→ docx Table
 *   - 引用 > → 缩进 + 灰色
 *   - 分割线 --- → 空段
 *   - 正文 → 仿宋风格（FangSong 在 Windows 可用；macOS 回落 SimSun）
 */

const FONT_BODY = "FangSong";
const FONT_HEADING = "SimHei";

interface MdLine {
  text: string;
  kind: "h1" | "h2" | "h3" | "ul" | "ol" | "quote" | "hr" | "table" | "para";
  order?: number; // ol 序号
}

function classify(line: string, olIndex: number): MdLine {
  const t = line.trim();
  if (/^#\s+/.test(t)) return { text: t.replace(/^#\s+/, ""), kind: "h1" };
  if (/^##\s+/.test(t)) return { text: t.replace(/^##\s+/, ""), kind: "h2" };
  if (/^###\s+/.test(t)) return { text: t.replace(/^###\s+/, ""), kind: "h3" };
  if (/^[-*]\s+/.test(t)) return { text: t.replace(/^[-*]\s+/, ""), kind: "ul" };
  if (/^\d+[.、]\s+/.test(t)) return { text: t.replace(/^\d+[.、]\s+/, ""), kind: "ol", order: olIndex };
  if (/^>\s?/.test(t)) return { text: t.replace(/^>\s?/, ""), kind: "quote" };
  if (/^---+$/.test(t)) return { text: "", kind: "hr" };
  if (t.startsWith("|") && t.endsWith("|") && t.includes("|")) return { text: t, kind: "table" };
  return { text: line, kind: "para" };
}

/** 解析行内粗体/斜体 → TextRun[] */
function inlineRuns(text: string): TextRun[] {
  // 先处理 **粗体**
  const boldParts = text.split(/\*\*(.+?)\*\*/g);
  const runs: TextRun[] = [];
  for (let i = 0; i < boldParts.length; i++) {
    const part = boldParts[i];
    if (!part) continue;
    if (i % 2 === 1) {
      runs.push(new TextRun({ text: part, bold: true, font: FONT_BODY }));
    } else {
      // 再拆 *斜体*
      const italicParts = part.split(/\*(.+?)\*/g);
      for (let j = 0; j < italicParts.length; j++) {
        const sub = italicParts[j];
        if (!sub) continue;
        if (j % 2 === 1) {
          runs.push(new TextRun({ text: sub, italics: true, font: FONT_BODY }));
        } else {
          runs.push(new TextRun({ text: sub, font: FONT_BODY }));
        }
      }
    }
  }
  return runs;
}

function mdLineToParagraph(ml: MdLine): Paragraph {
  switch (ml.kind) {
    case "h1":
      return new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: ml.text, bold: true, font: FONT_HEADING, size: 44 })],
      });
    case "h2":
      return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: ml.text, bold: true, font: FONT_HEADING, size: 36 })],
      });
    case "h3":
      return new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: ml.text, bold: true, font: FONT_HEADING, size: 32 })],
      });
    case "ul":
      return new Paragraph({ bullet: { level: 0 }, children: inlineRuns(ml.text) });
    case "ol":
      return new Paragraph({ numbering: { reference: "ol", level: 0 }, children: inlineRuns(ml.text) });
    case "quote":
      return new Paragraph({
        indent: { left: 400 },
        children: [new TextRun({ text: ml.text, italics: true, color: "666666", font: FONT_BODY })],
      });
    case "hr":
      return new Paragraph({ children: [new TextRun({ text: "───────", color: "CCCCCC" })] });
    case "para":
    default:
      return new Paragraph({ spacing: { after: 120 }, children: inlineRuns(ml.text) });
  }
}

function mdTableToRows(tableText: string): string[][] {
  const lines = tableText.trim().split("\n");
  return lines
    .filter((l) => l.includes("|"))
    .map((l) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim()));
}

export async function exportMarkdownAsDocx(markdown: string, title: string): Promise<void> {
  const lines = markdown.split("\n");
  const children: (Paragraph | Table)[] = [];

  // 文档标题（黑体居中，公文头）
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: title || "未命名文档", bold: true, font: FONT_HEADING, size: 48 })],
    }),
  );

  let olIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const t = raw.trim();
    if (!t) continue;

    const ml = classify(raw, olIndex);
    if (ml.kind === "ol") olIndex++;

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
        document: { run: { font: FONT_BODY, size: 24 } },
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
