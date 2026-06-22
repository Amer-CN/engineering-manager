export interface ThumbParams {
  container: HTMLDivElement | null
  thumb: HTMLDivElement | null
  track: HTMLDivElement | null
}

export function updateThumb(params: ThumbParams): { thumbHeight: number } {
  const { container: el, thumb, track } = params
  if (!el || !thumb || !track) return { thumbHeight: 0 }

  const { scrollTop, scrollHeight, clientHeight } = el
  const isScrollable = scrollHeight > clientHeight + 2

  if (!isScrollable) {
    track.style.display = 'none'
    return { thumbHeight: 0 }
  }

  track.style.display = 'block'

  const thumbRatio = clientHeight / scrollHeight
  const thumbHeight = Math.max(30, clientHeight * thumbRatio)
  const maxScroll = scrollHeight - clientHeight
  const thumbTop = maxScroll > 0 ? (scrollTop / maxScroll) * (clientHeight - thumbHeight) : 0

  thumb.style.height = `${thumbHeight}px`
  thumb.style.top = `${thumbTop}px`

  return { thumbHeight }
}

export function applyExpandedStyle(track: HTMLDivElement, thumb: HTMLDivElement) {
  track.style.width = '16px'
  thumb.style.width = '12px'
  thumb.style.borderRadius = '6px'
  thumb.style.background = 'var(--scrollbar-thumb-hover, rgba(100, 116, 139, 0.7))'
}

export function applyCollapsedStyle(track: HTMLDivElement, thumb: HTMLDivElement) {
  track.style.width = '10px'
  thumb.style.width = '6px'
  thumb.style.borderRadius = '3px'
  thumb.style.background = 'var(--scrollbar-thumb, rgba(148, 163, 184, 0.5))'
}

export function isMouseNear(
  el: HTMLDivElement,
  mouseX: number,
  mouseY: number,
  threshold: number
): boolean {
  const rect = el.getBoundingClientRect()
  const distRight = rect.right - mouseX
  const inVertical = mouseY >= rect.top && mouseY <= rect.bottom
  return inVertical && distRight >= -5 && distRight <= threshold
}
