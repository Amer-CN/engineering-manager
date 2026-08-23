import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { stripProtectedSpans } from "./docxExport";

/**
 * 红头文件模板导出（GB/T 9704）
 *
 * 流程：fetch public/templates/writing-red-header.docx（一次性脚本生成，入库）
 * → pizzip 解压 → docxtemplater 填充标量字段（版头/版尾）
 * → 定位 document.xml 中正文标记段并替换为自生成正文段落 XML → blob 下载。
 * 纯前端，无 IPC。
 */

/** 模板路径：vite base 为 './'（见 vite.config.ts），与 ocr-config.json 的取法一致用相对路径 */
const TEMPLATE_URL = "templates/writing-red-header.docx";

/** 正文区纯文本标记（模板正文区独占一段；非 docxtemplater 标签，render 后原样保留） */
const BODY_MARKER = "__WRITING_BODY_PARAGRAPHS__";

// 字体与模板骨架段 / docxExport.ts 对齐；字号 3 号 16pt（half-point 32）
const FONT_H1 = "黑体";
const FONT_H2 = "楷体_GB2312";
const FONT_BODY = "仿宋_GB2312";

export interface RedHeaderMeta {
  /** 文档标题（渲染进模板标题位） */
  title: string;
  /** 发文机关标志（红色大字） */
  orgName: string;
  /** 发文字号（如：某建司发〔2026〕12号） */
  docNumber: string;
  /** 主送机关（顶格） */
  recipient: string;
  /** 落款机关 */
  sender: string;
  /** 成文日期（YYYY-MM-DD） */
  date: string;
  /** 版记（抄送 / 印发信息，可空） */
  recordInfo?: string;
}

/** 正文段落（markdown 逐行 classify，逻辑参照 docxExport.ts 的 classify，最小实现） */
interface RedHeaderParaItem {
  text: string;
  is_h1?: boolean;
  is_h2?: boolean;
  is_h3?: boolean;
  is_para?: boolean;
  is_list?: boolean;
}

function classifyPara(line: string): RedHeaderParaItem | null {
  const t = line.trim();
  if (!t) return null;
  if (/^#\s+/.test(t)) return { text: t.replace(/^#\s+/, ""), is_h1: true };
  if (/^##\s+/.test(t)) return { text: t.replace(/^##\s+/, ""), is_h2: true };
  if (/^###\s+/.test(t)) return { text: t.replace(/^###\s+/, ""), is_h3: true };
  if (/^[-*]\s+/.test(t)) return { text: t.replace(/^[-*]\s+/, ""), is_list: true };
  return { text: t, is_para: true };
}

/** markdown → para_items（引用/分割线/表格行等一律按普通段落回落） */
function markdownToParaItems(markdown: string): RedHeaderParaItem[] {
  return markdown
    .split("\n")
    .map(classifyPara)
    .filter((x): x is RedHeaderParaItem => x !== null);
}

/** XML 转义：& < > " ' 五个字符（正文文本经转义后包进 <w:t>） */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** 一个正文 TextRun（rFonts + 3 号 16pt + 可选加粗），文本经 XML 转义 */
function bodyRunXml(text: string, font: string, bold = false): string {
  return (
    `<w:r><w:rPr>${bold ? "<w:b/>" : ""}` +
    `<w:rFonts w:ascii="${font}" w:eastAsia="${font}" w:hAnsi="${font}"/>` +
    `<w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr>` +
    `<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`
  );
}

/** 单条正文 → <w:p> XML（样式对齐原模板骨架段 / docxExport.ts） */
function paraItemToXml(item: RedHeaderParaItem): string {
  if (item.is_h1) {
    // h1：黑体 3 号居中加粗
    return `<w:p><w:pPr><w:jc w:val="center"/></w:pPr>${bodyRunXml(item.text, FONT_H1, true)}</w:p>`;
  }
  if (item.is_h2) {
    // h2：楷体_GB2312 3 号加粗
    return `<w:p>${bodyRunXml(item.text, FONT_H2, true)}</w:p>`;
  }
  if (item.is_h3) {
    // h3：仿宋_GB2312 3 号加粗
    return `<w:p>${bodyRunXml(item.text, FONT_BODY, true)}</w:p>`;
  }
  if (item.is_list) {
    // list：仿宋_GB2312 3 号，圆点前缀
    return `<w:p>${bodyRunXml(`• ${item.text}`, FONT_BODY)}</w:p>`;
  }
  // para：仿宋_GB2312 3 号，首行缩进 2 字符（640 twips），行距固定 28 磅（560）
  return (
    `<w:p><w:pPr><w:spacing w:after="120" w:line="560" w:lineRule="exact"/>` +
    `<w:ind w:firstLine="640"/></w:pPr>${bodyRunXml(item.text, FONT_BODY)}</w:p>`
  );
}

/**
 * 定位包含正文标记的整段 <w:p …>…</w:p>（w:p 可能带 w14:paraId 等属性），
 * 替换为自生成的正文段落 XML 序列。
 */
function injectBodyParagraphs(xml: string, items: RedHeaderParaItem[]): string {
  const markerIdx = xml.indexOf(BODY_MARKER);
  if (markerIdx < 0) throw new Error("红头模板缺少正文标记 __WRITING_BODY_PARAGRAPHS__");
  // 往前找最近的 <w:p 开头：标签名后必须紧跟 ">" 或空格（排除 <w:pPr / <w:proofErr / 自闭合 <w:p/>）
  let start = -1;
  for (let i = markerIdx; i >= 0; ) {
    const cand = xml.lastIndexOf("<w:p", i);
    if (cand < 0) break;
    const next = xml[cand + 4];
    if (next === ">" || next === " ") {
      start = cand;
      break;
    }
    i = cand - 1;
  }
  if (start < 0) throw new Error("红头模板正文标记所在段落无 <w:p 开头");
  // 往后找最近的 </w:p> 结尾
  const closeIdx = xml.indexOf("</w:p>", markerIdx);
  if (closeIdx < 0) throw new Error("红头模板正文标记所在段落无 </w:p> 结尾");
  const end = closeIdx + "</w:p>".length;
  return xml.slice(0, start) + items.map(paraItemToXml).join("") + xml.slice(end);
}

export async function exportRedHeaderDocx(markdown: string, meta: RedHeaderMeta): Promise<void> {
  markdown = stripProtectedSpans(markdown);
  const res = await fetch(TEMPLATE_URL);
  if (!res.ok) throw new Error(`模板加载失败（${res.status}）`);
  const templateBuf = await res.arrayBuffer();

  const zip = new PizZip(templateBuf);
  const docx = new Docxtemplater(zip, { paragraphLoop: false, linebreaks: true });
  // 只填标量字段；正文不走 docxtemplater（条件骨架段会产生空段残留）
  docx.render({
    org_name: meta.orgName,
    doc_number: meta.docNumber,
    title: meta.title,
    recipient: meta.recipient,
    sender: meta.sender,
    date: meta.date,
    record_info: meta.recordInfo || "",
  });

  // 正文注入：render 后 document.xml 仍保留纯文本标记，整段替换为自生成段落 XML
  const items = markdownToParaItems(markdown);
  const zip2 = docx.getZip();
  const docFile = zip2.file("word/document.xml");
  if (!docFile) throw new Error("红头模板缺少 word/document.xml");
  zip2.file("word/document.xml", injectBodyParagraphs(docFile.asText(), items));

  const blob = zip2.generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${meta.title || "红头文档"}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
