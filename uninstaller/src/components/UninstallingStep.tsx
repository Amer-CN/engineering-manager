import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import Logo from './Logo'

const STEPS = [
  '正在删除程序文件...',
  '正在清理配置文件...',
  '正在删除快捷方式...',
  '正在清理注册表...',
  '卸载完成！',
]

interface Props {
  onComplete: () => void
}

export default function UninstallingStep({ onComplete }: Props) {
  const [percent, setPercent] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [doneSteps, setDoneSteps] = useState<number[]>([])
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    ;(window as any).__updateProgress = (p: number, s: string) => {
      setPercent(p)
      setCurrentStep(s)
    }
    ;(window as any).__installComplete = () => {
      setPercent(100)
      setCurrentStep('卸载完成！')
      setDoneSteps([0, 1, 2, 3, 4])
      setTimeout(() => onCompleteRef.current(), 800)
    }
    ;(window as any).__installError = (msg: string) => {
      setCurrentStep(`卸载失败：${msg || '未知错误'}`)
    }

    return () => {
      delete (window as any).__updateProgress
      delete (window as any).__installComplete
      delete (window as any).__installError
    }
  }, [])

  useEffect(() => {
    if (percent >= 25) setDoneSteps(prev => [...new Set([...prev, 0])])
    if (percent >= 50) setDoneSteps(prev => [...new Set([...prev, 1])])
    if (percent >= 75) setDoneSteps(prev => [...new Set([...prev, 2])])
    if (percent >= 90) setDoneSteps(prev => [...new Set([...prev, 3])])
    if (percent >= 100) setDoneSteps(prev => [...new Set([...prev, 4])])
  }, [percent])

  const radius = 56
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percent / 100) * circumference

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      position: 'relative',
      zIndex: 1,
    }}>
      <div style={{ position: 'relative', marginBottom: 32 }}>
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={radius} fill="none"
            stroke="var(--border)" strokeWidth="4" opacity="0.3" />
          <motion.circle
            cx="70" cy="70" r={radius} fill="none"
            stroke="#dc2626" strokeWidth="4" strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{ transformOrigin: 'center', transform: 'rotate(-90deg)' }}
          />
        </svg>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
        }}>
          <Logo size={48} spin={percent < 100} glow={percent < 100} />
        </div>
      </div>

      <motion.div
        key={percent}
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        style={{
          fontSize: 36, fontWeight: 700, color: '#dc2626',
          marginBottom: 8,
        }}
      >
        {percent}%
      </motion.div>

      <motion.div
        key={currentStep}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ fontSize: 14, color: 'var(--fg-2)', marginBottom: 32 }}
      >
        {currentStep}
      </motion.div>

      <div style={{ width: 280 }}>
        {STEPS.map((step, i) => {
          const isDone = doneSteps.includes(i)
          const isCurrent = currentStep === step && !isDone
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * i }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '6px 0',
                opacity: isDone ? 1 : isCurrent ? 0.8 : 0.35,
              }}
            >
              <motion.div
                initial={false}
                animate={isDone ? { scale: [1, 1.3, 1] } : {}}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                style={{
                  width: 18, height: 18, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700,
                  background: isDone ? '#dc2626' : isCurrent ? 'rgba(220,38,38,0.12)' : 'transparent',
                  color: isDone ? 'white' : isCurrent ? '#dc2626' : 'var(--muted)',
                  border: isDone ? 'none' : `1.5px solid ${isCurrent ? '#dc2626' : 'var(--border)'}`,
                }}
              >
                {isDone ? '✓' : i + 1}
              </motion.div>
              <span style={{
                fontSize: 13,
                color: isDone ? '#dc2626' : isCurrent ? 'var(--fg)' : 'var(--muted)',
                fontWeight: isCurrent ? 500 : 400,
              }}>
                {step}
              </span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
