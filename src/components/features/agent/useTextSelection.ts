/**
 * useTextSelection — 选中文字监听 hook（Beautiful UI B1）
 *
 * 来源：TurboKach/ai-native-react-components（MIT）selection-actions.tsx 定位思路裁剪（简化：
 * 不用 requestAnimationFrame 优化，不做宽度动画）。监听 document selectionchange + mouseup，
 * 只在 container 范围内、长度 > minLen 的选区生效；返回 null 表示无可操作选区（浮条隐藏）。
 *
 * 定位（fixed 视口坐标，WritingAiMenu 防溢出写法简化版）：
 *  - top = 选区最后一行 bottom + 8（getClientRects 末行，无 rects 时退回 range 包围盒）
 *  - left = 选区水平中心（按浮条半宽 178px 在视口内钳制，渲染端 translateX(-50%) 居中）
 */

import { useEffect, useState, type RefObject } from 'react'

export interface SelectionInfo {
  text: string
  /** 浮条定位（fixed 视口坐标） */
  top: number
  left: number
}

/** 浮条半宽（用于水平钳制防溢出） */
const BAR_HALF_WIDTH = 178

export function useTextSelection(
  containerRef: RefObject<HTMLElement | null>,
  minLen = 20,
): SelectionInfo | null {
  const [info, setInfo] = useState<SelectionInfo | null>(null)

  useEffect(() => {
    const evaluate = () => {
      const container = containerRef.current
      const sel = typeof window !== 'undefined' ? window.getSelection() : null
      if (!container || !sel || sel.isCollapsed || sel.rangeCount === 0) {
        setInfo(null)
        return
      }
      const text = sel.toString()
      // lib.dom 的 Range 类型缺 anchorNode/focusNode（运行时存在于 AbstractRange），交叉类型补齐
      const range = sel.getRangeAt(0) as Range & { anchorNode: Node | null; focusNode: Node | null }
      // 选区必须完整落在 container 内（assistant 气泡渲染区域）
      if (
        !range.anchorNode || !range.focusNode ||
        !container.contains(range.anchorNode) ||
        !container.contains(range.focusNode)
      ) {
        setInfo(null)
        return
      }
      if (text.length <= minLen) {
        setInfo(null)
        return
      }
      const rects = range.getClientRects()
      const bounds = range.getBoundingClientRect()
      const lastLine = rects.length > 0 ? rects[rects.length - 1] : bounds
      const centerX = bounds.left + bounds.width / 2
      setInfo({
        text,
        top: Math.max(8, lastLine.bottom + 8),
        left: Math.max(BAR_HALF_WIDTH + 8, Math.min(centerX, window.innerWidth - BAR_HALF_WIDTH - 8)),
      })
    }

    document.addEventListener('selectionchange', evaluate)
    document.addEventListener('mouseup', evaluate)
    return () => {
      document.removeEventListener('selectionchange', evaluate)
      document.removeEventListener('mouseup', evaluate)
    }
  }, [containerRef, minLen])

  return info
}
