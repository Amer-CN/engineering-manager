import { useRef, useEffect } from 'react'

interface Particle {
  x: number; y: number
  vx: number; vy: number
  size: number; opacity: number; targetOpacity: number
}

const THEME_PARTICLES: Record<string, { color: string; line: string; count: number }> = {
  white:    { color: 'rgba(37, 99, 235, 0.25)',  line: 'rgba(37, 99, 235, 0.06)',  count: 30 },
  graphite: { color: 'rgba(255, 140, 50, 0.3)',   line: 'rgba(255, 140, 50, 0.08)',  count: 40 },
  sandstone:{ color: 'rgba(217, 119, 6, 0.25)',   line: 'rgba(217, 119, 6, 0.06)',   count: 30 },
}

interface Props {
  accelerate?: boolean
}

export default function ParticleSystem({ accelerate = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const frameRef = useRef<number>(0)
  const accelerateRef = useRef(accelerate)

  accelerateRef.current = accelerate

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

    // 初始化粒子
    const theme = document.documentElement.getAttribute('data-theme') || 'white'
    const config = THEME_PARTICLES[theme] || THEME_PARTICLES.white

    particlesRef.current = Array.from({ length: config.count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      size: Math.random() * 2.5 + 1,
      opacity: 0,
      targetOpacity: Math.random() * 0.6 + 0.3,
    }))

    const lineDist = 100

    const animate = () => {
      if (!ctx || !canvas) return
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'white'
      const cfg = THEME_PARTICLES[currentTheme] || THEME_PARTICLES.white

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const particles = particlesRef.current
      const speed = accelerateRef.current ? 2.5 : 1

      // 连线
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < lineDist) {
            const alpha = (1 - dist / lineDist) * 0.5
            ctx.strokeStyle = cfg.line.replace(/[\d.]+\)$/, `${alpha})`)
            ctx.lineWidth = 0.5
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }

      // 粒子
      for (const p of particles) {
        p.x += p.vx * speed
        p.y += p.vy * speed
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
        p.opacity += (p.targetOpacity - p.opacity) * 0.05

        ctx.fillStyle = cfg.color.replace(/[\d.]+\)$/, `${p.opacity})`)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }

      frameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  )
}
