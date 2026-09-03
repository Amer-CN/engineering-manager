/**
 * chartImage.ts — 编辑风圆环图表 → PNG 图片（写作中心「/图表」插图用，阶段三）
 *
 * 链路：业务数据 → buildDonutSvg（纯字符串 SVG）→ svgToPngDataUrl（Image+canvas 转 2 倍图）
 *       → tiptap setImage 插入 PNG dataURL 节点。
 *
 * 关键约束：SVG 进 <img> 后是隔离环境，读不到页面主题的 CSS 变量，
 * 因此所有颜色必须用 getCssVar 在插入时刻解析成具体色值（解析不到给 hex fallback）
 * 写死进 SVG 字符串——SVG 拼接里禁止出现 CSS 变量引用。
 *
 * 数据诚实：弧段几何复用 EditorialDonut.tsx 导出的 computeDonutSegments
 * （与页面预览组件同源），不含随机数；底注（数据来源/取数时间）由调用方拼好传入。
 */

import { computeDonutSegments, type EditorialDonutDatum, type DonutSegment } from "@/components/ui/charts/EditorialDonut";

/** 逻辑画布宽（PNG 按 2 倍输出 = 640px） */
export const DONUT_SVG_WIDTH = 320;
/** 逻辑画布高（标题区 + 150 圆环 + 底注区） */
export const DONUT_SVG_HEIGHT = 210;

/** 中文字体栈（导出 PNG 用，与公文导出的黑体族区分：图表走无衬线） */
const FONT_SANS = "Microsoft YaHei, PingFang SC, sans-serif";
const FONT_MONO = "Consolas, monospace";

/** getCssVar 解析失败时的通用兜底色（slate-400，与主题 muted 色语义一致） */
const FALLBACK_MUTED = "#94a3b8";

/**
 * 读当前主题 CSS 变量的计算值（具体色值）。
 * jsdom / SSR / 变量缺失 / 仍是未解析的 var() 引用时返回 fallback（hex）。
 * 注意：主题变量计算值可能是 oklch() 形式——同为具体色值，SVG/Chromium 可直接渲染。
 */
export function getCssVar(name: string, fallback: string): string {
  try {
    if (typeof document === "undefined") return fallback;
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (!raw || raw.startsWith("var")) return fallback;
    return raw;
  } catch {
    return fallback;
  }
}

/** 段颜色解析：computeDonutSegments 可能给出 var() 引用（fallback 色），统一解析成具体色值 */
function resolveColor(color: string): string {
  if (!color.startsWith("var")) return color;
  const name = color.slice(4).replace(/[()]/g, "").trim();
  return getCssVar(name, FALLBACK_MUTED);
}

/** XML 文本/属性转义（SVG 是严格 XML，< > & 引号必须转义） */
function xmlEsc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** 图例名截断（SVG text 无自动省略，超长会撞数值列） */
function legendName(name: string): string {
  return name.length > 9 ? `${name.slice(0, 9)}…` : name;
}

/** 中心合计截断（防止溢出环心） */
function centerTotal(s: string): string {
  return s.length > 11 ? `${s.slice(0, 10)}…` : s;
}

export interface DonutSvgOptions {
  /** 图表标题（左上） */
  title?: string;
  /** 底注：数据来源 + 取数时间（由调用方拼好传入，本函数不做取数） */
  note?: string;
  /** 数值格式化（金额传 formatMoney、计数传 String；缺省千分位） */
  formatValue?: (n: number) => string;
}

/**
 * 纯函数：业务数据 → 完整 SVG 字符串（弧段 + 中心合计 + SVG text 图例 + 标题/底注）。
 * 布局：左图右例；圆环以 viewBox 0 0 100 100 内嵌，弧段 path 直接复用
 * computeDonutSegments 的输出（与 EditorialDonut 组件逐字节同源）。
 */
export function buildDonutSvg(data: EditorialDonutDatum[], opts: DonutSvgOptions = {}): string {
  const fmtValue = opts.formatValue ?? ((n: number) => n.toLocaleString("zh-CN"));
  const segments: DonutSegment[] = computeDonutSegments(data);
  const total = segments.reduce((sum, seg) => sum + seg.value, 0);
  const fg = getCssVar("--fg", "#0f172a");
  const fg2 = getCssVar("--fg-2", "#334155");
  const muted = getCssVar("--muted", "#94a3b8");
  const muted2 = getCssVar("--muted-2", "#64748b");
  const bg = getCssVar("--card", "#ffffff");
  const border = getCssVar("--border", "#e2e8f0");

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${DONUT_SVG_WIDTH}" height="${DONUT_SVG_HEIGHT}" viewBox="0 0 ${DONUT_SVG_WIDTH} ${DONUT_SVG_HEIGHT}">`,
  );
  // 不透明白底：PNG 进 docx / 打印 PDF 不能透底
  parts.push(`<rect width="100%" height="100%" fill="${bg}"/>`);

  if (opts.title) {
    parts.push(
      `<text x="16" y="26" font-family="${FONT_SANS}" font-size="14" font-weight="700" fill="${fg}">${xmlEsc(opts.title)}</text>`,
    );
  }

  // 圆环（viewBox 0 0 100 100 内嵌，seg.path 原样复用；空数据画占位环）
  parts.push(`<svg x="12" y="40" width="150" height="150" viewBox="0 0 100 100">`);
  if (segments.length === 0) {
    parts.push(`<circle cx="50" cy="50" r="36" fill="none" stroke="${border}" stroke-width="20"/>`);
  } else {
    for (const seg of segments) {
      parts.push(`<path d="${seg.path}" fill="${resolveColor(seg.color)}"/>`);
    }
  }
  parts.push(`</svg>`);

  // 中心合计（环心 x=12+75=87, y=40+75=115）
  if (segments.length > 0) {
    parts.push(
      `<text x="87" y="109" text-anchor="middle" font-family="${FONT_SANS}" font-size="8" fill="${muted}">合计</text>`,
    );
    parts.push(
      `<text x="87" y="125" text-anchor="middle" font-family="${FONT_MONO}" font-size="11" font-weight="700" fill="${fg}">${xmlEsc(centerTotal(fmtValue(total)))}</text>`,
    );
  }

  // 图例：色点 + 名称 + 右对齐数值（行数以圆环垂直中线对称分布）
  const n = segments.length;
  const startY = 115 - (n * 20) / 2 + 12;
  segments.forEach((seg, i) => {
    const y = startY + i * 20;
    parts.push(`<circle cx="176" cy="${y - 3.5}" r="3.5" fill="${resolveColor(seg.color)}"/>`);
    parts.push(
      `<text x="184" y="${y}" font-family="${FONT_SANS}" font-size="10" fill="${muted2}">${xmlEsc(legendName(seg.name))}</text>`,
    );
    parts.push(
      `<text x="312" y="${y}" text-anchor="end" font-family="${FONT_MONO}" font-size="10" fill="${fg2}">${xmlEsc(fmtValue(seg.value))}</text>`,
    );
  });
  if (n === 0) {
    parts.push(
      `<text x="176" y="118" font-family="${FONT_SANS}" font-size="10" fill="${muted}">暂无数据</text>`,
    );
  }

  if (opts.note) {
    parts.push(
      `<text x="16" y="200" font-family="${FONT_SANS}" font-size="10" fill="${muted2}">${xmlEsc(opts.note)}</text>`,
    );
  }

  parts.push(`</svg>`);
  return parts.join("");
}

/**
 * SVG 字符串 → 2 倍尺寸 PNG dataURL（Image + canvas 光栅化）。
 * @param svg    buildDonutSvg 的输出（须自带 xmlns，颜色已解析成具体值）
 * @param width  逻辑宽（输出 = width * 2）
 * @param height 逻辑高（输出 = height * 2）
 * 不在 jsdom 里测（无 canvas）；失败走 reject，由调用方行内提示。
 */
export function svgToPngDataUrl(svg: string, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    const cleanup = () => URL.revokeObjectURL(url);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = width * 2;
        canvas.height = height * 2;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("canvas 2d context unavailable");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png"));
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      } finally {
        cleanup();
      }
    };
    img.onerror = () => {
      cleanup();
      reject(new Error("SVG 渲染失败"));
    };
    img.src = url;
  });
}
