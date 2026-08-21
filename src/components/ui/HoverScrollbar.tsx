import React, { useRef, useEffect, useCallback } from 'react'

interface HoverScrollbarProps {
  children: React.ReactNode
  className?: string
  threshold?: number
  /** 滚动容器 ref 转发（外部需要 scrollTo / 读取滚动位置时用） */
  scrollRef?: React.MutableRefObject<HTMLDivElement | null>
}

/**
 * 自定义悬浮滚动条容器
 * 完全自绘滚动条，不使用原生滚动条
 * 鼠标靠近时自动变大，支持拖拽和滚轮
 */
export function HoverScrollbar({ children, className = '', threshold = 15, scrollRef }: HoverScrollbarProps) {
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

  // 滚轮滚动链阻断（非 passive 原生监听）：容器可滚时 preventDefault 阻断
  // WebView2 把滚动传播给外层页面，并手动滚动本容器 —— 「滚轮只滚这里」。
  // React 合成 onWheel 是 passive 的，preventDefault 无效，故用原生监听。
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (el.scrollHeight <= el.clientHeight) return // 不可滚：放行外层
      e.preventDefault()
      el.scrollTop += e.deltaY
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

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
      // 用 relative 外层做检测基准：track 画在外层右缘（absolute right:0），
      // 若外层带 padding（如消息流 px-6），滚动内容容器的右缘会比 track 左移
      // 一段 padding，用内容容器检测会出现「贴近滚动条不触发、隔 24px 才触发」
      // 的错位——以外层为准，检测边界与 track 视觉位置始终一致
      const outer = track.parentElement
      if (!outer) return
      const rect = outer.getBoundingClientRect()
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
        // 拖拽期间吃掉默认行为与冒泡：防止指针带出容器时原生滚动接管外层，
        // 出现"拖滚动条带着整页滚"的穿透
        e.preventDefault()
        e.stopPropagation()
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
    /* min-h-0：flex 上下文中允许压缩到内容高度以下（否则 flex-1 的本组件会被
       内容撑爆、内部滚动容器跟着长高 → 滚动失效且撑破外层布局） */
    <div className={`relative min-h-0 ${className}`}>
      <div
        ref={(node) => {
          // 同步内部 containerRef 与外部转发的 scrollRef
          ;(containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node
          if (scrollRef) scrollRef.current = node
        }}
        className="h-full overflow-auto hide-native-scrollbar"
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
