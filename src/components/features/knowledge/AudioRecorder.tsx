/**
 * AudioRecorder — 现场录音组件（MediaRecorder）
 *
 * 录制浏览器麦克风音频，停止后产出一个 File（webm/opus）交给上层上传。
 * WebView2 为 Chromium 内核，默认输出 audio/webm;codecs=opus，
 * 后端已将 .webm 加入白名单，ffmpeg 预处理阶段统一转 16k mono wav。
 */

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'

interface AudioRecorderProps {
  disabled?: boolean
  /** 录音完成回调，产出可上传的音频文件 */
  onRecorded: (file: File) => void
}

/** 选择浏览器支持的录音 MIME，返回 [mimeType, 扩展名] */
function pickMime(): [string, string] {
  const candidates: [string, string][] = [
    ['audio/webm;codecs=opus', 'webm'],
    ['audio/webm', 'webm'],
    ['audio/ogg;codecs=opus', 'ogg'],
    ['audio/ogg', 'ogg'],
  ]
  const MR = (typeof window !== 'undefined' ? (window as any).MediaRecorder : undefined)
  if (MR && typeof MR.isTypeSupported === 'function') {
    for (const [type, ext] of candidates) {
      if (MR.isTypeSupported(type)) return [type, ext]
    }
  }
  return ['', 'webm']
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ disabled, onRecorded }) => {
  const [recording, setRecording] = useState(false)
  const [paused, setPaused] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const extRef = useRef<string>('webm')
  const cancelledRef = useRef<boolean>(false)

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  // 卸载清理
  useEffect(() => {
    return () => {
      clearTimer()
      try { recorderRef.current?.stop() } catch { /* */ }
      stopStream()
    }
  }, [clearTimer, stopStream])

  const start = useCallback(async () => {
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('当前环境不支持录音（无法访问麦克风）')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const [mime, ext] = pickMime()
      extRef.current = ext
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      chunksRef.current = []
      cancelledRef.current = false
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        stopStream()
        if (cancelledRef.current) return
        const type = recorder.mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type })
        // 注意：正则用 alternation 而非字符类，方括号模式会被 Tailwind 扫描器误提取为任意值类导致 CSS 压缩失败
        const stamp = new Date().toISOString().replace(/-|:|T/g, '').slice(0, 14)
        const file = new File([blob], `录音_${stamp}.${extRef.current}`, { type })
        if (file.size > 0) onRecorded(file)
      }
      recorder.start()
      recorderRef.current = recorder
      setRecording(true)
      setPaused(false)
      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
    } catch (err) {
      setError(err instanceof DOMException && err.name === 'NotAllowedError'
        ? '麦克风权限被拒绝，请在系统设置中允许访问'
        : '无法开始录音，请检查麦克风设备')
    }
  }, [onRecorded, stopStream])

  const stop = useCallback(() => {
    clearTimer()
    try { recorderRef.current?.stop() } catch { /* */ }
    recorderRef.current = null
    setRecording(false)
    setPaused(false)
  }, [clearTimer])

  /** 取消录音：停止录音并丢弃音频，不回调 onRecorded */
  const cancel = useCallback(() => {
    clearTimer()
    // 标记取消，让 onstop 知道不要产出文件
    cancelledRef.current = true
    try { recorderRef.current?.stop() } catch { /* */ }
    recorderRef.current = null
    stopStream()
    setRecording(false)
    setPaused(false)
    setSeconds(0)
  }, [clearTimer, stopStream])

  const togglePause = useCallback(() => {
    const rec = recorderRef.current
    if (!rec) return
    if (rec.state === 'recording') {
      rec.pause(); setPaused(true); clearTimer()
    } else if (rec.state === 'paused') {
      rec.resume(); setPaused(false)
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
    }
  }, [clearTimer])

  return (
    <div className="flex flex-col items-center justify-center py-6 gap-4">
      {!recording ? (
        <>
          <button
            type="button"
            onClick={start}
            disabled={disabled}
            className="w-16 h-16 rounded-full bg-danger-500 hover:bg-danger-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-danger-500/25 transition-colors"
            aria-label="开始录音"
          >
            <Icon name="Mic" size={26} className="text-white" />
          </button>
          <p className="text-sm text-[color:var(--muted)]">点击开始录音</p>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3">
            {/* 录音脉冲 */}
            <motion.span
              animate={{ scale: paused ? 1 : [1, 1.25, 1], opacity: paused ? 0.4 : [0.6, 1, 0.6] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-3 h-3 rounded-full bg-danger-500"
            />
            <span className="text-numeric-xl font-mono text-[color:var(--fg)] tabular-nums tracking-tight">
              {formatDuration(seconds)}
            </span>
            {paused && <span className="text-xs text-[color:var(--muted)]">已暂停</span>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={cancel} leftIcon="X">
              取消
            </Button>
            <Button variant="secondary" size="sm" onClick={togglePause} leftIcon={paused ? 'Play' : 'Pause'}>
              {paused ? '继续' : '暂停'}
            </Button>
            <Button variant="primary" size="sm" onClick={stop} leftIcon="Square">
              完成录音
            </Button>
          </div>
        </>
      )}

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-danger-600 bg-danger-50 border border-danger-200 rounded-lg px-3 py-1.5">
          <Icon name="AlertTriangle" size={14} />
          {error}
        </div>
      )}
    </div>
  )
}

export default AudioRecorder
