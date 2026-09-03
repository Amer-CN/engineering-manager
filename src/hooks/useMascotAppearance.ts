import { useCallback, useSyncExternalStore } from 'react'

import { COLOR_BY_ID, SHAPE_BY_ID } from '@/components/features/agent/bloub/bot/skins'

/**
 * 吉祥物形象选择（形状 + 颜色），模式照 useTheme：模块级 store +
 * useSyncExternalStore，所有实例共享同一份状态，localStorage 持久化。
 * key 独立命名空间 'mascot.*'；读写前经 SHAPE_BY_ID / COLOR_BY_ID 校验，
 * 非法值（旧版本残留 / 手改 localStorage）回退默认。
 * 默认与 Mascot props 契约一致：triangle / encre（非上游 skins.DEFAULT_SHAPE，
 * 那是 cercle——本项目默认三角配软件图标）。
 */

const SHAPE_KEY = 'mascot.shape'
const COLOR_KEY = 'mascot.color'
const DEFAULT_SHAPE = 'triangle'
const DEFAULT_COLOR = 'encre'

function readShape(): string {
  if (typeof window === 'undefined') return DEFAULT_SHAPE
  const stored = localStorage.getItem(SHAPE_KEY)
  return stored && SHAPE_BY_ID.has(stored) ? stored : DEFAULT_SHAPE
}

function readColor(): string {
  if (typeof window === 'undefined') return DEFAULT_COLOR
  const stored = localStorage.getItem(COLOR_KEY)
  return stored && COLOR_BY_ID.has(stored) ? stored : DEFAULT_COLOR
}

// 全局 store — 所有 useMascotAppearance 实例共享同一份状态
let _shape = readShape()
let _color = readColor()
let _listeners: Set<() => void> = new Set()

function subscribe(listener: () => void) {
  _listeners.add(listener)
  return () => { _listeners.delete(listener) }
}

export function useMascotAppearance() {
  const shape = useSyncExternalStore(subscribe, () => _shape, () => DEFAULT_SHAPE)
  const color = useSyncExternalStore(subscribe, () => _color, () => DEFAULT_COLOR)

  const setShape = useCallback((s: string) => {
    if (!SHAPE_BY_ID.has(s) || s === _shape) return
    _shape = s
    localStorage.setItem(SHAPE_KEY, s)
    _listeners.forEach((fn) => fn())
  }, [])

  const setColor = useCallback((c: string) => {
    if (!COLOR_BY_ID.has(c) || c === _color) return
    _color = c
    localStorage.setItem(COLOR_KEY, c)
    _listeners.forEach((fn) => fn())
  }, [])

  return { shape, color, setShape, setColor }
}
