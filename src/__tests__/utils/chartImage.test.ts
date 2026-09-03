/**
 * chartImage 纯函数测试（阶段三「/图表」插图）。
 * 只测 buildDonutSvg（字符串输出可断言）；svgToPngDataUrl 依赖 canvas，jsdom 无实现，不测。
 * getCssVar 在 jsdom 下读不到主题样式表 → 全部走 hex fallback，输出确定可断言。
 */
import { describe, test, expect } from "vitest";
import { buildDonutSvg } from "@/utils/chartImage";

const data = [
  { name: "材料费", value: 500 },
  { name: "人工费", value: 300 },
  { name: "机械费", value: 150 },
  { name: "其他直接费", value: 50 },
];

describe("buildDonutSvg", () => {
  test("输出完整 SVG 字符串（含 <svg 开头与 </svg> 收尾）", () => {
    const svg = buildDonutSvg(data, {
      title: "成本分类占比",
      note: "数据来源：成本台账 · 取数时间 2026-09-03 10:00",
    });
    expect(svg).toContain("<svg");
    expect(svg.trimEnd().endsWith("</svg>")).toBe(true);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  test("弧段 path 数与输入段数一致", () => {
    expect(buildDonutSvg(data).match(/<path /g)).toHaveLength(4);
    expect(buildDonutSvg(data.slice(0, 2)).match(/<path /g)).toHaveLength(2);
  });

  test("标题与底注文本存在", () => {
    const svg = buildDonutSvg(data, { title: "成本分类占比", note: "其余 2 类并入其他" });
    expect(svg).toContain("成本分类占比");
    expect(svg).toContain("其余 2 类并入其他");
  });

  test("SVG 输出内不残留 CSS 变量（段色为 var() 引用时也须解析/fallback 掉）", () => {
    const svg = buildDonutSvg(
      [
        { name: "已收齐", value: 3, color: "var(--success)" },
        { name: "已作废", value: 1 }, // 无 color → computeDonutSegments 兜底 var(--muted)
      ],
      { title: "发票状态分布", note: "数据来源：发票台账" },
    );
    expect(svg).not.toContain("var(");
  });
});
