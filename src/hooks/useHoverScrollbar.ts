import { useEffect, useRef, useCallback } from 'react'
import { updateThumb, applyExpandedStyle, applyCollapsedStyle, isMouseNear } from './useHoverScrollbar.helpers'

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

  const syncThumb = useCallback(() => {
    const { thumbHeight } = updateThumb({
      container: containerRef.current,
      thumb: thumbRef.current,
      track: trackRef.current,
    })
    thumbHeightRef.current = thumbHeight
  }, [])

  // 鼠标靠近检测
  useEffect(() => {
    const el = containerRef.current
    const track = trackRef.current
    if (!el || !track) return
    let rafId = 0
    let isNear = false
    const expand = () => {
      if (isNear) return
      isNear = true
      hoveredRef.current = true
      const thumb = thumbRef.current
      if (thumb) applyExpandedStyle(track, thumb)
    }
    const shrink = () => {
      if (!isNear) return
      isNear = false
      hoveredRef.current = false
      const thumb = thumbRef.current
      if (thumb) applyCollapsedStyle(track, thumb)
    }
    const checkNear = (mouseX: number, mouseY: number) => {
      if (isDragging.current) return
      isMouseNear(el, mouseX, mouseY, threshold) ? expand() : shrink()
    }
    const onMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => checkNear(e.clientX, e.clientY))
    }
    const onMouseLeave = () => { if (!isDragging.current) shrink() }
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
    const onScroll = () => { if (!isDragging.current) syncThumb() }
    const onResize = () => syncThumb()
    el.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    syncThumb()
    const observer = new MutationObserver(() => requestAnimationFrame(syncThumb))
    observer.observe(el, { childList: true, subtree: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      observer.disconnect()
    }
  }, [syncThumb])

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
        syncThumb()
      }
      const onMouseUp = (e: MouseEvent) => {
        isDragging.current = false
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        if (!isMouseNear(el, e.clientX, e.clientY, threshold)) {
          const trk = trackRef.current
          const t = thumbRef.current
          if (trk && t) applyCollapsedStyle(trk, t)
          hoveredRef.current = false
        }
      }
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    }
    thumb.addEventListener('mousedown', onMouseDown)
    return () => thumb.removeEventListener('mousedown', onMouseDown)
  }, [syncThumb, threshold])

  // 点击轨道跳转
  useEffect(() => {
    const track = trackRef.current
    const el = containerRef.current
    if (!track || !el) return
    const onClick = (e: MouseEvent) => {
      const rect = track.getBoundingClientRect()
      const clickY = e.clientY - rect.top
      const { scrollHeight, clientHeight } = el
      el.scrollTop = (clickY / rect.height) * (scrollHeight - clientHeight)
      syncThumb()
    }
    track.addEventListener('click', onClick)
    return () => track.removeEventListener('click', onClick)
  }, [syncThumb])

  return { containerRef, thumbRef, trackRef, hoveredRef }
}
