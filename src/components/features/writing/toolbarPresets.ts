/**
 * toolbarPresets — EditorToolbar 的纯常量/纯函数层：文字颜色、背景高亮、字号预设与字体名截断。
 * 从 EditorToolbar.tsx 机械搬移（门禁 400 行），零逻辑改动。
 */

/** 文字颜色预设（CSS 命名色，跟随主题感知；后续加色只改本表） */
export const COLOR_PRESETS: { key: string; zh: string }[] = [
  { key: "red", zh: "红色" }, { key: "orange", zh: "橙色" }, { key: "gold", zh: "金黄色" }, { key: "green", zh: "绿色" },
  { key: "skyblue", zh: "天蓝色" }, { key: "blue", zh: "蓝色" }, { key: "purple", zh: "紫色" }, { key: "gray", zh: "灰色" },
];

/** 背景高亮色预设（搬多色高亮能力，黄/绿/蓝/粉 4 个常用色） */
export const HIGHLIGHT_PRESETS: { key: string; zh: string }[] = [
  { key: "lightyellow", zh: "黄色高亮" }, { key: "lightgreen", zh: "绿色高亮" },
  { key: "lightblue", zh: "蓝色高亮" }, { key: "pink", zh: "粉色高亮" },
];

/** 字号预设（pt 单位，与 printPreview / docxExport 的 GB/T 9704 版式一致） */
export const FONT_SIZE_PRESETS = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 48, 72];

/** 字体名触发器截断：>6 字符截断 + … */
export const truncateFont = (name: string) => (name.length > 6 ? `${name.slice(0, 6)}…` : name);
