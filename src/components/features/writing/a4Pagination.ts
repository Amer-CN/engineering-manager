/**
 * a4Pagination — A4 真分页引擎（写作中心 R14）
 *
 * 用 ProseMirror block widget 装饰在编辑器里渲染多张 A4：逐块测量顶层块高度，
 * 累计超过页内容容量时，在下一个块之前插入一条「页缝装饰」——
 * 上页下边距 96px 白 + 24px 灰带（桌缝，上下沿有纸张边缘阴影线）+ 下页上边距 96px 白 = 216px。
 * 装饰是 widget，不改文档内容，getMarkdown/getJSON/导出链路零影响。
 *
 * 语义说明（块级分页）：
 * - 段落（顶层块）永不跨页切断。若某块自身高度 > 容量（如巨型代码块/超高图片），
 *   按 Word 对超高行的策略：不插缝，允许整体溢出该页，后续块从新页起算。
 *   简单正确实现：单块超容时把整块 h 作为新页的累计起点（acc = h），
 *   即让它独占当前页（即便自身已溢出），下一块判定时从 h 重计——
 *   这避免了对超大块做高度取模的复杂语义，且语义自洽：块要么塞进现有余量，要么独占一页。
 */
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { EditorView } from "@tiptap/pm/view";

/** 页内容容量：A4 内容区高度（1123px 纸高 − 96px 顶垫 − 96px 底垫 = 931px）。 */
const CONTENT_H = 931;

/** 页缝装饰的元数据键。 */
const paginationKey = new PluginKey<DecorationSet>("a4Pagination");

/**
 * 纯函数：给定顶层块高度数组与页容量，返回需要插页缝的块索引数组（缝插在该块之前）。
 *
 * 算法：逐块累加高度，当「累加值 > 容量 且当前页已有至少一个块」时，在该块之前插缝，
 * 累加值归零重计（该块成为新页首块）。单块自身 > 容量时不插缝（允许溢出，独占当前页），
 * 其高度作为新页累计起点 acc = h，后续块从该页续算。
 */
export function assignPageBreaks(heights: number[], capacity: number): number[] {
  const breaks: number[] = [];
  let acc = 0;
  for (let i = 0; i < heights.length; i++) {
    const h = heights[i];
    // 累加超容且当前页非空（已有块）→ 在本块之前插缝
    if (acc > 0 && acc + h > capacity) {
      breaks.push(i);
      acc = 0;
    }
    // 单块 > 容量：不插缝，整块独占当前页（即便自身溢出），后续从 h 重计
    acc += h;
  }
  return breaks;
}

/** 读取 .a4-paper 元素的 style.zoom，解析失败回落 1（参考 useA4Zoom 的 ZoomAwareStyle）。 */
function readZoom(view: EditorView): number {
  const paper = view.dom.closest(".a4-paper") as (HTMLElement & { style: { zoom?: string } }) | null;
  if (!paper) return 1;
  const raw = paper.style.zoom;
  if (raw == null || raw === "") return 1;
  const z = Number(raw);
  return Number.isFinite(z) && z > 0 ? z : 1;
}

/** 测量所有顶层块的布局高度（已按当前 zoom 反算）。 */
function measureBlockHeights(view: EditorView): { pos: number; height: number }[] {
  const zoom = readZoom(view);
  const result: { pos: number; height: number }[] = [];
  // view.dom 的直接子元素即顶层块（p / h1 / ul / pre 等），与 doc 顶层子节点同序。
  // 装饰 widget 渲染为块间兄弟（见 buildDecorations），它会出现在 .ProseMirror 直接
  // 子元素里——按索引对齐 doc 顶层块时必须跳过它，否则缝会被当作内容块计入高度。
  let domIdx = 0;
  const domChildren = view.dom.children;
  view.state.doc.forEach((child, offset) => {
    // 找到与当前 doc 子节点对应的 DOM 元素：跳过页缝装饰
    let el = domChildren[domIdx] as Element | undefined;
    while (el && el.classList.contains("a4-page-seam")) {
      domIdx++;
      el = domChildren[domIdx] as Element | undefined;
    }
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // pos 用 doc-local 的块前边界 offset（blockStart），而非 posAtDOM 的块内容起点，
    // 否则 widget 会落进目标段落内部（见 buildDecorations 注释）
    result.push({ pos: offset, height: rect.height / zoom });
    domIdx++;
  });
  return result;
}

/** 创建页缝装饰 DOM：白 96 → 阴影线 → 灰 24 → 阴影线 → 白 96（样式在 index.css .a4-page-seam）。 */
function createSeamDOM(): HTMLElement {
  const dom = document.createElement("div");
  dom.className = "a4-page-seam";
  dom.setAttribute("aria-hidden", "true");
  return dom;
}

/**
 * 根据测量结果构建装饰集合。
 *
 * pos 取目标块的「块前边界」（doc-local offset，由 measureBlockHeights 经
 * doc.forEach 收集，而非 view.posAtDOM(el,0)——后者返回块内容起点 blockStart+1，
 * widget 会落进目标 <p> 内部）。在块前边界插 widget，渲染为块间兄弟元素
 *（<p>..</p><div class="a4-page-seam"></div><p>..</p>），不进段落内部、不污染其 rect。
 *
 * spec 仅 { side: -1 }：prosemirror-view 1.42 的 widget spec 无 block 字段
 *（仅有 side/relaxedSide/marks/stopEvent/ignoreSelection/key/destroy），
 * block:true 会被静默忽略，删除。side:-1 使 widget 渲染在 pos 之前（缝插在目标块前）。
 */
function buildDecorations(view: EditorView): DecorationSet {
  const blocks = measureBlockHeights(view);
  if (blocks.length === 0) return DecorationSet.empty;
  const heights = blocks.map((b) => b.height);
  const breakIndices = assignPageBreaks(heights, CONTENT_H);
  const decos = breakIndices.map((idx) => {
    const pos = blocks[idx].pos;
    return Decoration.widget(pos, createSeamDOM, { side: -1 });
  });
  return DecorationSet.create(view.state.doc, decos);
}

interface PaginationMeta {
  recalculate: true;
}

/**
 * 重算后最新装饰集合。view 回调（持有 EditorView）构建并写入；插件 state.apply 读它。
 * 两者通过同一闭包共享。doc 变更事务窗口内未重算时，apply 用 oldSet.map 保留既有装饰位置。
 */
let latestDecorations: DecorationSet = DecorationSet.empty;

/**
 * 分页 ProseMirror 插件：
 * - doc 变更后 250ms 防抖重算；window resize 重算；初始挂载重算。
 * - 重算间隙用 tr.mapping.map 映射既有装饰位置，防陈旧错位。
 * - 通过 decorations prop 提供装饰（返回 DecorationSet）。
 */
export const paginationPlugin = new Plugin<DecorationSet>({
  key: paginationKey,
  state: {
    init() {
      return DecorationSet.empty;
    },
    apply(tr, oldSet) {
      const meta = tr.getMeta(paginationKey) as PaginationMeta | undefined;
      if (meta?.recalculate) {
        // 重算完成：采用 view 回调写回的最新装饰集合（基于当前 doc 构建）
        return latestDecorations;
      }
      if (tr.docChanged) {
        // 重算窗口内：把既有装饰位置随事务映射，防陈旧错位
        return oldSet.map(tr.mapping, tr.doc);
      }
      return oldSet;
    },
  },
  props: {
    decorations(state) {
      return paginationKey.getState(state) ?? DecorationSet.empty;
    },
  },
  view(editorView) {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastDoc = editorView.state.doc;

    const scheduleRecalculate = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        if (editorView.isDestroyed) return;
        latestDecorations = buildDecorations(editorView);
        editorView.dispatch(
          editorView.state.tr.setMeta(paginationKey, { recalculate: true } as PaginationMeta),
        );
      }, 250);
    };

    // 首次挂载重算
    scheduleRecalculate();
    const onResize = () => scheduleRecalculate();
    window.addEventListener("resize", onResize);

    return {
      update(view) {
        // 仅 doc 变更才重排（选区/装饰 meta 变化不触发递归重算）
        if (view.state.doc !== lastDoc) {
          lastDoc = view.state.doc;
          scheduleRecalculate();
        }
      },
      destroy() {
        if (timer) clearTimeout(timer);
        window.removeEventListener("resize", onResize);
      },
    };
  },
});

/**
 * tiptap v3 扩展包装：把 ProseMirror 分页插件注入编辑器。
 * 走 extensions 数组而非 editor.registerPlugin——tiptap 统一管理生命周期，
 * 插件在编辑器初始化即就位，避免 registerPlugin 的时序问题（详见报告）。
 */
export const A4Pagination = Extension.create({
  name: "a4Pagination",
  addProseMirrorPlugins() {
    return [paginationPlugin];
  },
});
