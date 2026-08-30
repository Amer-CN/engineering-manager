/**
 * pasteSanitizer.ts — 粘贴 HTML 净化（写作中心 P1：粘贴保真）
 *
 * 从 Word（施工组织设计等长文档）与网页粘贴进编辑器时，保留结构语义、
 * 剥除全部脏样式。纯函数，供 tiptap editorProps.transformPastedHTML 使用。
 *
 * 规则：
 * - 白名单重建：h1-h6 / p / ul ol li / table thead tbody tr td th /
 *   strong b / em i / u / s del strike / br / img / a
 * - PURE 容器（div/span/font 及一切未识别标签）：递归上提子节点（去标签留内容）
 * - 整树丢弃：script/style/link/meta 及 Word 命名空间标签（o:p / v:shape / w:r …）
 * - 属性：全部剥除，唯 img 留 src/alt、a 留 href；class/style 一律不保留
 * - &nbsp;（U+00A0）原样保留（Word 表格空格）
 */

/** 保留标签：结构语义（标题/列表/表格/行内格式/媒体/链接） */
const KEEP_TAGS = new Set([
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "ul", "ol", "li",
  "table", "thead", "tbody", "tr", "td", "th",
  "strong", "b", "em", "i", "u", "s", "del", "strike",
  "br", "img", "a",
]);

/** 整树丢弃标签（安全 + 模板壳） */
const DROP_TAGS = new Set(["script", "style", "link", "meta"]);

/** 属性白名单：img 留 src/alt，a 留 href，其余标签零属性 */
const ALLOWED_ATTRS: Record<string, readonly string[]> = {
  img: ["src", "alt"],
  a: ["href"],
};

/** URL 协议白名单（防御纵深）：img src / a href 仅允许这些 scheme，javascript: 等被剥 */
function isSafeUrl(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (v.startsWith("data:image/")) return !v.startsWith("data:image/svg+xml"); // SVG 可内嵌脚本，不放行
  try {
    const scheme = new URL(v).protocol;
    return scheme === "http:" || scheme === "https:" || scheme === "ftp:" || scheme === "mailto:" || scheme === "tel:";
  } catch {
    return false; // 相对路径以外的一律拒绝（编辑器内相对路径无意义）
  }
}

/** 递归重建：把 src 的子节点净化后挂到 out（DocumentFragment 或元素） */
function rebuild(src: Node, out: Node): void {
  const doc = out.ownerDocument!; // rebuild 只处理同文档内的节点，ownerDocument 恒非空
  for (const child of Array.from(src.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      out.appendChild(child.cloneNode(true));
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue; // 注释等一律丢弃
    const el = child as Element;
    const tag = el.tagName.toLowerCase();
    // Word/Office 命名空间标签（o:p、v:shape、w:r…）整树丢弃；命中 DROP 同丢弃
    if (tag.includes(":") || DROP_TAGS.has(tag)) continue;
    if (!KEEP_TAGS.has(tag)) {
      // PURE 容器（div/span/font 及一切未识别标签）：递归上提子节点
      rebuild(el, out);
      continue;
    }
    const created = doc.createElement(tag);
    for (const name of ALLOWED_ATTRS[tag] ?? []) {
      const value = el.getAttribute(name);
      // URL 类属性过协议白名单（防御纵深：javascript:/data:svg 等在此剥除）
      if (value != null && (name !== "src" && name !== "href")) created.setAttribute(name, value);
      else if (value != null && isSafeUrl(value)) created.setAttribute(name, value);
    }
    rebuild(el, created);
    out.appendChild(created);
  }
}

/** 净化粘贴 HTML：按白名单重建 DOM，剥 class/style 等一切脏属性，保留结构语义 */
export function sanitizePastedHtml(html: string): string {
  if (typeof html !== "string" || html.trim() === "") return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  // 用 HTML 片段序列化（innerHTML）而非 XMLSerializer：不产生 xmlns 前缀，&nbsp;/< 等正确转义
  const out = doc.createElement("div");
  rebuild(doc.body, out);
  return out.innerHTML;
}
