import { useState, useCallback, useRef, createContext, useContext, type ReactNode } from 'react'
import {
  checkUpdate, startDownload, subscribeDownloadProgress, applyUpdate, cancelDownload,
  type UpdateCheck, type DownloadProgress,
} from '../services/update-client'

export type UpdaterPhase = 'idle' | 'checking' | 'downloading' | 'verifying' | 'done' | 'error' | 'no-update' | 'cancelled' | 'paused'

interface UpdaterContextValue {
  info: UpdateCheck | null
  progress: DownloadProgress | null
  phase: UpdaterPhase
  error: string | null
  check: () => Promise<UpdateCheck | null>
  download: () => Promise<void>
  cancel: () => Promise<void>
  pause: () => Promise<void>
  resume: () => void
  retry: () => void
  setInfo: (v: UpdateCheck | null) => void
}

const UpdaterContext = createContext<UpdaterContextValue | null>(null)

export function UpdaterProvider({ children }: { children: ReactNode }) {
  const [info, setInfo] = useState<UpdateCheck | null>(null)
  const [progress, setProgress] = useState<DownloadProgress | null>(null)
  const [phase, setPhase] = useState<UpdaterPhase>('idle')
  const [error, setError] = useState<string | null>(null)
  const esRef = useRef<EventSource | null>(null)

  const check = useCallback(async () => {
    setPhase('checking')
    setError(null)
    try {
      const r = await checkUpdate()
      if (r?.hasUpdate) {
        setInfo(r)
        setPhase('idle')
        return r
      } else {
        setPhase('no-update')
        return null
      }
    } catch {
      setPhase('error')
      setError('检查失败，请稍后重试')
      return null
    }
  }, [])

  const download = useCallback(async () => {
    setPhase('downloading')
    setError(null)
    const ok = await startDownload()
    if (!ok) {
      setPhase('error')
      setError('启动下载失败')
      return
    }
    const es = subscribeDownloadProgress((p) => {
      setProgress(p)
      if (p.phase === 'downloading') setPhase('downloading')
      if (p.phase === 'verifying') setPhase('verifying')
      if (p.phase === 'done') {
        es.close()
        esRef.current = null
        setPhase('done')
        if (p.filePath) applyUpdate(p.filePath).catch(() => {})
      }
      if (p.phase === 'error') {
        es.close()
        esRef.current = null
        setPhase('error')
        setError(p.error || '下载失败')
      }
      if (p.phase === 'cancelled') {
        es.close()
        esRef.current = null
        setPhase('cancelled')
      }
    })
    esRef.current = es
  }, [])

  const cancel = useCallback(async () => {
    await cancelDownload()
    esRef.current?.close()
    esRef.current = null
    setPhase('cancelled')
    setProgress(null)
  }, [])

  // 暂停：取消下载但保留 .part 文件和进度，可继续
  const pause = useCallback(async () => {
    await cancelDownload()
    esRef.current?.close()
    esRef.current = null
    setPhase('paused')
    // 保留 progress 数据，让用户看到已下载量
  }, [])

  // 继续：重新启动下载，后端检测到 .part 文件自动断点续传
  const resume = useCallback(() => {
    setPhase('idle')
    setError(null)
    download()
  }, [download])

  const retry = useCallback(() => {
    setPhase('idle')
    setProgress(null)
    setError(null)
    download()
  }, [download])

  const value: UpdaterContextValue = {
    info, progress, phase, error, check, download, cancel, pause, resume, retry, setInfo,
  }

  return <UpdaterContext.Provider value={value}>{children}</UpdaterContext.Provider>
}

export function useUpdater() {
  const ctx = useContext(UpdaterContext)
  if (!ctx) throw new Error('useUpdater must be used within UpdaterProvider')
  return ctx
}
