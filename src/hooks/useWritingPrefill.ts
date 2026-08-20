import { useEffect } from "react";

/**
 * useWritingPrefill — 消费外部传入的写作预填参数
 *
 * 模式参照 knowledge:pendingDocId / agent:prefill（sessionStorage + navigate 事件）。
 * 写入方（如语音页「生成会议纪要」）：
 *   sessionStorage.setItem('writing:prefill', JSON.stringify({
 *     material, docType, styleId, sourceType, sourceRef, title
 *   }))
 *   window.dispatchEvent(new CustomEvent('navigate', { detail: 'writing' }))
 * 本 hook 在 WritingIndex 挂载时消费：自动建文档（source_type/source_ref 落库）并进编辑器。
 */

export interface WritingPrefill {
  material: string;
  docType?: string;
  styleId?: string;
  sourceType?: string;
  sourceRef?: string;
  title?: string;
}

const KEY = "writing:prefill";

export function readWritingPrefill(): WritingPrefill | null {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WritingPrefill;
  } catch {
    return null;
  }
}

export function consumeWritingPrefill(): WritingPrefill | null {
  const p = readWritingPrefill();
  if (p) sessionStorage.removeItem(KEY);
  return p;
}

export function writeWritingPrefill(p: WritingPrefill): void {
  sessionStorage.setItem(KEY, JSON.stringify(p));
  window.dispatchEvent(new CustomEvent("navigate", { detail: "writing" }));
}

/** 在 WritingIndex 里调用：有 prefill 时调用 onPrefill 处理 */
export function useWritingPrefill(onPrefill: (p: WritingPrefill) => void): void {
  useEffect(() => {
    const p = consumeWritingPrefill();
    if (p) onPrefill(p);
  }, [onPrefill]);
}
