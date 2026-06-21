import React, { useRef, useEffect } from 'react'

export interface ParticleConfig {
  particleColor: string
  lineColor: string
  count: number
}

export const THEMES: Record<string, ParticleConfig> = {
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

export function getCSSVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

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

    if (this.x < 0 || this.x > w) this.vx *= -1
    if (this.y < 0 || this.y > h) this.vy *= -1

    if (fadeOut) {
      this.opacity = Math.max(0, this.opacity - 0.02)
      this.vx *= 1.02
      this.vy *= 1.02
    } else {
      this.opacity += (this.targetOpacity - this.opacity) * 0.05
    }
  }
}

interface SplashParticlesProps {
  config: ParticleConfig
  onComplete: () => void
}

const SplashParticles: React.FC<SplashParticlesProps> = ({ config, onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animFrameRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

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
  }, [config, onComplete])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
      }}
    />
  )
}

export default SplashParticles
