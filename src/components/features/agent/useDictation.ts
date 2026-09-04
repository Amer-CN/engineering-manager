/**
 * useDictation — 输入框听写（MediaRecorder 录音 → STT 上传转写 → 文本回调）
 *
 * 录音参考 voice/AudioRecorder.tsx 的模式独立实现（不 import 它）：
 * getUserMedia + MediaRecorder（WebView2 Chromium 默认 audio/webm）。
 * 停止后产 File → uploadSttAudio → createSttJob → 轮询 getSttJob
 * （间隔 1.5s，上限 90s）→ 完成后把 detail.text 交给 onText 回调。
 * 取消/组件卸载：清理录音流与轮询定时器，丢弃结果。
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createSttJob,
  getSttJob,
  getSttStatus,
  uploadSttAudio,
} from '@/services/stt-client'

/** 听写阶段：空闲 / 录音中 / 转写中 */
export type DictationPhase = 'idle' | 'recording' | 'transcribing'

/** 轮询间隔（ms） */
const POLL_INTERVAL_MS = 1500
/** 轮询上限（ms） */
const POLL_LIMIT_MS = 90_000

interface UseDictationOptions {
  /** 转写完成后回调（detail.text；失败/超时/取消不回调） */
  onText: (text: string) => void
}

export function useDictation({ onText }: UseDictationOptions) {
  const [phase, setPhase] = useState<DictationPhase>('idle')
  /** STT 能力可用（getSttStatus 不可用 → 上层隐藏麦克风按钮） */
  const [available, setAvailable] = useState(false)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  /** 轮询定时器句柄（取消/卸载清理） */
  const pollTimerRef = useRef<number | undefined>(undefined)
  /** 会话代号：cleanup 时自增，旧轮次的在途响应（上传/建任务/轮询）据此作废，防止串台新录音 */
  const genRef = useRef(0)
  const onTextRef = useRef(onText)
  onTextRef.current = onText

  // STT 能力检测（一次性）
  useEffect(() => {
    let cancelled = false
    getSttStatus()
      .then((resp) => {
        if (!cancelled) {
          // 浏览器录音 API 缺失（非 WebView2/旧浏览器）时同样视为不可用，按钮由上层隐藏
          const micApiReady = !!navigator.mediaDevices?.getUserMedia
          setAvailable(!!resp.success && !!resp.data?.canTranscribe && micApiReady)
        }
      })
      .catch(() => {
        if (!cancelled) setAvailable(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  /** 清理：停录音机 + 停流 + 清轮询定时器，并作废旧轮次的在途响应 */
  const cleanup = useCallback(() => {
    genRef.current += 1
    if (pollTimerRef.current) {
      window.clearTimeout(pollTimerRef.current)
      pollTimerRef.current = undefined
    }
    try {
      recorderRef.current?.stop()
    } catch {
      /* 已停止 */
    }
    recorderRef.current = null
    stopStream()
  }, [stopStream])

  // 卸载清理：停流与定时器
  useEffect(() => () => cleanup(), [cleanup])

  /** 收尾：回 idle（text 非空时回调 onText；失败/超时/取消传 null） */
  const finish = useCallback(
    (gen: number, text: string | null) => {
      if (genRef.current !== gen) return
      pollTimerRef.current = undefined
      if (text) onTextRef.current(text)
      setPhase('idle')
    },
    [],
  )

  /** 轮询任务详情：completed → 文本；failed/cancelled/超时 → 收尾 */
  const pollJob = useCallback(
    (gen: number, jobId: number, startedAt: number) => {
      if (genRef.current !== gen) return
      getSttJob(jobId).then((resp) => {
        if (genRef.current !== gen) return
        const job = resp.data
        if (resp.success && job) {
          if (job.status === 'completed') {
            finish(gen, (job.text ?? '').trim() || null)
            return
          }
          if (job.status === 'failed' || job.status === 'cancelled') {
            finish(gen, null)
            return
          }
        }
        if (Date.now() - startedAt > POLL_LIMIT_MS) {
          finish(gen, null)
          return
        }
        pollTimerRef.current = window.setTimeout(() => pollJob(gen, jobId, startedAt), POLL_INTERVAL_MS)
      }).catch(() => {
        // 网络抖动：单次查询失败不中断轮询，继续按 1.5s 间隔重试；连续失败直至 90s 总超时兜底
        if (genRef.current !== gen) return
        if (Date.now() - startedAt > POLL_LIMIT_MS) {
          finish(gen, null)
          return
        }
        pollTimerRef.current = window.setTimeout(() => pollJob(gen, jobId, startedAt), POLL_INTERVAL_MS)
      })
    },
    [finish],
  )

  /** 停止录音后：上传 → 建任务 → 轮询 */
  const transcribe = useCallback(
    (gen: number, file: File) => {
      setPhase('transcribing')
      void (async () => {
        try {
          const up = await uploadSttAudio(file)
          if (genRef.current !== gen) return
          if (!up.success || !up.data) {
            finish(gen, null)
            return
          }
          const created = await createSttJob({ filePath: up.data.filePath, isMultiSpeaker: false })
          if (genRef.current !== gen) return
          if (!created.success || !created.data) {
            finish(gen, null)
            return
          }
          pollJob(gen, created.data.jobId, Date.now())
        } catch {
          finish(gen, null)
        }
      })()
    },
    [finish, pollJob],
  )

  /** 开始录音（getUserMedia 不可用 → 保持 idle，按钮已由 available 隐藏） */
  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) return
    const gen = genRef.current
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (genRef.current !== gen) {
        // 等待授权期间被取消/卸载：立刻释放
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stopStream()
        recorderRef.current = null
        if (genRef.current !== gen) return // 取消/卸载：丢弃音频
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        if (blob.size === 0) {
          finish(gen, null)
          return
        }
        const stamp = new Date().toISOString().replace(/-|:|T/g, '').slice(0, 14)
        transcribe(gen, new File([blob], `听写_${stamp}.webm`, { type: blob.type }))
      }
      recorder.start()
      recorderRef.current = recorder
      setPhase('recording')
    } catch {
      // 麦克风权限被拒/设备不可用：回 idle
      stopStream()
      setPhase('idle')
    }
  }, [finish, stopStream, transcribe])

  /** 结束录音（onstop 产出文件并进入转写） */
  const stop = useCallback(() => {
    try {
      recorderRef.current?.stop()
    } catch {
      /* 已停止 */
    }
  }, [])

  /** 取消：清理流与定时器，丢弃结果 */
  const cancel = useCallback(() => {
    cleanup()
    setPhase('idle')
  }, [cleanup])

  /** 点击切换：idle→录音、录音→结束转写、转写中→取消（终止轮询，作废在途响应） */
  const toggle = useCallback(() => {
    if (phase === 'idle') void start()
    else if (phase === 'recording') stop()
    else if (phase === 'transcribing') cancel()
  }, [phase, start, stop, cancel])

  return { phase, recording: phase === 'recording', transcribing: phase === 'transcribing', available, toggle, cancel }
}
