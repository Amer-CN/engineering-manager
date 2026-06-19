import React, { useRef, useEffect, useCallback } from 'react'

// ── 粒子配置 ──
interface ParticleConfig {
  particleColor: string
  lineColor: string
  count: number
}

const THEMES: Record<string, ParticleConfig> = {
  white: {
    particleColor: 'rgba(37, 99, 235, 0.2)',
    lineColor: 'rgba(37, 99, 235, 0.05)',
    count: 30,
  },
  graphite: {
    particleColor: 'rgba(255, 140, 50, 0.25)',
    lineColor: 'rgba(255, 140, 50, 0.06)',
    count: 40,
  },
  sandstone: {
    particleColor: 'rgba(217, 119, 6, 0.2)',
    lineColor: 'rgba(217, 119, 6, 0.05)',
    count: 30,
  },
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
    this.vx = (Math.random() - 0.5) * 0.6
    this.vy = (Math.random() - 0.5) * 0.6
    this.size = Math.random() * 2 + 1
    this.opacity = 0
    this.targetOpacity = Math.random() * 0.5 + 0.2
  }

  update(w: number, h: number) {
    this.x += this.vx
    this.y += this.vy

    if (this.x < 0 || this.x > w) this.vx *= -1
    if (this.y < 0 || this.y > h) this.vy *= -1

    this.opacity += (this.targetOpacity - this.opacity) * 0.03
  }
}

interface ParticleBackgroundProps {
  className?: string
  style?: React.CSSProperties
}

const ParticleBackground: React.FC<ParticleBackgroundProps> = ({ className, style }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)

  const getThemeConfig = useCallback((): ParticleConfig => {
    const theme = document.documentElement.getAttribute('data-theme') || 'white'
    return THEMES[theme] || THEMES.white
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const config = getThemeConfig()

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const particles = Array.from(
      { length: config.count },
      () => new Particle(canvas.width, canvas.height)
    )

    const animate = () => {
      if (!ctx || !canvas) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const lineDist = 100

      // 绘制连线
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < lineDist) {
            const alpha = (1 - dist / lineDist) * 0.4
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
        p.update(canvas.width, canvas.height)
        ctx.fillStyle = config.particleColor.replace(/[\d.]+\)$/, `${p.opacity})`)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }

      animFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [getThemeConfig])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        ...style,
      }}
    />
  )
}

export default ParticleBackground
