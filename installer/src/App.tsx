import { useState } from 'react'
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

// 获取默认数据存储路径（与后端 %APPDATA%\工程管家 默认一致）
function getDefaultDataPath(): string {
  return 'D:\\工程管家数据'
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

      {/* 主题切换 + 关闭按钮 — 右上角 */}
      <ThemeSwitcher current={theme} onChange={setTheme} onClose={handleClose} />

      {/* 标题栏拖动 */}
      <div className="titlebar" onMouseDown={onTitleBarMouseDown} />

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
            <WelcomeStep onBegin={handleBegin} version="0.80.0" />
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

