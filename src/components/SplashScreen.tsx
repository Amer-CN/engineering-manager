import React, { useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'

// ── 粒子配置 ──
interface ParticleConfig {
  particleColor: string
  lineColor: string
  count: number
}

const THEMES: Record<string, ParticleConfig> = {
  white: {
    particleColor: 'rgba(37, 99, 235, 0.25)',
    lineColor: 'rgba(37, 99, 235, 0.06)',
    count: 35,
  },
  graphite: {
    particleColor: 'rgba(255, 140, 50, 0.3)',
    lineColor: 'rgba(255, 140, 50, 0.08)',
    count: 45,
  },
  sandstone: {
    particleColor: 'rgba(217, 119, 6, 0.25)',
    lineColor: 'rgba(217, 119, 6, 0.06)',
    count: 35,
  },
}

// 从 CSS 变量读取颜色
function getCSSVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

// ── 粒子类 ──
class Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  targetOpacity: number

  constructor(w: number, h: number) {
    this.x = Math.random() * w
    this.y = Math.random() * h
    this.vx = (Math.random() - 0.5) * 0.8
    this.vy = (Math.random() - 0.5) * 0.8
    this.size = Math.random() * 2.5 + 1
    this.opacity = 0
    this.targetOpacity = Math.random() * 0.6 + 0.3
  }

  update(w: number, h: number, fadeOut: boolean) {
    this.x += this.vx
    this.y += this.vy

    // 边界回弹
    if (this.x < 0 || this.x > w) this.vx *= -1
    if (this.y < 0 || this.y > h) this.vy *= -1

    // 淡入/淡出
    if (fadeOut) {
      this.opacity = Math.max(0, this.opacity - 0.02)
      this.vx *= 1.02 // 淡出时加速散开
      this.vy *= 1.02
    } else {
      this.opacity += (this.targetOpacity - this.opacity) * 0.05
    }
  }
}

interface SplashScreenProps {
  onComplete: () => void
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animFrameRef = useRef<number>(0)

  // 读取当前主题
  const getThemeConfig = useCallback((): ParticleConfig & { bgColor: string; accentColor: string } => {
    const theme = document.documentElement.getAttribute('data-theme') || 'white'
    const config = THEMES[theme] || THEMES.white
    return {
      ...config,
      bgColor: getCSSVar('--bg'),
      accentColor: getCSSVar('--accent'),
    }
  }, [])

  // Canvas 粒子动画
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const config = getThemeConfig()

    // 设置 canvas 尺寸
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // 初始化粒子
    particlesRef.current = Array.from(
      { length: config.count },
      () => new Particle(canvas.width, canvas.height)
    )

    let fadeOut = false

    const animate = () => {
      if (!ctx || !canvas) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const particles = particlesRef.current
      const lineDist = 100

      // 绘制连线
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < lineDist) {
            const alpha = (1 - dist / lineDist) * 0.5
            ctx.strokeStyle = config.lineColor.replace(/[\d.]+\)$/, `${alpha})`)
            ctx.lineWidth = 0.5
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }

      // 绘制粒子
      for (const p of particles) {
        p.update(canvas.width, canvas.height, fadeOut)
        ctx.fillStyle = config.particleColor.replace(/[\d.]+\)$/, `${p.opacity})`)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }

      animFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    // 时间线控制
    const fadeTimer = setTimeout(() => {
      fadeOut = true
    }, 2200)

    const completeTimer = setTimeout(() => {
      onComplete()
    }, 2800)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('resize', resize)
      clearTimeout(fadeTimer)
      clearTimeout(completeTimer)
    }
  }, [getThemeConfig, onComplete])

  const config = getThemeConfig()

  // Logo 三角形路径
  const logoVariants = {
    hidden: { scale: 0.3, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: { type: 'spring' as const, stiffness: 200, damping: 20, delay: 0.2 },
    },
  }

  // 品牌名称逐字动画
  const brandChars = '工程管家'.split('')
  const charVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: 0.6 + i * 0.1, duration: 0.3 },
    }),
  }

  // 脉冲点动画
  const dotVariants = {
    pulse: (i: number) => ({
      scale: [1, 1.4, 1],
      opacity: [0.4, 1, 0.4],
      transition: {
        duration: 1.2,
        repeat: Infinity,
        delay: i * 0.2,
      },
    }),
  }

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: config.bgColor,
        zIndex: 9999,
        overflow: 'hidden',
      }}
    >
      {/* 粒子背景 */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      />

      {/* 中心内容 */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Logo */}
        <motion.div
          variants={logoVariants}
          initial="hidden"
          animate="visible"
          style={{ marginBottom: 20 }}
        >
          <svg width="56" height="56" viewBox="0 0 18 18" fill="none">
            <defs>
              <linearGradient id="splash-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={config.accentColor} />
                <stop offset="100%" stopColor={config.accentColor} stopOpacity="0.6" />
              </linearGradient>
              <mask id="splash-mask"><rect width="18" height="18" fill="white" /><path d="M5 14 L9 6 L13 14 Z" fill="black" /></mask>
            </defs>
            <motion.path
              d="M2 15.5 L9 2.5 L16 15.5 Z"
              fill="url(#splash-grad)"
              mask="url(#splash-mask)"
              animate={{
                filter: [
                  'drop-shadow(0 0 8px rgba(255,255,255,0.3))',
                  'drop-shadow(0 0 16px rgba(255,255,255,0.5))',
                  'drop-shadow(0 0 8px rgba(255,255,255,0.3))',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </svg>
        </motion.div>

        {/* 品牌名称 */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
          {brandChars.map((char, i) => (
            <motion.span
              key={i}
              custom={i}
              variants={charVariants}
              initial="hidden"
              animate="visible"
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: config.accentColor,
                letterSpacing: '0.08em',
              }}
            >
              {char}
            </motion.span>
          ))}
        </div>

        {/* 副标题 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          style={{
            fontSize: 11,
            color: config.accentColor,
            opacity: 0.6,
            letterSpacing: '0.15em',
            marginBottom: 28,
          }}
        >
          Engineering Manager
        </motion.div>

        {/* 加载指示器 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          style={{ display: 'flex', gap: 8, alignItems: 'center' }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              custom={i}
              animate="pulse"
              variants={dotVariants}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: config.accentColor,
              }}
            />
          ))}
        </motion.div>
      </div>

      {/* 底部进度条 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        style={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 120,
          height: 2,
          borderRadius: 1,
          background: `${config.accentColor}20`,
          overflow: 'hidden',
        }}
      >
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            width: '60%',
            height: '100%',
            background: config.accentColor,
            borderRadius: 1,
          }}
        />
      </motion.div>
    </motion.div>
  )
}

export default SplashScreen
