/**
 * make-redheader-template.mjs — 生成 GB/T 9704 红头文件 .docx 模板（一次性脚本，产物入库）
 *
 * 产物：public/templates/writing-red-header.docx
 * 占位符由 docxtemplater 填充（每个占位符独占一个 TextRun，不得与普通文字混排）：
 *   {org_name} 发文机关标志 / {doc_number} 发文字号 / {title} 标题 / {recipient} 主送机关
 *   __WRITING_BODY_PARAGRAPHS__ 正文区纯文本标记（非 docxtemplater 标签，render 后由
 *   redHeaderExport.ts 定位包含它的整段 <w:p>…</w:p> 并替换为自生成正文段落 XML）
 *   {sender} 落款机关 / {date} 成文日期 / {record_info} 版记
 *
 * 运行：node scripts/make-redheader-template.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
} from "docx";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../public/templates/writing-red-header.docx");

// GB/T 9704-2012 字体字号（half-point：2号=22pt→44，3号=16pt→32，小4号=12pt→24）
const FONT_SONG = "宋体";
const FONT_FANGSONG = "仿宋_GB2312";
const RED = "FF0000";
/** 行距固定 28 磅（1/20 磅：28*20=560），与 docxExport.ts 对齐 */
const LINE_28PT = { line: 560, lineRule: "exact" };

/** 占位符独占 TextRun（不能与普通文字同 run，否则 docxtemplater 无法识别） */
const ph = (tag, opts = {}) =>
  new TextRun({ text: tag, font: FONT_FANGSONG, size: 32, ...opts });

const doc = new Document({
  styles: { default: { document: { run: { font: FONT_FANGSONG, size: 32 } } } },
  sections: [
    {
      children: [
        // 1. 发文机关标志：红色宋体大字居中（44pt，国标 22mm 上限近似）
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 },
          children: [
            ph("{org_name}", { font: FONT_SONG, size: 88, bold: true, color: RED }),
          ],
        }),
        // 2. 发文字号：仿宋 3 号居中，段底部红色粗分隔线
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 360 },
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 12, color: RED, space: 4 },
          },
          children: [ph("{doc_number}")],
        }),
        // 3. 标题：宋体加粗 2 号居中
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 360, after: 240 },
          children: [ph("{title}", { font: FONT_SONG, size: 44, bold: true })],
        }),
        // 4. 主送机关：仿宋 3 号顶格左对齐
        new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [ph("{recipient}")],
        }),
        // 5. 正文区：单个普通段落，仅一个 TextRun，文本为纯文本标记（非 docxtemplater
        //    标签，render 时原样保留；导出时由 redHeaderExport.ts 替换为正文段落 XML）
        new Paragraph({
          spacing: { after: 120, ...LINE_28PT },
          children: [ph("__WRITING_BODY_PARAGRAPHS__")],
        }),
        // 6. 落款：右对齐两段（落款机关 / 成文日期），仿宋 3 号
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { before: 480 },
          children: [ph("{sender}")],
        }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [ph("{date}")],
        }),
        // 7. 版记：末尾段 top 细线 + 版记信息，仿宋小 4 号
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 480 },
          border: {
            top: { style: BorderStyle.SINGLE, size: 6, color: "000000", space: 4 },
          },
          children: [ph("{record_info}", { size: 24 })],
        }),
      ],
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, buffer);
console.log(`OK: ${OUT} (${buffer.length} bytes)`);
