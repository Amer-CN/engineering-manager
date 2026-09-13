/**
 * FontSizeMark — 字号 mark（自写，不引入 @tiptap/extension-font-size 预览通道包）
 *
 * 官方 extension-font-size 只有 3.0.0-next.3（next 通道），故按任务简报自写：
 * 基于 TextStyle 子类扩展，mark 名 "fontSize"，单一 attribute fontSize（字符串，
 * 如 "16pt"，与 printPreview / docxExport 的 GB/T 9704 pt 单位一致）。
 * 序列化输出 <span style="font-size:16pt">…</span>；命令 setFontSize / unsetFontSize
 * 经 declare module 声明合并注册（同 protectedSpan.ts 做法）。
 */
import { mergeAttributes } from "@tiptap/core";
import { TextStyle } from "@tiptap/extension-text-style";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      /** 设置选中文字字号（如 "16pt"） */
      setFontSize: (fontSize: string) => ReturnType;
      /** 移除选中文字的字号标记（保留文本与其他格式） */
      unsetFontSize: () => ReturnType;
    };
  }
}

export const FontSizeMark = TextStyle.extend({
  // mark 名独立于 textStyle：editor.getAttributes("fontSize") / isActive("fontSize") 按名可查
  name: "fontSize",

  addAttributes() {
    return {
      fontSize: {
        default: null,
        parseHTML: (element) => element.style.fontSize || null,
        renderHTML: (attributes) => {
          if (!attributes.fontSize) return {};
          return { style: `font-size:${attributes.fontSize}` };
        },
      },
    };
  },

  // 只认带 font-size 样式的 span；consuming:false 让 textStyle 等其他 span 标记不受影响
  parseHTML() {
    return [
      {
        tag: "span",
        consuming: false,
        getAttrs: (element) => (element.style.fontSize ? {} : false),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },

  // 完整覆写 addCommands：不继承 TextStyle 的 toggleTextStyle / removeEmptyTextStyle，
  // 避免与真正的 textStyle 扩展重复注册（removeEmptyTextStyle 错删对象）
  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ chain }) => {
        return chain().setMark(this.name, { fontSize }).run();
      },
      unsetFontSize: () => ({ commands }) => {
        return commands.unsetMark(this.name);
      },
    };
  },
});

export default FontSizeMark;
