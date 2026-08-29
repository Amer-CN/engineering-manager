/**
 * exportFormats.ts — 写作中心导出多格式（R15）
 *
 * - downloadTextFile：通用文本下载（Blob + URL.createObjectURL + a.click + revoke，
 *   下载写法对齐 docxExport）
 * - stripMarkdownSyntax：markdown 原文 → 纯文本（剥标记留内容），纯函数可单测。
 */

/** 通用文本下载（对齐 docxExport 的下载写法：Blob → createObjectURL → a.click → revoke） */
export function downloadTextFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * stripMarkdownSyntax — markdown → 纯文本（剥标记，留内容；与编辑器 @tiptap/markdown 输出子集对齐）。
 *
 * 规则：
 * - 代码围栏 ``` 标记行删除，围栏内代码原样保留（不做任何 markdown 处理）
 * - 标题 # 剥除（1-6 级）
 * - 行内标记剥除：**粗** *斜* ~~删~~ ==高亮== `代码` → 内容
 * - 图片 ![alt](url) → [图片: alt]
 * - 链接 [text](url) → text
 * - 表格行 |a|b| → a\tb（对齐分隔行 |---| 剔除）
 * - 引用 > 剥除
 * - 任务 - [ ] → ☐、- [x] → ☑
 * - 分隔线 --- → ————
 * - 列表前缀（- / 1. 等）保留
 */
export function stripMarkdownSyntax(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inFence = false;

  for (const raw of lines) {
    const t = raw.trim();

    // 代码围栏标记行（``` 开头）：删标记行，翻转围栏内状态
    if (/^```/.test(t)) {
      inFence = !inFence;
      continue;
    }

    // 围栏内代码原样保留
    if (inFence) {
      out.push(t);
      continue;
    }

    let line = t;

    // 表格行：|a|b| → a\tb；|--| 对齐分隔行剔除
    if (t.startsWith("|") && t.endsWith("|")) {
      if (/^\|[\s:|-]+\|$/.test(t)) continue;
      line = t
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((c) => c.trim())
        .join("\t");
    } else if (/^#{1,6}\s+/.test(t)) {
      // 标题：剥 #
      line = t.replace(/^#{1,6}\s+/, "");
    } else if (/^>/.test(t)) {
      // 引用：剥 >
      line = t.replace(/^>\s?/, "");
    } else if (/^[-*]\s+\[[ xX]\]\s+/.test(t)) {
      // 任务：- [ ] → ☐、- [x] → ☑（列表前缀保留）
      line = t.replace(/^[-*]\s+\[([ xX])\]\s+/, (_m, mark) =>
        mark.toLowerCase() === "x" ? "☑ " : "☐ ",
      );
    } else if (/^---+$/.test(t)) {
      // 分隔线 → ————
      line = "————";
    }

    // 行内标记剥除（图片 / 链接 / 粗 / 斜 / 删 / 高亮 / 代码）
    line = line
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "[图片: $1]")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*\n]+)\*/g, "$1")
      .replace(/~~([^~]+)~~/g, "$1")
      .replace(/==([^=]+)==/g, "$1")
      .replace(/`([^`]+)`/g, "$1");

    out.push(line);
  }

  return out.join("\n");
}
