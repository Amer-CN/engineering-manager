import React, { useRef, useEffect, useCallback } from 'react'

interface HoverScrollbarProps {
  children: React.ReactNode
  className?: string
  threshold?: number
}

/**
 * 自定义悬浮滚动条容器
 * 完全自绘滚动条，不使用原生滚动条
 * 鼠标靠近时自动变大，支持拖拽和滚轮
 */
export function HoverScrollbar({ children, className = '', threshold = 15 }: HoverScrollbarProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const dragStartY = useRef(0)
  const dragStartScrollTop = useRef(0)
  const thumbHeightRef = useRef(0)

  // 更新滚动条位置和大小
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

  // 监听内容变化 + resize + scroll（原生滚动触发）
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onResize = () => updateThumb()
    el.addEventListener('scroll', updateThumb, { passive: true })
    window.addEventListener('resize', onResize)
    updateThumb()

    const observer = new MutationObserver(() => requestAnimationFrame(updateThumb))
    observer.observe(el, { childList: true, subtree: true })

    return () => {
      el.removeEventListener('scroll', updateThumb)
      window.removeEventListener('resize', onResize)
      observer.disconnect()
    }
  }, [updateThumb])

  // 鼠标靠近检测 — 变大/变小
  useEffect(() => {
    const el = containerRef.current
    const track = trackRef.current
    if (!el || !track) return

    let rafId = 0
    let isNear = false

    const expand = () => {
      if (isNear) return
      isNear = true
      track.style.width = '10px'
      const thumb = thumbRef.current
      if (thumb) {
        thumb.style.width = '8px'
        thumb.style.borderRadius = '4px'
        thumb.style.opacity = '1'
        thumb.style.background = 'var(--scrollbar-thumb-hover, rgba(100, 116, 139, 0.8))'
      }
    }

    const shrink = () => {
      if (!isNear) return
      isNear = false
      track.style.width = '6px'
      const thumb = thumbRef.current
      if (thumb) {
        thumb.style.width = '3px'
        thumb.style.borderRadius = '2px'
        thumb.style.opacity = '0.5'
        thumb.style.background = 'var(--scrollbar-thumb, rgba(148, 163, 184, 0.6))'
      }
    }

    const checkNear = (mouseX: number, mouseY: number) => {
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
      if (!isDragging.current) shrink()
    }

    document.addEventListener('mousemove', onMouseMove, { passive: true })
    el.addEventListener('mouseleave', onMouseLeave)

    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      el.removeEventListener('mouseleave', onMouseLeave)
      cancelAnimationFrame(rafId)
    }
  }, [threshold])

  // 拖拽滚动条
  useEffect(() => {
    const thumb = thumbRef.current
    const el = containerRef.current
    const track = trackRef.current
    if (!thumb || !el || !track) return

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
        if (maxScroll <= 0 || clientHeight <= thumbHeight) return
        const scrollRatio = maxScroll / (clientHeight - thumbHeight)
        el.scrollTop = dragStartScrollTop.current + deltaY * scrollRatio
        updateThumb()
      }

      const onMouseUp = (e: MouseEvent) => {
        isDragging.current = false
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        // 拖拽结束，不在附近则缩小
        const rect = el.getBoundingClientRect()
        const distRight = rect.right - e.clientX
        const inVertical = e.clientY >= rect.top && e.clientY <= rect.bottom
        if (!(inVertical && distRight >= -5 && distRight <= threshold)) {
          track.style.width = '6px'
          const t = thumbRef.current
          if (t) {
            t.style.width = '3px'
            t.style.borderRadius = '2px'
            t.style.opacity = '0.5'
            t.style.background = 'var(--scrollbar-thumb, rgba(148, 163, 184, 0.6))'
          }
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

  return (
    <div className={`relative ${className}`}>
      <div
        ref={containerRef}
        className="h-full overflow-auto hide-native-scrollbar"
        style={{ overscrollBehavior: 'contain' }}
      >
        {children}
      </div>

      <div
        ref={trackRef}
        className="absolute top-0 h-full"
        style={{
          right: 0,
          width: '6px',
          cursor: 'pointer',
          transition: 'width 0.15s ease-out',
          display: 'none',
          zIndex: 50,
        }}
      >
        <div
          ref={thumbRef}
          className="absolute right-0"
          style={{
            width: '3px',
            height: '30px',
            top: 0,
            background: 'var(--scrollbar-thumb, rgba(148, 163, 184, 0.6))',
            borderRadius: '2px',
            cursor: 'pointer',
            opacity: 0.5,
            transition: 'width 0.15s ease-out, opacity 0.15s ease-out, background 0.15s ease-out, border-radius 0.15s ease-out',
            right: 1,
            willChange: 'top, width, opacity',
          }}
        />
      </div>
    </div>
  )
}
