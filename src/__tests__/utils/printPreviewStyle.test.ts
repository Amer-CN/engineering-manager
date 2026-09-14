/**
 * printPreview 样式透传单测（050 双写 content_html）
 *
 * - sourceHtml 非空：经白名单清洗直接进预览（style 白名单属性透传、script/on* 剥除、
 *   白名单外属性剔除）
 * - sourceHtml 为空/缺省：走 markdown 路径，输出与改动前逐字节一致（老文档回退）
 */
import { describe, it, expect } from "vitest";
import { buildPrintPreviewHtml } from "../../utils/printPreview";

describe("buildPrintPreviewHtml sourceHtml 样式透传（050）", () => {
  it("白名单 style 属性透传（color/font-size/font-family/text-align/mark 背景）", () => {
    const src =
      '<p style="text-align:center"><span style="color:#ff0000;font-size:20pt;font-family:黑体">红字</span><mark style="background-color:#fef08a">高亮</mark></p>';
    const out = buildPrintPreviewHtml("# 正文", "标题", src);
    expect(out).toContain('style="color:#ff0000;font-size:20pt;font-family:黑体"');
    expect(out).toContain('<mark style="background-color:#fef08a">高亮</mark>');
    expect(out).toContain('style="text-align:center"');
  });

  it("script 标签与 on* 事件属性剥除，文本保留", () => {
    const out = buildPrintPreviewHtml("", "标题", '<p onclick="alert(1)">安全文本</p><script>alert(2)</script>');
    expect(out).not.toContain("onclick");
    expect(out).not.toContain("<script");
    expect(out).not.toContain("alert(2)");
    expect(out).toContain("安全文本");
  });

  it("白名单外样式属性剔除（保留 color，剔除 position）", () => {
    const out = buildPrintPreviewHtml("", "标题", '<span style="color:#123456;position:fixed">字</span>');
    expect(out).toContain("color:#123456");
    expect(out).not.toContain("position:fixed");
  });
});

describe("buildPrintPreviewHtml 纯文本回退（无 HTML 时不改变现状）", () => {
  it("markdown 加粗/高亮照旧渲染", () => {
    const out = buildPrintPreviewHtml("**粗体** ==高亮==", "标题");
    expect(out).toContain("<strong>粗体</strong>");
    expect(out).toContain('<mark style="background:#fef3c7">高亮</mark>');
  });

  it("sourceHtml 为空串时与双参调用输出完全一致", () => {
    const md = "# 标题行\n\n正文段落";
    expect(buildPrintPreviewHtml(md, "标题", "")).toBe(buildPrintPreviewHtml(md, "标题"));
  });
});
