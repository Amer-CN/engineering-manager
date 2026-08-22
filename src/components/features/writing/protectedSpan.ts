/**
 * protectedSpan — Protected Span 标记（写作中心二期 R2）
 *
 * 将 [[双括号]] 包裹的内容渲染为黄色高亮 span.protected-span，
 * 提示员工该处数据受保护。保存时序列化回 [[...]]，Markdown 往返无损。
 *
 * 实现完全参照 @tiptap/extension-highlight 的 markdown 三件套
 * （markdownTokenizer / parseMarkdown / renderMarkdown，见其
 * dist/index.js 47-70 行）。命令类型经 `declare module '@tiptap/core'`
 * 声明合并注册（同官方 extension-highlight 的 .d.ts 做法）。
 */
import { Mark, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    protectedSpan: {
      /** 切换选中文字的 [[ ]] 保护标记 */
      toggleProtectedSpan: () => ReturnType;
    };
  }
}

export const ProtectedSpan = Mark.create({
  name: "protectedSpan",
  // 光标移出后继续打字不再自动带标记
  inclusive: false,

  parseHTML() {
    return [{ tag: "span.protected-span" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes({ class: "protected-span" }, HTMLAttributes), 0];
  },

  renderMarkdown: (node, h) => {
    return `[[${h.renderChildren(node)}]]`;
  },

  parseMarkdown: (token, h) => {
    return h.applyMark("protectedSpan", h.parseInline(token.tokens || []));
  },

  markdownTokenizer: {
    name: "protectedSpan",
    level: "inline",
    start: (src) => src.indexOf("[["),
    tokenize(src, _tokens, h) {
      // 非贪婪匹配；内容不含方括号，防止嵌套误匹配
      const match = /^(\[\[)([^\[\]]+?)(\]\])/.exec(src);
      if (match) {
        const innerContent = match[2];
        const children = h.inlineTokens(innerContent);
        return {
          type: "protectedSpan",
          raw: match[0],
          text: innerContent,
          tokens: children,
        };
      }
      return;
    },
  },

  addCommands() {
    return {
      toggleProtectedSpan: () => ({ commands }) => {
        return commands.toggleMark(this.name);
      },
    };
  },
});

export default ProtectedSpan;
