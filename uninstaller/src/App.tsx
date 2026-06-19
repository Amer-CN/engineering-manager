import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ParticleSystem from './components/ParticleSystem'
import ThemeSwitcher from './components/ThemeSwitcher'
import ConfirmStep from './components/ConfirmStep'
import UninstallingStep from './components/UninstallingStep'
import CompleteStep from './components/CompleteStep'
import { useTheme } from './hooks/useTheme'
import './installer.css'

type Step = 'confirm' | 'uninstalling' | 'complete'

function postToHost(action: string, data?: Record<string, unknown>) {
  const msg: Record<string, unknown> = { action }
  if (data) Object.assign(msg, data)
  // @ts-ignore
  window.chrome?.webview?.postMessage(JSON.stringify(msg))
}

export default function App() {
  const { theme, setTheme } = useTheme()
  const [step, setStep] = useState<Step>('confirm')
  const [installPath, setInstallPath] = useState('')
  const [accelerate, setAccelerate] = useState(false)

  const handleUninstall = (path: string) => {
    setInstallPath(path)
    setAccelerate(true)
    setStep('uninstalling')
    postToHost('uninstall', { path })
  }

  const handleComplete = () => {
    setAccelerate(false)
    setStep('complete')
  }

  const handleClose = () => postToHost('close')

  const pageVariants = {
    initial: { opacity: 0, x: 30 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <ParticleSystem accelerate={accelerate} />

      {/* 标题栏拖动区 */}
      <div className="titlebar" onMouseDown={() => postToHost('startDrag')} />

      {/* 顶部工具栏：左右分布 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        zIndex: 200,
        pointerEvents: 'none',
      }}>
        {/* 左侧：主题切换 */}
        <div style={{ pointerEvents: 'auto' }}>
          <ThemeSwitcher current={theme} onChange={setTheme} />
        </div>

        {/* 右侧：最小化 + 关闭 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, pointerEvents: 'auto' }}>
          <button
            className="titlebar-btn"
            title="最小化"
            onClick={(e) => { e.stopPropagation(); postToHost('minimize') }}
          >
            <svg width="14" height="14" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
              <line x1="1.5" y1="5.5" x2="9.5" y2="5.5" />
            </svg>
          </button>
          <button
            className="titlebar-btn close-hover"
            title="关闭"
            onClick={(e) => { e.stopPropagation(); handleClose() }}
          >
            <svg width="14" height="14" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
              <line x1="1.5" y1="1.5" x2="9.5" y2="9.5" />
              <line x1="9.5" y1="1.5" x2="1.5" y2="9.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* 步骤页面 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{ position: 'absolute', inset: 0 }}
        >
          {step === 'confirm' && <ConfirmStep onUninstall={handleUninstall} />}
          {step === 'uninstalling' && <UninstallingStep onComplete={handleComplete} />}
          {step === 'complete' && <CompleteStep onClose={handleClose} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
