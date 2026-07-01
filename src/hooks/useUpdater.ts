import { useState, useCallback } from 'react'
import {
  checkUpdate, startDownload, subscribeDownloadProgress, applyUpdate,
  type UpdateCheck, type DownloadProgress,
} from '../services/update-client'

export type UpdaterPhase = 'idle' | 'checking' | 'downloading' | 'verifying' | 'done' | 'error' | 'no-update'

export function useUpdater() {
  const [info, setInfo] = useState<UpdateCheck | null>(null)
  const [progress, setProgress] = useState<DownloadProgress | null>(null)
  const [phase, setPhase] = useState<UpdaterPhase>('idle')
  const [error, setError] = useState<string | null>(null)

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
        setPhase('done')
        if (p.filePath) applyUpdate(p.filePath).catch(() => {})
      }
      if (p.phase === 'error') {
        es.close()
        setPhase('error')
        setError(p.error || '下载失败')
      }
    })
  }, [])

  const retry = useCallback(() => {
    setPhase('idle')
    setProgress(null)
    setError(null)
    download()
  }, [download])

  return { info, progress, phase, error, check, download, retry, setInfo }
}
