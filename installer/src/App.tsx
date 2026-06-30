import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ParticleSystem from './components/ParticleSystem'
import ThemeSwitcher from './components/ThemeSwitcher'
import WelcomeStep from './components/WelcomeStep'
import PathStep from './components/PathStep'
import DataPathStep from './components/DataPathStep'
import InstallingStep from './components/InstallingStep'
import CompleteStep from './components/CompleteStep'
import { useTheme } from './hooks/useTheme'
import './installer.css'

type Step = 'welcome' | 'path' | 'dataPath' | 'installing' | 'complete'

// 向 C# 发消息的工具函数
function postToHost(msg: object) {
  // @ts-ignore
  window.chrome?.webview?.postMessage(JSON.stringify(msg))
}

// 获取默认数据存储路径（与后端 ResolveDataPath() 默认一致）
function getDefaultDataPath(): string {
  return '%APPDATA%\\工程管家'
}

export default function App() {
  const { theme, setTheme, getDefaultPath } = useTheme()
  const [step, setStep] = useState<Step>('welcome')
  const [installPath, setInstallPath] = useState('')
  const [dataPath, setDataPath] = useState('')
  const [accelerate, setAccelerate] = useState(false)

  // 标题栏拖动
  const onTitleBarMouseDown = () => {
    postToHost({ action: 'startDrag' })
  }

  const handleBegin = () => {
    setInstallPath(getDefaultPath())
    setDataPath(getDefaultDataPath())
    setStep('path')
  }

  const handleInstall = (path: string) => {
    setInstallPath(path)
    setStep('dataPath')
  }

  const handleDataPathNext = (dp: string) => {
    setDataPath(dp)
    setAccelerate(true)
    setStep('installing')
    postToHost({ action: 'install', path: installPath, dataPath: dp })
  }

  const handleComplete = () => {
    setAccelerate(false)
    setStep('complete')
  }

  const handleLaunch = () => {
    postToHost({ action: 'launch', path: `${installPath}\\EngineeringManager.Api.exe` })
  }

  const handleClose = () => {
    postToHost({ action: 'close' })
  }

  const pageVariants = {
    initial: { opacity: 0, x: 30 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* 粒子背景 */}
      <ParticleSystem accelerate={accelerate} />

      {/* 主题切换 — 左上角 */}
      <div style={{ position: 'absolute', top: 10, left: 14, zIndex: 200, WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <ThemeSwitcher current={theme} onChange={setTheme} />
      </div>

      {/* 标题栏拖动 */}
      <div className="titlebar" onMouseDown={onTitleBarMouseDown} />

      {/* 关闭按钮 — 右上角 */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        onClick={handleClose}
        style={{
          position: 'absolute',
          top: 8, right: 12,
          width: 28, height: 28,
          borderRadius: '50%',
          border: 'none',
          background: 'transparent',
          color: 'var(--muted)',
          fontSize: 18,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          transition: 'all 0.2s',
        }}
        whileHover={{ background: 'var(--danger)', color: 'white', scale: 1.1 }}
        onMouseEnter={(e) => {
          ;(e.target as HTMLElement).style.background = 'var(--danger)'
          ;(e.target as HTMLElement).style.color = 'white'
        }}
        onMouseLeave={(e) => {
          ;(e.target as HTMLElement).style.background = 'transparent'
          ;(e.target as HTMLElement).style.color = 'var(--muted)'
        }}
      >
        ×
      </motion.button>

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
          {step === 'welcome' && (
            <WelcomeStep onBegin={handleBegin} version="0.79.0" />
          )}
          {step === 'path' && (
            <PathStep
              defaultPath={installPath}
              onNext={handleInstall}
              onBack={() => setStep('welcome')}
            />
          )}
          {step === 'dataPath' && (
            <DataPathStep
              defaultPath={dataPath}
              onNext={handleDataPathNext}
              onBack={() => setStep('path')}
            />
          )}
          {step === 'installing' && (
            <InstallingStep onComplete={handleComplete} />
          )}
          {step === 'complete' && (
            <CompleteStep
              installPath={installPath}
              onLaunch={handleLaunch}
              onClose={handleClose}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

