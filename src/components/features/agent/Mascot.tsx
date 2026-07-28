/**
 * Mascot — AI 管家吉祥物（纯代码 div 球，0 资源依赖）
 *
 * 1:1 还原 bedrock-prototype.html 的原版 .orb：主题 token 驱动的圆球
 * —— 球身 var(--panel-2) + 1px var(--border) + 底部 inset 内阴影做立体感，
 *    双眼 var(--fg)（纸主题墨色 / 墨主题自动变亮），眼角高光 var(--card)。
 * 交互：双眼同步跟随鼠标（min(4,dist/40)）、随机眨眼、待机轻呼吸；
 *       支持 idle / thinking（球体呼吸转微透）/ listening（眼略放大）/ success（眯眼笑）。
 * 无障碍：prefers-reduced-motion 时静止呈现。
 */

import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

export type MascotState = 'idle' | 'thinking' | 'listening' | 'success'

interface MascotProps {
  /** 渲染尺寸（正方形，px），默认 96 */
  size?: number
  /** 情绪状态，默认 idle */
  state?: MascotState
  /** 是否启用眼睛跟随鼠标，默认 true */
  follow?: boolean
  className?: string
}

/** 原型基准边长（.orb = 108px），组件按 size 等比缩放 */
const BASE = 108

const Mascot: React.FC<MascotProps> = ({ size = 96, state = 'idle', follow = true, className }) => {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [off, setOff] = useState({ x: 0, y: 0 })
  const [blink, setBlink] = useState(false)
  const [reduced] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )

  // 双眼同步跟随鼠标（对齐原版：min(4, dist/40)，思考/完成态不跟随）
  useEffect(() => {
    if (reduced || !follow || state === 'thinking' || state === 'success') return
    let raf = 0
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const el = wrapRef.current
        if (!el) return
        const r = el.getBoundingClientRect()
        const cx = r.left + r.width / 2
        const cy = r.top + r.height / 2
        const a = Math.atan2(e.clientY - cy, e.clientX - cx)
        const d = Math.min(4, Math.hypot(e.clientX - cx, e.clientY - cy) / 40)
        setOff({ x: Math.cos(a) * d, y: Math.sin(a) * d })
      })
    }
    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [reduced, follow, state])

  // 随机眨眼（完成态不眨）
  useEffect(() => {
    if (reduced || state === 'success') return
    let timer: number
    const loop = () => {
      setBlink(true)
      window.setTimeout(() => setBlink(false), 150)
      timer = window.setTimeout(loop, 2600 + Math.random() * 2800)
    }
    timer = window.setTimeout(loop, 1800)
    return () => window.clearTimeout(timer)
  }, [reduced, state])

  const k = size / BASE

  // 眼睛动画目标（跟随位移 + 状态形变 + 眨眼）
  let eyes: { x: number; y: number; scale: number; scaleY: number }
  if (state === 'thinking') eyes = { x: 0, y: -2, scale: 1, scaleY: 1 }
  else if (state === 'listening') eyes = { x: off.x, y: off.y, scale: 1.12, scaleY: 1 }
  else if (state === 'success') eyes = { x: 0, y: 0, scale: 1, scaleY: 0.3 }
  else eyes = { x: off.x, y: off.y, scale: 1, scaleY: 1 }
  if (blink && state !== 'success') eyes = { ...eyes, scaleY: eyes.scaleY * 0.18 }

  const eyeStyle: React.CSSProperties = {
    width: 15,
    height: 15,
    borderRadius: '50%',
    background: 'var(--fg)',
    position: 'relative',
  }
  const sparkStyle: React.CSSProperties = {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: '50%',
    background: 'var(--card)',
    top: 3,
    right: 3,
    opacity: 0.7,
  }

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{ width: size, height: size, display: 'grid', placeItems: 'center' }}
      aria-label="AI 管家"
      role="img"
    >
      <div style={{ width: BASE, height: BASE, position: 'relative', transform: `scale(${k})` }}>
        {/* 球身：主题面色 + 发丝边 + 底部 inset 内阴影（立体感）+ 柔和落影 */}
        <motion.div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'var(--panel-2)',
            border: '1px solid var(--border)',
            boxShadow: 'inset 0 -6px 16px -8px rgba(0,0,0,0.22), 0 10px 26px -14px rgba(0,0,0,0.20)',
            overflow: 'hidden',
          }}
          animate={reduced ? undefined : state === 'thinking' ? { opacity: [1, 0.72, 1] } : { scale: [1, 1.02, 1] }}
          transition={
            state === 'thinking'
              ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 5, repeat: Infinity, ease: 'easeInOut' }
          }
        />
        {/* 双眼：主题前景色 + 眼角高光，整体同步跟随 / 眨眼 / 状态形变 */}
        <motion.div
          style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}
          animate={{ x: eyes.x, y: eyes.y, scale: eyes.scale, scaleY: eyes.scaleY }}
          transition={{ duration: 0.14, ease: 'easeOut' }}
        >
          <div style={eyeStyle}>
            <span style={sparkStyle} />
          </div>
          <div style={eyeStyle}>
            <span style={sparkStyle} />
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Mascot
