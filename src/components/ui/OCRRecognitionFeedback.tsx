import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '../ui/Icon'

interface OCRField {
  label: string
  value: string
}

interface OCRRecognitionFeedbackProps {
  status: 'idle' | 'recognizing' | 'success' | 'error'
  fields?: OCRField[]
  errorMessage?: string
  onDismiss?: () => void
}

const scanStages = [
  '正在上传文档...',
  'AI 分析中...',
  '识别文字内容...',
  '提取关键信息...',
]

export function OCRRecognitionFeedback({ status, fields, errorMessage, onDismiss }: OCRRecognitionFeedbackProps) {
  const [stageIndex, setStageIndex] = useState(0)
  const [visibleFields, setVisibleFields] = useState(0)

  // 识别中：循环切换阶段文字
  useEffect(() => {
    if (status !== 'recognizing') { setStageIndex(0); return }
    const timer = setInterval(() => {
      setStageIndex(prev => (prev + 1) % scanStages.length)
    }, 800)
    return () => clearInterval(timer)
  }, [status])

  // 成功后：逐个显示字段，然后自动消失
  useEffect(() => {
    if (status !== 'success' || !fields) { setVisibleFields(0); return }
    let i = 0
    const showTimer = setInterval(() => {
      i++
      setVisibleFields(i)
      if (i >= fields.length) clearInterval(showTimer)
    }, 100)
    // 2.5 秒后自动消失
    const dismissTimer = setTimeout(() => { onDismiss?.() }, 2500)
    return () => { clearInterval(showTimer); clearTimeout(dismissTimer) }
  }, [status, fields, onDismiss])

  // 错误：3 秒后自动消失
  useEffect(() => {
    if (status !== 'error') return
    const timer = setTimeout(() => { onDismiss?.() }, 3000)
    return () => clearTimeout(timer)
  }, [status, onDismiss])

  if (status === 'idle') return null

  return (
    <AnimatePresence>
      {/* 浮动定位，不影响表单布局 */}
      <motion.div
        className="fixed top-6 right-6 z-[9999] w-80"
        initial={{ opacity: 0, y: -20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.9 }}
        transition={{ type: 'spring', damping: 25, stiffness: 400 }}
      >
        {status === 'recognizing' && (
          <div className="rounded-2xl border border-blue-200/60 bg-gradient-to-br from-blue-50 via-white to-purple-50 shadow-lg shadow-blue-500/10 p-4 backdrop-blur-sm">
            {/* 扫描线 */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
              <motion.div
                className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-60"
                animate={{ top: ['0%', '100%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30"
                >
                  <Icon name="Sparkles" size={20} className="text-white" />
                </motion.div>
                <motion.div
                  className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-700">AI 智能识别</p>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={stageIndex}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="text-xs text-slate-500 mt-0.5"
                  >
                    {scanStages[stageIndex]}
                  </motion.p>
                </AnimatePresence>
              </div>
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-blue-400"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {status === 'success' && fields && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 500 }}
            className="rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50 via-white to-green-50 shadow-xl shadow-emerald-500/20 p-4"
          >
            {/* 顶部光晕 */}
            <motion.div
              className="absolute -top-1 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent rounded-full"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            />

            <div className="flex items-center gap-3 mb-3">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 12, stiffness: 300, delay: 0.1 }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30"
              >
                <Icon name="Sparkles" size={20} className="text-white" />
              </motion.div>
              <div>
                <p className="text-sm font-semibold text-emerald-800">识别成功</p>
                <p className="text-xs text-emerald-600">已自动填入 {fields.length} 个字段</p>
              </div>
              <button type="button" onClick={onDismiss} className="ml-auto text-emerald-400 hover:text-emerald-600 transition-colors">
                <Icon name="X" size={14} />
              </button>
            </div>

            <div className="space-y-1">
              {fields.map((field, i) => (
                <motion.div
                  key={field.label}
                  initial={{ opacity: 0, x: -12 }}
                  animate={i < visibleFields ? { opacity: 1, x: 0 } : { opacity: 0, x: -12 }}
                  transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                  className="flex items-center gap-2 text-xs"
                >
                  <Icon name="Zap" size={12} className="text-emerald-500 shrink-0" />
                  <span className="text-slate-500 shrink-0 w-16">{field.label}</span>
                  <span className="text-slate-800 font-medium truncate">{field.value}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 20, stiffness: 500 }}
          >
            <motion.div
              animate={{ x: [0, -6, 6, -6, 6, 0] }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="rounded-2xl border border-red-200/60 bg-gradient-to-br from-red-50 via-white to-orange-50 shadow-xl shadow-red-500/20 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/30">
                  <Icon name="XCircle" size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-800">识别失败</p>
                  <p className="text-xs text-red-600 mt-0.5">{errorMessage || '请检查图片是否清晰'}</p>
                </div>
                <button type="button" onClick={onDismiss} className="text-red-400 hover:text-red-600 transition-colors">
                  <Icon name="X" size={14} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
