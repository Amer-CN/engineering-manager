const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
  HeadingLevel, Header, Footer, PageNumber
} = require('C:/Users/Admin/AppData/Roaming/npm/node_modules/docx');
const fs = require('fs');

// ---- 数据 ----
const items = [
  { no: 1, location: '服务中心', desc: '漏水问题，已找到1个漏水点，包工包料修复', amount: 3500, note: '已确认漏水点，可立即施工' },
  { no: 2, location: '春笋中心', desc: '漏水点尚未找到，漏水原因待查明后施工', amount: 20000, note: '需先进行漏点探测，费用为预估值，实际以查明后报价为准' },
  { no: 3, location: '损坏灯具', desc: '约30个灯具损坏，采用不锈钢条固定并同色漆修复', amount: 2000, note: '业主认可修复方案' },
  { no: 4, location: '春笋中心前广场', desc: '地砖损坏修复', amount: 3000, note: '预估数量，以现场实测为准' },
  { no: 5, location: '工作室喷泉', desc: '三个水泵损坏及漏水处理，含配件更换及防水修复', amount: 20000, note: '水泵损坏数量已确认，漏水范围待进一步核查' },
  { no: 6, location: '档案馆', desc: '资料装订费', amount: 30000, note: '' },
  { no: 7, location: '综合', desc: '差旅费（现场查勘及沟通往返）', amount: 3000, note: '' },
  { no: 8, location: '综合', desc: '监理签字业务费', amount: 6000, note: '' },
];

const total = items.reduce((s, i) => s + i.amount, 0);

// ---- 样式颜色 ----
const PRIMARY = '1a3c6e';    // 深蓝标题
const HEADER_BG = 'D6E4F7';  // 表头底色
const ALT_BG = 'EEF4FB';     // 隔行底色
const BORDER_COLOR = 'A0B4CC';

const cellBorder = (color = BORDER_COLOR) => ({
  top: { style: BorderStyle.SINGLE, size: 1, color },
  bottom: { style: BorderStyle.SINGLE, size: 1, color },
  left: { style: BorderStyle.SINGLE, size: 1, color },
  right: { style: BorderStyle.SINGLE, size: 1, color },
});

// ---- 辅助：普通段落 ----
function para(text, opts = {}) {
  return new Paragraph({
    alignment: opts.align || AlignmentType.LEFT,
    spacing: { before: opts.beforePt ? opts.beforePt * 20 : 0, after: opts.afterPt ? opts.afterPt * 20 : 0 },
    children: [new TextRun({
      text,
      bold: opts.bold || false,
      size: (opts.sizePt || 11) * 2,
      font: '宋体',
      color: opts.color || '000000',
    })],
  });
}

// ---- 辅助：表格单元格 ----
function cell(text, opts = {}) {
  return new TableCell({
    borders: cellBorder(),
    width: { size: opts.w || 1000, type: WidthType.DXA },
    shading: opts.bg ? { fill: opts.bg, type: ShadingType.CLEAR } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: opts.align || AlignmentType.CENTER,
      children: [new TextRun({
        text: String(text),
        bold: opts.bold || false,
        size: (opts.sizePt || 10) * 2,
        font: '宋体',
        color: opts.color || '000000',
      })],
    })],
  });
}

// ---- 表头行 ----
const headerRow = new TableRow({
  tableHeader: true,
  children: [
    cell('序号', { w: 600, bold: true, bg: HEADER_BG }),
    cell('位置/类别', { w: 1700, bold: true, bg: HEADER_BG }),
    cell('费用说明', { w: 3800, bold: true, bg: HEADER_BG, align: AlignmentType.LEFT }),
    cell('预估金额（元）', { w: 1600, bold: true, bg: HEADER_BG }),
    cell('备注', { w: 2260, bold: true, bg: HEADER_BG, align: AlignmentType.LEFT }),
  ],
});

// ---- 数据行 ----
const dataRows = items.map((item, idx) => {
  const bg = idx % 2 === 1 ? ALT_BG : undefined;
  return new TableRow({
    children: [
      cell(item.no, { w: 600, bg }),
      cell(item.location, { w: 1700, bg }),
      cell(item.desc, { w: 3800, bg, align: AlignmentType.LEFT }),
      cell(item.amount.toLocaleString('zh-CN'), { w: 1600, bg }),
      cell(item.note, { w: 2260, bg, align: AlignmentType.LEFT }),
    ],
  });
});

// ---- 合计行 ----
const totalRow = new TableRow({
  children: [
    cell('合计', { w: 2300, bold: true, bg: HEADER_BG }),  // 序号+位置合并用colspan不支持，拆开写
    cell('', { w: 1700, bg: HEADER_BG }),
    cell('', { w: 3800, bg: HEADER_BG }),
    cell('¥' + total.toLocaleString('zh-CN'), { w: 1600, bold: true, bg: HEADER_BG, color: 'C00000' }),
    cell('', { w: 2260, bg: HEADER_BG }),
  ],
});

// 表格总宽 = 600+1700+3800+1600+2260 = 9960 DXA
const expenseTable = new Table({
  width: { size: 9960, type: WidthType.DXA },
  columnWidths: [600, 1700, 3800, 1600, 2260],
  rows: [headerRow, ...dataRows, totalRow],
});

// ---- 组装文档 ----
const doc = new Document({
  styles: {
    default: {
      document: { run: { font: '宋体', size: 22 } },
    },
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1260, bottom: 1440, left: 1440 },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR } },
          children: [new TextRun({ text: '浙江中立建设有限公司 — 费用申请报告', size: 18, font: '宋体', color: '666666' })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR } },
          children: [
            new TextRun({ text: '第 ', size: 18, font: '宋体', color: '888888' }),
            new TextRun({ children: [PageNumber.CURRENT], size: 18, font: '宋体', color: '888888' }),
            new TextRun({ text: ' 页', size: 18, font: '宋体', color: '888888' }),
          ],
        })],
      }),
    },
    children: [
      // 标题
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 300 },
        children: [new TextRun({ text: '费 用 申 请 报 告', bold: true, size: 48, font: '黑体', color: PRIMARY })],
      }),

      // 收件方 + 日期
      new Paragraph({
        spacing: { before: 0, after: 0 },
        tabStops: [{ type: 'right', position: 9960 }],
        children: [
          new TextRun({ text: '致：浙江中立建设有限公司', bold: true, size: 24, font: '宋体' }),
          new TextRun({ text: '\t申请日期：2026年5月10日', size: 22, font: '宋体', color: '555555' }),
        ],
      }),

      // 分割线段落
      new Paragraph({
        spacing: { before: 100, after: 200 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: PRIMARY } },
        children: [],
      }),

      // 正文一
      para('尊敬的浙江中立建设有限公司：', { sizePt: 11, afterPt: 6 }),
      para(
        '根据现场实际情况，我方对以下各项维修、整改及相关费用进行了详细梳理，现将各项内容及预估费用汇报如下，请贵司审核批准。',
        { sizePt: 11, afterPt: 12 }
      ),

      // 一、费用明细标题
      new Paragraph({
        spacing: { before: 0, after: 160 },
        children: [new TextRun({ text: '一、费用明细', bold: true, size: 26, font: '黑体', color: PRIMARY })],
      }),

      // 表格
      expenseTable,

      // 说明段落
      new Paragraph({
        spacing: { before: 240, after: 100 },
        children: [new TextRun({ text: '二、说明与备注', bold: true, size: 26, font: '黑体', color: PRIMARY })],
      }),
      para('1. 以上费用均为预估金额，最终费用以实际完成工程量及签认为准。', { sizePt: 11, afterPt: 4 }),
      para('2. 春笋中心漏水点尚未查明，预估费用含漏点探测及修复两部分，待漏点确认后将另行提交详细报价。', { sizePt: 11, afterPt: 4 }),
      para('3. 工作室喷泉漏水范围待进一步核查，如涉及追加工程量，将及时补充报告。', { sizePt: 11, afterPt: 4 }),
      para('4. 以上各项工作将严格按照相关质量标准及合同约定执行，并配合监理全程监督。', { sizePt: 11, afterPt: 24 }),

      // 费用合计强调
      new Paragraph({
        spacing: { before: 0, after: 240 },
        children: [
          new TextRun({ text: '申请费用合计（预估）：', bold: true, size: 26, font: '黑体' }),
          new TextRun({ text: '¥' + total.toLocaleString('zh-CN') + ' 元', bold: true, size: 30, font: '黑体', color: 'C00000' }),
          new TextRun({ text: '（人民币捌万柒仟伍佰元整）', size: 22, font: '宋体', color: '555555' }),
        ],
      }),

      // 请求段落
      para('恳请贵司领导审阅，并于近期予以批复，以便我方及时安排施工，保障各项目正常运营。如有疑问，欢迎随时联系，我方将积极配合提供相关资料及说明。', { sizePt: 11, afterPt: 48 }),

      // 署名
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 0, after: 8 },
        children: [new TextRun({ text: '申请单位：____________________________', size: 24, font: '宋体' })],
      }),
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 0, after: 8 },
        children: [new TextRun({ text: '经办人：____________________________', size: 24, font: '宋体' })],
      }),
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 0, after: 8 },
        children: [new TextRun({ text: '联系电话：____________________________', size: 24, font: '宋体' })],
      }),
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 0, after: 0 },
        children: [new TextRun({ text: '日期：　　年　　月　　日', size: 24, font: '宋体' })],
      }),
    ],
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('E:\\测试\\费用申请报告_浙江中立建设.docx', buf);
  console.log('Done');
});
