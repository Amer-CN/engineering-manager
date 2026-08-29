/**
 * a4Pagination 纯函数单测（写作中心 R14）
 *
 * 装饰层涉及 DOM 测量与 ProseMirror 视图，jsdom 无法测布局，靠 code-reviewer 走查 +
 * 用户肉眼验收。本文件只测 assignPageBreaks 纯函数的分页判定逻辑。
 */
import { describe, expect, it } from "vitest";
import { assignPageBreaks } from "@/components/features/writing/a4Pagination";

describe("assignPageBreaks", () => {
  it("空数组不插缝", () => {
    expect(assignPageBreaks([], 931)).toEqual([]);
  });

  it("单页不插缝（总量在容量内）", () => {
    expect(assignPageBreaks([300, 400, 200], 931)).toEqual([]);
  });

  it("恰好等于容量不插缝", () => {
    // 500 + 431 = 931 恰好等于容量（acc + h > capacity 为严格大于，等于不插）
    expect(assignPageBreaks([500, 431], 931)).toEqual([]);
  });

  it("两块超容量在第二块前插 1 缝", () => {
    // 第一块 600 占满余量，第二块 600 累加超容 → 在索引 1 前插缝
    expect(assignPageBreaks([600, 600], 931)).toEqual([1]);
  });

  it("单块超容量不插缝（溢出语义：整块独占当前页）", () => {
    // 单块 2000 > 931：不插缝，整块独占当前页（即便自身溢出）
    expect(assignPageBreaks([2000], 931)).toEqual([]);
  });

  it("单块超容后后续块从新页起算（溢出语义续算）", () => {
    // 块0=2000 独占页0（溢出），acc=2000；块1=300 累加 2300>931 但 acc>0 → 在索引1前插缝，
    // 块1 成为新页首块 acc=300；块2=700 累加 1000>931 → 在索引2前插缝
    expect(assignPageBreaks([2000, 300, 700], 931)).toEqual([1, 2]);
  });

  it("多页多缝：连续多块均超半页容量", () => {
    // 每块 500：0+500=500（页0），500+500=1000>931 → 缝@1，acc=500；
    // 500+500=1000>931 → 缝@2，acc=500；500+500=1000>931 → 缝@3
    expect(assignPageBreaks([500, 500, 500, 500], 931)).toEqual([1, 2, 3]);
  });
});
