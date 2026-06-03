import { useEffect, useRef, useCallback } from 'react'

interface HoverScrollbarReturn {
  containerRef: React.RefObject<HTMLDivElement>
  thumbRef: React.RefObject<HTMLDivElement>
  trackRef: React.RefObject<HTMLDivElement>
  hoveredRef: React.RefObject<boolean>
}

/**
 * 自定义悬浮滚动条 hook
 * 滚动条浮在内容上方，不占据布局空间，鼠标靠近时自动变大
 */
export function useHoverScrollbar(threshold = 15): HoverScrollbarReturn {
  const containerRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const hoveredRef = useRef(false)
  const isDragging = useRef(false)
  const dragStartY = useRef(0)
  const dragStartScrollTop = useRef(0)
  const thumbHeightRef = useRef(0)

  // 直接更新滚动条 DOM
  const updateThumb = useCallback(() => {
    const el = containerRef.current
    const thumb = thumbRef.current
    const track = trackRef.current
    if (!el || !thumb || !track) return

    const { scrollTop, scrollHeight, clientHeight } = el
    const isScrollable = scrollHeight > clientHeight + 2

    if (!isScrollable) {
      track.style.display = 'none'
      return
    }

    track.style.display = 'block'

    const thumbRatio = clientHeight / scrollHeight
    const thumbHeight = Math.max(30, clientHeight * thumbRatio)
    const maxScroll = scrollHeight - clientHeight
    const thumbTop = maxScroll > 0 ? (scrollTop / maxScroll) * (clientHeight - thumbHeight) : 0

    thumbHeightRef.current = thumbHeight
    thumb.style.height = `${thumbHeight}px`
    thumb.style.top = `${thumbTop}px`
  }, [])

  // 鼠标靠近检测
  useEffect(() => {
    const el = containerRef.current
    const track = trackRef.current
    if (!el || !track) return

    let rafId = 0
    let isNear = false
    // 用容器初始宽度做基准，避免滚动条变大后 rect 变化导致抖动

    const expand = () => {
      if (isNear) return
      isNear = true
      hoveredRef.current = true
      track.style.width = '16px'
      const thumb = thumbRef.current
      if (thumb) {
        thumb.style.width = '12px'
        thumb.style.borderRadius = '6px'
        thumb.style.background = 'var(--scrollbar-thumb-hover, rgba(100, 116, 139, 0.7))'
      }
    }

    const shrink = () => {
      if (!isNear) return
      isNear = false
      hoveredRef.current = false
      track.style.width = '10px'
      const thumb = thumbRef.current
      if (thumb) {
        thumb.style.width = '6px'
        thumb.style.borderRadius = '3px'
        thumb.style.background = 'var(--scrollbar-thumb, rgba(148, 163, 184, 0.5))'
      }
    }

    const checkNear = (mouseX: number, mouseY: number) => {
      // 拖拽中保持展开，不检测
      if (isDragging.current) return

      const rect = el.getBoundingClientRect()
      const distRight = rect.right - mouseX
      const inVertical = mouseY >= rect.top && mouseY <= rect.bottom
      const near = inVertical && distRight >= -5 && distRight <= threshold

      near ? expand() : shrink()
    }

    const onMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => checkNear(e.clientX, e.clientY))
    }

    const onMouseLeave = () => {
      if (!isDragging.current) {
        shrink()
      }
    }

    document.addEventListener('mousemove', onMouseMove, { passive: true })
    el.addEventListener('mouseleave', onMouseLeave)

    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      el.removeEventListener('mouseleave', onMouseLeave)
      cancelAnimationFrame(rafId)
    }
  }, [threshold])

  // 滚动和拖拽事件
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onScroll = () => {
      if (!isDragging.current) {
        updateThumb()
      }
    }

    const onResize = () => updateThumb()

    el.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)

    // 初始计算
    updateThumb()

    // 监听内容变化
    const observer = new MutationObserver(() => {
      requestAnimationFrame(updateThumb)
    })
    observer.observe(el, { childList: true, subtree: true })

    return () => {
      el.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      observer.disconnect()
    }
  }, [updateThumb])

  // 拖拽滚动条
  useEffect(() => {
    const thumb = thumbRef.current
    const el = containerRef.current
    if (!thumb || !el) return

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      isDragging.current = true
      dragStartY.current = e.clientY
      dragStartScrollTop.current = el.scrollTop

      const onMouseMove = (e: MouseEvent) => {
        if (!isDragging.current) return

        const deltaY = e.clientY - dragStartY.current
        const { scrollHeight, clientHeight } = el
        const thumbHeight = thumbHeightRef.current
        const maxScroll = scrollHeight - clientHeight
        const scrollRatio = maxScroll / (clientHeight - thumbHeight)

        el.scrollTop = dragStartScrollTop.current + deltaY * scrollRatio
        updateThumb()
      }

      const onMouseUp = (e: MouseEvent) => {
        isDragging.current = false
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        // 拖拽结束后检查鼠标位置，不在附近则缩小
        const rect = el.getBoundingClientRect()
        const distRight = rect.right - e.clientX
        const inVertical = e.clientY >= rect.top && e.clientY <= rect.bottom
        const near = inVertical && distRight >= -5 && distRight <= threshold
        if (!near) {
          const trk = trackRef.current
          if (trk) trk.style.width = '10px'
          const t = thumbRef.current
          if (t) {
            t.style.width = '6px'
            t.style.borderRadius = '3px'
            t.style.background = 'var(--scrollbar-thumb, rgba(148, 163, 184, 0.5))'
          }
          hoveredRef.current = false
        }
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    }

    thumb.addEventListener('mousedown', onMouseDown)
    return () => thumb.removeEventListener('mousedown', onMouseDown)
  }, [updateThumb, threshold])

  // 点击轨道跳转
  useEffect(() => {
    const track = trackRef.current
    const el = containerRef.current
    if (!track || !el) return

    const onClick = (e: MouseEvent) => {
      const rect = track.getBoundingClientRect()
      const clickY = e.clientY - rect.top
      const { scrollHeight, clientHeight } = el
      const ratio = clickY / rect.height

      el.scrollTop = ratio * (scrollHeight - clientHeight)
      updateThumb()
    }

    track.addEventListener('click', onClick)
    return () => track.removeEventListener('click', onClick)
  }, [updateThumb])

  return {
    containerRef,
    thumbRef,
    trackRef,
    hoveredRef,
  }
}
