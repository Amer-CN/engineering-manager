import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Logo from './Logo'

const STEPS = [
  '正在解压程序文件...',
  '正在配置运行环境...',
  '正在初始化数据库...',
  '正在创建快捷方式...',
  '安装完成！',
]

interface Props {
  onComplete: () => void
}

export default function InstallingStep({ onComplete }: Props) {
  const [percent, setPercent] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [doneSteps, setDoneSteps] = useState<number[]>([])

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'progress') {
          setPercent(data.percent)
          setCurrentStep(data.step)
        }
        if (data.type === 'installComplete') {
          setPercent(100)
          setCurrentStep('安装完成！')
          setDoneSteps([0, 1, 2, 3, 4])
          setTimeout(onComplete, 800)
        }
      } catch {}
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [onComplete])

  // 跟踪哪些步骤已完成
  useEffect(() => {
    if (percent >= 30) setDoneSteps(prev => [...new Set([...prev, 0])])
    if (percent >= 60) setDoneSteps(prev => [...new Set([...prev, 1])])
    if (percent >= 80) setDoneSteps(prev => [...new Set([...prev, 2])])
    if (percent >= 95) setDoneSteps(prev => [...new Set([...prev, 3])])
    if (percent >= 100) setDoneSteps(prev => [...new Set([...prev, 4])])
  }, [percent])

  // 环形进度条参数
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
      {/* 环形进度 + Logo */}
      <div style={{ position: 'relative', marginBottom: 32 }}>
        <svg width="140" height="140" viewBox="0 0 140 140">
          {/* 背景环 */}
          <circle cx="70" cy="70" r={radius} fill="none"
            stroke="var(--border)" strokeWidth="4" opacity="0.3" />
          {/* 进度环 */}
          <motion.circle
            cx="70" cy="70" r={radius} fill="none"
            stroke="var(--accent)" strokeWidth="4" strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{ transformOrigin: 'center', transform: 'rotate(-90deg)' }}
          />
        </svg>
        {/* 中心 Logo */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
        }}>
          <Logo size={48} spin={percent < 100} glow={percent < 100} />
        </div>
      </div>

      {/* 百分比 */}
      <motion.div
        key={percent}
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        style={{
          fontSize: 36, fontWeight: 700, color: 'var(--accent)',
          marginBottom: 8,
        }}
      >
        {percent}%
      </motion.div>

      {/* 当前步骤 */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ fontSize: 14, color: 'var(--fg-2)', marginBottom: 32 }}
      >
        {currentStep}
      </motion.div>

      {/* 步骤列表 */}
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
              {/* 状态图标 */}
              <motion.div
                initial={false}
                animate={isDone ? { scale: [1, 1.3, 1] } : {}}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                style={{
                  width: 18, height: 18, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700,
                  background: isDone ? 'var(--success)' : isCurrent ? 'var(--accent-soft)' : 'transparent',
                  color: isDone ? 'white' : isCurrent ? 'var(--accent)' : 'var(--muted)',
                  border: isDone ? 'none' : `1.5px solid ${isCurrent ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >
                {isDone ? '✓' : i + 1}
              </motion.div>
              <span style={{
                fontSize: 13,
                color: isDone ? 'var(--success)' : isCurrent ? 'var(--fg)' : 'var(--muted)',
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
