import { motion, useMotionValue, useAnimationFrame, useTransform } from 'motion/react'
import { useState, useCallback, useRef, useEffect } from 'react'

type Props = {
  text: string
  speed?: number
  className?: string
  color?: string
  shineColor?: string
  spread?: number
  pauseOnHover?: boolean
  delay?: number
}

export default function ShinyText({
  text,
  speed = 2.5,
  className = '',
  color,
  shineColor = 'rgba(255,255,255,0.9)',
  spread = 120,
  pauseOnHover = false,
  delay = 0.2,
}: Props) {
  const [isPaused, setIsPaused] = useState(false)
  const progress = useMotionValue(-50)
  const elapsedRef = useRef(0)
  const lastTimeRef = useRef<number | null>(null)
  const animationDuration = speed * 1000
  const delayDuration = delay * 1000

  useAnimationFrame(time => {
    if (isPaused) {
      lastTimeRef.current = null
      return
    }
    if (lastTimeRef.current === null) {
      lastTimeRef.current = time
      return
    }
    const deltaTime = time - lastTimeRef.current
    lastTimeRef.current = time
    elapsedRef.current += deltaTime

    const cycleDuration = animationDuration + delayDuration
    const cycleTime = elapsedRef.current % cycleDuration
    if (cycleTime < animationDuration) {
      progress.set(-50 + (cycleTime / animationDuration) * 200)
    } else {
      progress.set(150)
    }
  })

  useEffect(() => {
    elapsedRef.current = 0
    progress.set(-50)
  }, [])

  const backgroundPosition = useTransform(progress, p => `${p}% center`)

  const handleMouseEnter = useCallback(() => { if (pauseOnHover) setIsPaused(true) }, [pauseOnHover])
  const handleMouseLeave = useCallback(() => { if (pauseOnHover) setIsPaused(false) }, [pauseOnHover])

  const baseColor = color || 'var(--hero-btn-text, #fafafa)'
  const gradientStyle = {
    backgroundImage: `linear-gradient(${spread}deg, ${baseColor} 0%, ${baseColor} 40%, ${shineColor} 50%, ${baseColor} 60%, ${baseColor} 100%)`,
    backgroundSize: '200% auto',
    WebkitBackgroundClip: 'text' as const,
    backgroundClip: 'text' as const,
    WebkitTextFillColor: 'transparent',
  }

  return (
    <motion.span
      className={`inline-block ${className}`}
      style={{ ...gradientStyle, backgroundPosition }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {text}
    </motion.span>
  )
}