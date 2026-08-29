/**
 * useA4Zoom — A4 纸张 Ctrl+滚轮缩放（写作中心 R6；R9 监听范围扩到工具栏+纸张区）
 *
 * 在 bindWheelRef 指向的包裹层（工具栏 + 纸张滚动区）上挂原生 wheel 监听
 * （{ passive: false } 才能 preventDefault，React 的 onWheel 在 root 上是
 * passive 的，做法对齐 costLedger 的先例），zoom ∈ [0.5, 2]、步进 0.1。
 * 缩放实现用 style.zoom（Chromium / WebView2 支持，项目内 costLedger 已有先例），
 * 不破布局（无需 wrapper 抵消占位）；zoom 属性不可用时回落 transform: scale。
 * bindRef 指向 .editor-canvas（R15 画布，只负责把 zoom 应用到 style）。
 */

import { useCallback, useEffect, useRef, useState } from "react";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const STEP = 0.1;

export interface UseA4Zoom {
  /** 当前缩放（0.5–2，1 为 100%） */
  zoom: number;
  /** 重置为 100% */
  reset: () => void;
  /** 绑到 .editor-canvas 元素的 ref（应用 zoom 到 style） */
  bindRef: React.RefObject<HTMLDivElement>;
  /** 绑到「工具栏 + 画布滚动区」包裹层的 ref（挂 wheel 监听，Ctrl+滚轮在该范围内均可缩放） */
  bindWheelRef: React.RefObject<HTMLDivElement>;
}

function clampZoom(z: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(z * 10) / 10));
}

/** style.zoom 不在 TS 内置 CSSStyleDeclaration 类型里（Chromium 实际支持），手动扩展 */
type ZoomAwareStyle = CSSStyleDeclaration & { zoom?: string };

/** 应用缩放到元素：优先 style.zoom，不支持时回落 transform: scale */
function applyZoom(el: HTMLElement, zoom: number): void {
  const style = el.style as ZoomAwareStyle;
  if (typeof style.zoom === "string") {
    style.zoom = String(zoom);
    style.transform = "";
    style.transformOrigin = "";
  } else {
    style.zoom = "";
    style.transform = `scale(${zoom})`;
    style.transformOrigin = "top center";
  }
}

export function useA4Zoom(): UseA4Zoom {
  const [zoom, setZoom] = useState(1);
  const bindRef = useRef<HTMLDivElement>(null);
  const bindWheelRef = useRef<HTMLDivElement>(null);

  // Ctrl+滚轮：preventDefault（阻止浏览器整页缩放）→ zoom ±0.1
  // R9：监听从 .editor-canvas 上提到 bindWheelRef 包裹层（工具栏 + 画布滚动区），
  // 鼠标悬停在工具栏上 Ctrl+滚轮也能缩放，且编辑器视图内无浏览器整页缩放路径
  useEffect(() => {
    const el = bindWheelRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setZoom((z) => clampZoom(z - Math.sign(e.deltaY) * STEP));
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  // zoom 变化 → 写到 .editor-canvas 元素 style
  useEffect(() => {
    if (bindRef.current) applyZoom(bindRef.current, zoom);
  }, [zoom]);

  const reset = useCallback(() => setZoom(1), []);

  return { zoom, reset, bindRef, bindWheelRef };
}
