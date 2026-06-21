import React, { useCallback } from 'react'
import { motion } from 'framer-motion'
import SplashParticles, { ParticleConfig, THEMES, getCSSVar } from './features/splash/SplashParticles'
import SplashBranding from './features/splash/SplashBranding'

interface SplashScreenProps {
  onComplete: () => void
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const getThemeConfig = useCallback((): ParticleConfig & { bgColor: string; accentColor: string } => {
    const theme = document.documentElement.getAttribute('data-theme') || 'white'
    const config = THEMES[theme] || THEMES.white
    return {
      ...config,
      bgColor: getCSSVar('--bg'),
      accentColor: getCSSVar('--accent'),
    }
  }, [])

  const config = getThemeConfig()

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: config.bgColor,
        zIndex: 9999,
        overflow: 'hidden',
      }}
    >
      <SplashParticles config={config} onComplete={onComplete} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <SplashBranding accentColor={config.accentColor} />
      </div>
    </motion.div>
  )
}

export default SplashScreen
