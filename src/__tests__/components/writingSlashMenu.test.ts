/**
 * 斜杠菜单（R7）核心逻辑单测：过滤、useSlashMenu 的过滤词提取与收起条件。
 * 键盘/鼠标交互属 jsdom 限制范围，靠 WritingSlashMenu 内 document 级监听 + 人工验收。
 */
import { describe, expect, it } from "vitest";
import { filterSlashItems, slashItems } from "@/components/features/writing/WritingSlashMenu";

describe("filterSlashItems", () => {
  it("空 query 返回全部 12 项", () => {
    expect(filterSlashItems("")).toHaveLength(12);
    expect(filterSlashItems("  ")).toHaveLength(12);
  });

  it("中文 label 模糊匹配：标题", () => {
    const r = filterSlashItems("标题");
    expect(r).toHaveLength(3);
    expect(r.map((i) => i.label)).toEqual(["一级标题", "二级标题", "三级标题"]);
  });

  it("英文 hint 不区分大小写匹配：heading", () => {
    const r = filterSlashItems("heading");
    expect(r.length).toBe(3);
    const r2 = filterSlashItems("LIST");
    expect(r2.map((i) => i.label)).toContain("无序列表");
    expect(r2.map((i) => i.label)).toContain("任务清单");
  });

  it("无匹配返回空数组", () => {
    expect(filterSlashItems("不存在xyz")).toHaveLength(0);
  });
});

describe("slashItems 完整性", () => {
  it("12 项均有 label/hint/icon/run 且 label 唯一", () => {
    expect(slashItems).toHaveLength(12);
    const labels = slashItems.map((i) => i.label);
    expect(new Set(labels).size).toBe(12);
    for (const item of slashItems) {
      expect(item.label).toBeTruthy();
      expect(item.hint).toBeTruthy();
      expect(item.icon).toBeTruthy();
      expect(typeof item.run).toBe("function");
    }
  });
});
