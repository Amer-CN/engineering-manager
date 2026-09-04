/**
 * useTextSelection — 选中文字监听 hook（Beautiful UI B1）
 *
 * 来源：TurboKach/ai-native-react-components（MIT）selection-actions.tsx 定位思路裁剪（简化：
 * 不用 requestAnimationFrame 优化，不做宽度动画）。监听 document selectionchange + mouseup，
 * 只在 container 范围内、长度 > minLen 的选区生效；返回 null 表示无可操作选区（浮条隐藏）。
 *
 * 定位（fixed 视口坐标，WritingAiMenu 防溢出写法简化版）：
 *  - top = 选区最后一行 bottom + 8（getClientRects 末行，无 rects 时退回 range 包围盒）；
 *    越过视口下界（放不下浮条）时改放选区上方（首行 top - 48），仍不足 8 则钳到 8
 *  - left = 选区水平中心（按浮条半宽 178px 在视口内钳制，渲染端 translateX(-50%) 居中）
 *
 * 滚动跟随：任意容器滚动（capture 捕获）时置 anchorVisible=false（浮条隐藏、不重新定位，
 * 简单可靠）；selectionchange/mouseup 再次触发时恢复显示。
 */

import { useEffect, useState, type RefObject } from 'react'

export interface SelectionInfo {
  text: string
  /** 浮条定位（fixed 视口坐标） */
  top: number
  left: number
  /** false = 期间发生过滚动，浮条应隐藏（渲染端 opacity 0 + pointer-events none） */
  anchorVisible: boolean
}

/** 浮条半宽（用于水平钳制防溢出） */
const BAR_HALF_WIDTH = 178
/** 浮条估计高度（竖直下界钳制用） */
const BAR_EST_HEIGHT = 44

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
      const firstLine = rects.length > 0 ? rects[0] : bounds
      const centerX = bounds.left + bounds.width / 2
      // 竖直下界钳制：下方放不下浮条 → 改放选区上方，仍 <8 钳到 8
      let top = Math.max(8, lastLine.bottom + 8)
      if (top + BAR_EST_HEIGHT > window.innerHeight) top = Math.max(8, firstLine.top - 48)
      setInfo({
        text,
        top,
        left: Math.max(BAR_HALF_WIDTH + 8, Math.min(centerX, window.innerWidth - BAR_HALF_WIDTH - 8)),
        anchorVisible: true,
      })
    }

    /** 滚动 → 隐藏浮条（不重新定位；下一次 selectionchange/mouseup 恢复） */
    const hideOnScroll = () => {
      setInfo((cur) => (cur && cur.anchorVisible ? { ...cur, anchorVisible: false } : cur))
    }

    document.addEventListener('selectionchange', evaluate)
    document.addEventListener('mouseup', evaluate)
    // capture：捕获任何滚动容器的滚动（scroll 事件不冒泡）；passive：纯读处理
    window.addEventListener('scroll', hideOnScroll, { capture: true, passive: true })
    return () => {
      document.removeEventListener('selectionchange', evaluate)
      document.removeEventListener('mouseup', evaluate)
      window.removeEventListener('scroll', hideOnScroll, { capture: true })
    }
  }, [containerRef, minLen])

  return info
}
