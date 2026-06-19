import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, Download } from 'lucide-react'
import { useThemeContext } from '../contexts/ThemeContext'
import Logo from './Logo'
import BlurText from './reactbits/BlurText'
import ShinyText from './reactbits/ShinyText'
import Magnet from './reactbits/Magnet'

function getMaskColor(theme: string): string {
  if (theme === 'graphite') return '23, 26, 34'
  if (theme === 'sandstone') return '249, 244, 236'
  return '250, 251, 252'  // 冷白 slate-50
}

function Typewriter({ text, delay = 55, startDelay = 350 }: {
  text: string; delay?: number; startDelay?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const original = text
    el.textContent = ''
    el.style.whiteSpace = 'nowrap'

    const tmp = document.createElement('span')
    tmp.style.cssText = `
      position:absolute;visibility:hidden;white-space:nowrap;
      font-size:${getComputedStyle(el).fontSize};
      font-family:${getComputedStyle(el).fontFamily};
    `
    tmp.textContent = original
    document.body.appendChild(tmp)
    const fullW = tmp.getBoundingClientRect().width
    document.body.removeChild(tmp)
    if (fullW > 0) el.style.width = Math.ceil(fullW) + 'px'

    const chars: HTMLSpanElement[] = []
    for (const ch of original) {
      const s = document.createElement('span')
      s.className = 'char'
      s.textContent = ch
      el.appendChild(s)
      chars.push(s)
    }
    const caret = document.createElement('span')
    caret.className = 'type-caret'
    caret.setAttribute('aria-hidden', 'true')
    el.appendChild(caret)

    chars.forEach((c, i) => {
      setTimeout(() => c.classList.add('is-typed'), startDelay + i * delay)
    })
    setTimeout(() => el.classList.add('is-done'), startDelay + chars.length * delay + 150)
  }, [text, delay, startDelay])

  return (
    <p ref={ref} className="hero__subtitle" style={{
      margin: 0,
      fontSize: 22,
      fontWeight: 500,
      letterSpacing: '0.4px',
      lineHeight: 1.5,
      color: 'var(--hero-text)',
      fontFamily: `'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', 'STSong', Georgia, serif`,
      whiteSpace: 'nowrap',
      maxWidth: 'min(940px, 94vw)',
    }}>
      <span className="type-caret" aria-hidden="true" />
    </p>
  )
}

export default function Hero() {
  const { theme } = useThemeContext()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const themeRef = useRef(theme)
  themeRef.current = theme

  useEffect(() => {
    const hero = document.getElementById('hero-section')
    const canvas = canvasRef.current
    if (!hero || !canvas) return

    const canHover = window.matchMedia('(hover: hover)').matches
    if (!canHover) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const R_START = 8
    const R_END = 128
    const R_VARY = 0.45
    const LIFETIME = 520
    const STAMP_STEP = 12
    const MAX_STAMPS = 160
    const DPR = Math.min(window.devicePixelRatio || 1, 2)

    let w = 0
    let h = 0

    function resize() {
      const rect = hero.getBoundingClientRect()
      w = rect.width
      h = rect.height
      canvas.width = Math.round(w * DPR)
      canvas.height = Math.round(h * DPR)
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = 'rgb(' + getMaskColor(themeRef.current) + ')'
      ctx.fillRect(0, 0, w, h)
    }
    resize()
    window.addEventListener('resize', resize)

    const observer = new MutationObserver(() => {
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = 'rgb(' + getMaskColor(themeRef.current) + ')'
      ctx.fillRect(0, 0, w, h)
      stamps.length = 0
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    const stamps: { x: number; y: number; born: number; seed: number; rmax: number }[] = []
    let lastX: number | null = null
    let lastY: number | null = null

    function addStamp(x: number, y: number) {
      if (stamps.length >= MAX_STAMPS) stamps.shift()
      stamps.push({
        x, y,
        born: performance.now(),
        seed: Math.random() * Math.PI * 2,
        rmax: R_END * (1 - R_VARY + Math.random() * R_VARY),
      })
    }

    function stampAlong(x: number, y: number) {
      if (lastX === null) {
        addStamp(x, y)
      } else {
        const dx = x - lastX
        const dy = y - lastY
        const dist = Math.hypot(dx, dy)
        const steps = Math.max(1, Math.ceil(dist / STAMP_STEP))
        for (let i = 1; i <= steps; i++) {
          addStamp(lastX + (dx * i) / steps, lastY + (dy * i) / steps)
        }
      }
      lastX = x
      lastY = y
    }

    function carveInk(x: number, y: number, r: number, alpha: number, seed: number) {
      const g = ctx.createRadialGradient(x, y, r * 0.25, x, y, r)
      g.addColorStop(0, 'rgba(0, 0, 0, ' + 0.95 * alpha + ')')
      g.addColorStop(0.55, 'rgba(0, 0, 0, ' + 0.88 * alpha + ')')
      g.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = g
      ctx.beginPath()
      const segs = 32
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2
        const wob =
          0.78 +
          0.14 * Math.sin(a * 3 + seed) +
          0.08 * Math.sin(a * 7 + seed * 2.1) +
          0.05 * Math.sin(a * 13 + seed * 0.7)
        const rr = r * wob
        const px = x + Math.cos(a) * rr
        const py = y + Math.sin(a) * rr
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.fill()
    }

    let running = false
    function loop() {
      const now = performance.now()
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = 'rgb(' + getMaskColor(themeRef.current) + ')'
      ctx.fillRect(0, 0, w, h)

      ctx.globalCompositeOperation = 'destination-out'
      for (let i = stamps.length - 1; i >= 0; i--) {
        const t = (now - stamps[i].born) / LIFETIME
        if (t >= 1) { stamps.splice(i, 1); continue }
        const ease = 1 - Math.pow(1 - t, 3)
        const r = R_START + (stamps[i].rmax - R_START) * ease
        const alpha = 1 - t * t
        carveInk(stamps[i].x, stamps[i].y, r, alpha, stamps[i].seed)
      }

      if (stamps.length) requestAnimationFrame(loop)
      else running = false
    }

    function start() {
      if (!running) { running = true; requestAnimationFrame(loop) }
    }

    function onEnter(e: MouseEvent) {
      const rect = hero.getBoundingClientRect()
      lastX = e.clientX - rect.left
      lastY = e.clientY - rect.top
      stampAlong(lastX, lastY)
      start()
    }
    function onMove(e: MouseEvent) {
      const rect = hero.getBoundingClientRect()
      stampAlong(e.clientX - rect.left, e.clientY - rect.top)
      start()
    }
    function onLeave() { lastX = null; lastY = null }

    hero.addEventListener('mouseenter', onEnter)
    hero.addEventListener('mousemove', onMove)
    hero.addEventListener('mouseleave', onLeave)

    return () => {
      hero.removeEventListener('mouseenter', onEnter)
      hero.removeEventListener('mousemove', onMove)
      hero.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('resize', resize)
      observer.disconnect()
    }
  }, [])

  return (
    <section
      id="hero-section"
      className="hero-root"
      style={{
        position: 'relative',
        minHeight: '100vh',
        overflow: 'hidden',
        isolation: 'isolate',
        background: 'var(--hero-bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '120px 24px 100px',
      }}
    >
      {/* Layer 0: 画作背景（mimocode 风格：三主题各自的多色不规则渐变） */}
      <div className="hero-painting" aria-hidden="true" />

      {/* Layer 1: Canvas 遮罩（水墨擦除） */}
      <canvas
        ref={canvasRef}
        id="heroMask"
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, zIndex: 1,
          pointerEvents: 'none', display: 'block',
        }}
      />

      {/* Layer 1.5: 可读性蒙版（保证文字始终可读，三主题通用） */}
      <div className="hero-readability" aria-hidden="true" />

      {/* Layer 2: 内容 */}
      <div style={{
        position: 'relative', zIndex: 2,
        maxWidth: 809, width: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40,
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 30, textAlign: 'center', width: '100%',
          }}
        >
          <Logo size={72} />
          <div style={{
            margin: 0, fontSize: 60, fontWeight: 500, letterSpacing: '0.08em',
            color: 'var(--hero-text)',
            fontFamily: `'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', 'STSong', Georgia, serif`,
            display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 6,
          }}>
            <BlurText
              text="工程管家"
              delay={120}
              stepDuration={0.45}
              className="hero-blur-title"
            />
          </div>
          <Typewriter
            text="面向建筑工程企业的一站式管理平台，集人事、合同、发票、项目、仓库、成本核算于一体。"
            delay={55}
            startDelay={600}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="hero-terminal"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 20, width: 491, maxWidth: '100%', height: 55,
            padding: '0 20px',
            background: 'var(--hero-chip-bg)',
            borderRadius: 10, fontSize: 15, letterSpacing: '0.4px',
            fontFamily: `'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif`,
            transition: 'background-color 280ms ease',
          }}
        >
          <span style={{ color: 'var(--hero-text-muted)' }}>&gt;_</span>
          <span style={{
            color: 'var(--hero-text)', overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          }}>
            工程管家-Setup.exe
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          style={{ display: 'flex', gap: 20, alignItems: 'center' }}
        >
          <Magnet padding={30} magnetStrength={5}>
            <a
              href="#download"
              className="hero-btn hero-btn--primary"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                height: 44, minWidth: 140, padding: '10px 41px', borderRadius: 46,
                background: 'var(--hero-btn-bg)', color: 'var(--hero-btn-text)',
                border: '1px solid var(--hero-btn-bg)',
                fontSize: 16, fontWeight: 600, letterSpacing: '0.24px',
                textDecoration: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                transition: 'all 200ms ease',
                overflow: 'hidden', position: 'relative',
              }}
            >
              <Download size={16} style={{ marginRight: 8 }} />
              <ShinyText text="免费下载" speed={3} spread={100} />
            </a>
          </Magnet>
          <Magnet padding={30} magnetStrength={5}>
            <a
              href="#features"
              className="hero-btn hero-btn--outline"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                height: 44, minWidth: 140, padding: '10px 41px', borderRadius: 46,
                background: 'transparent', color: 'var(--hero-text)',
                border: '1px solid var(--hero-border)',
                fontSize: 16, fontWeight: 500, letterSpacing: '0.24px',
                textDecoration: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                transition: 'all 200ms ease',
              }}
            >
              了解更多
            </a>
          </Magnet>
        </motion.div>
      </div>

      <style>{`
        /* ===== 主题变量 ===== */
        :root, [data-theme="white"] {
          --hero-bg: #fafbfc;
          --hero-text: #26251e;
          --hero-text-muted: rgba(39,39,42,0.45);
          --hero-chip-bg: #f3f0ef;
          --hero-btn-bg: #26251e;
          --hero-btn-text: #fafafa;
          --hero-border: #979696;
        }
        [data-theme="graphite"] {
          --hero-bg: #171a22;
          --hero-text: oklch(96% 0.004 280);
          --hero-text-muted: oklch(63% 0.006 280);
          --hero-chip-bg: oklch(21% 0.007 275);
          --hero-btn-bg: oklch(68% 0.16 38);
          --hero-btn-text: #fff;
          --hero-border: oklch(50% 0.008 275);
        }
        [data-theme="sandstone"] {
          --hero-bg: #f9f4ec;
          --hero-text: #2a2018;
          --hero-text-muted: rgba(58, 45, 30, 0.5);
          --hero-chip-bg: #ede4d5;
          --hero-btn-bg: #8a4a1f;
          --hero-btn-text: #fff;
          --hero-border: #b8a580;
        }

        /* ===== 画作背景（用户生成的 WebP 图，三主题各自不同） ===== */
        .hero-painting {
          position: absolute;
          inset: 0;
          z-index: 0;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }

        /* 可读性蒙版：保证中央文字区始终可读 */
        .hero-readability {
          position: absolute;
          inset: 0;
          z-index: 1.5;
          pointer-events: none;
        }
        /* White 主题：浅水墨图配白字不太刺眼，但擦除后可能浅 */
        [data-theme="white"] .hero-readability {
          background: radial-gradient(ellipse 500px 420px at 50% 50%, rgba(15, 23, 42, 0.12) 0%, transparent 70%);
        }
        /* Graphite 主题：白字 + 浅水墨图，中央加淡黑蒙版 */
        [data-theme="graphite"] .hero-readability {
          background: radial-gradient(ellipse 550px 450px at 50% 50%, rgba(0, 0, 0, 0.55) 0%, transparent 70%);
        }
        /* Sandstone 主题：白字 + 暖色图 */
        [data-theme="sandstone"] .hero-readability {
          background: radial-gradient(ellipse 520px 430px at 50% 50%, rgba(28, 20, 14, 0.20) 0%, transparent 70%);
        }

        [data-theme="white"] .hero-painting {
          background-image: url('./white.webp');
        }
        [data-theme="graphite"] .hero-painting {
          background-image: url('./graphite.webp');
        }
        [data-theme="sandstone"] .hero-painting {
          background-image: url('./sandstone.webp');
        }

        .hero-terminal:hover {
          background: var(--hero-btn-text) !important;
        }
        @media (hover: none) {
          .hero-terminal:hover { background: var(--hero-chip-bg) !important; }
        }
        .hero-btn--primary:hover { opacity: 0.85; }
        .hero-btn--outline:hover {
          background: var(--hero-btn-bg) !important;
          color: var(--hero-btn-text) !important;
          border-color: var(--hero-btn-bg) !important;
        }
        .hero__subtitle .char { display: none; }
        .hero__subtitle .char.is-typed { display: inline; }
        .hero__subtitle .type-caret {
          display: inline-block; width: 2px; height: 1.05em;
          margin-left: 2px; background: currentColor;
          vertical-align: -0.18em;
          animation: sub-caret 0.75s step-end infinite;
        }
        .hero__subtitle.is-done .type-caret { animation: none; opacity: 0; }
        @keyframes sub-caret { 50% { opacity: 0; } }
        .hero-blur-title { font-size: inherit; font-weight: inherit; }
        @media (max-width: 768px) {
          .hero__subtitle { font-size: 14px !important; white-space: normal !important; }
        }
      `}</style>
    </section>
  )
}