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

export default function App() {
  const { theme, setTheme, getDefaultPath } = useTheme()
  const [step, setStep] = useState<Step>('welcome')
  const [installPath, setInstallPath] = useState('')
  const [dataPath, setDataPath] = useState('')
  const [accelerate, setAccelerate] = useState(false)

  // 监听 C# 的 init 消息（更新模式跳过向导）
  useEffect(() => {
    // @ts-ignore
    const wv = window.chrome?.webview
    if (!wv) return
    const handler = (e: any) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data
        if (data?.type === 'init' && data.mode === 'update') {
          const ip = data.installPath ?? ''
          const dp = data.dataPath ?? ''
          setInstallPath(ip)
          setDataPath(dp)
          setAccelerate(true)
          setStep('installing')
          postToHost({ action: 'install', path: ip, dataPath: dp })
        } else if (data?.type === 'init' && data.mode === 'fresh') {
          // 用 C# 下发的默认数据路径替换硬编码
          if (data.defaultDataPath) {
            setDataPath(data.defaultDataPath)
          }
        }
      } catch {}
    }
    wv.addEventListener('message', handler)
    postToHost({ action: 'ready' })   // 通知 C# 监听器已就绪，可安全发 init
    return () => wv.removeEventListener('message', handler)
  }, [])

  // 标题栏拖动
  const onTitleBarMouseDown = () => {
    postToHost({ action: 'startDrag' })
  }

  const handleBegin = () => {
    setInstallPath(getDefaultPath())
    // dataPath 已由 C# init 消息下发设置，不再覆盖
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
            <WelcomeStep onBegin={handleBegin} version="0.91.0" />
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

