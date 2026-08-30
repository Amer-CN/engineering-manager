/**
 * writingPerf.test.ts — P2 长文档性能基准（施工组织设计量级）
 *
 * 目的：拿数据说话。模拟 3 万字 / 数百段 / 含表格的施组文档，测三件事：
 *   1. 编辑器初始化 + setContent（打开文档）
 *   2. 打字更新（末尾插入一段触发 onUpdate 全链路：防抖保存里 editor.getMarkdown() 全文序列化）
 *   3. getMarkdown 序列化本身的耗时
 * 阈值宽松（CI 抖动）：初始化 < 3s、单次打字更新链路 < 500ms、序列化 < 300ms。
 * jsdom 无真实布局，数字偏乐观；超标即真实浏览器必然卡，作为回归下限仍有意义。
 */
import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { Markdown } from "@tiptap/markdown";

/** 生成施组量级 markdown：600 段 × ~50 字 + 4 个表格 */
function buildShizuMarkdown(): string {
  const parts: string[] = [];
  for (let i = 0; i < 50; i++) {
    parts.push(`## 第${i + 1}章 分项施工方案`);
    for (let j = 0; j < 10; j++) {
      parts.push(`本节阐述第${j + 1}项施工工艺流程。施工前由技术负责人组织图纸会审，明确质量标准与安全要求，对作业班组进行三级安全技术交底。施工过程中严格执行隐蔽工程验收制度，各工序完成后经监理工程师检查合格方可进入下道工序，确保工程质量符合设计及规范要求。`);
    }
    if (i % 12 === 0) {
      parts.push("| 项目 | 数值 | 备注 |\n|---|---|---|\n| 工期 | 540 天 | 总工期 |\n| 人数 | 320 人 | 高峰期 |\n| 面积 | 50000 ㎡ | 建筑 |");
    }
  }
  return parts.join("\n\n");
}

function makeEditor() {
  return new Editor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Markdown,
    ],
    content: "",
  });
}

describe("写作中心长文档性能基准（施组量级：~600 段 + 4 表格）", () => {
  it("打开文档（setContent markdown）< 3s", () => {
    const md = buildShizuMarkdown();
    const editor = makeEditor();
    const t0 = Date.now();
    editor.commands.setContent(md, { contentType: "markdown" } as never);
    const ms = Date.now() - t0;
    editor.destroy();
    // eslint-disable-next-line no-console
    console.log(`[perf] setContent: ${ms}ms, doc size: ${md.length} chars`);
    expect(ms).toBeLessThan(3000);
  });

  it("getMarkdown 全文序列化 < 300ms", () => {
    const md = buildShizuMarkdown();
    const editor = makeEditor();
    editor.commands.setContent(md, { contentType: "markdown" } as never);
    const t0 = Date.now();
    const out = editor.getMarkdown();
    const ms = Date.now() - t0;
    editor.destroy();
    // eslint-disable-next-line no-console
    console.log(`[perf] getMarkdown: ${ms}ms, output: ${out.length} chars`);
    expect(ms).toBeLessThan(300);
    expect(out.length).toBeGreaterThan(10000);
  });

  it("末尾打字一次的更新链路（transaction + view update）< 500ms", () => {
    const md = buildShizuMarkdown();
    const editor = makeEditor();
    editor.commands.setContent(md, { contentType: "markdown" } as never);
    const end = editor.state.doc.content.size - 1;
    const t0 = Date.now();
    editor.chain().insertContentAt(end, "，并持续优化资源配置。").run();
    const ms = Date.now() - t0;
    editor.destroy();
    // eslint-disable-next-line no-console
    console.log(`[perf] single edit transaction: ${ms}ms`);
    expect(ms).toBeLessThan(500);
  });
});
