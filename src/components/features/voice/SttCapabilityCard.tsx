/**
 * SttCapabilityCard — 语音转写能力检测结果卡（检测中 / 不可用 / 就绪三态）。
 * 从 TranscriptionWorkspace.tsx 机械搬移（门禁 400 行），零逻辑改动。
 * 2026-09-16：新增缺失模型下载区（每引擎一行：缺哪些文件、共多大、能否一键下）。
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import {
  getSttModelStatus,
  startSttModelDownload,
  subscribeSttModelDownload,
  type SttCapability,
  type SttEngineModelStatus,
  type SttModelDownloadProgress,
} from '@/services/stt-client'

interface SttCapabilityCardProps {
  capLoading: boolean
  canTranscribe: boolean
  canDiarize: boolean
  capability: SttCapability | null
}

/** 字节数 → 人类可读（只陈述大小，不做任何评测性描述） */
function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)}GB`
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / 1024 / 1024)}MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`
  return `${bytes}B`
}

const SttCapabilityCard: React.FC<SttCapabilityCardProps> = ({ capLoading, canTranscribe, canDiarize, capability }) => {
  const [engines, setEngines] = useState<SttEngineModelStatus[]>([])
  const [progress, setProgress] = useState<Record<string, SttModelDownloadProgress>>({})
  const [error, setError] = useState<Record<string, string>>({})
  const unsubsRef = useRef<Record<string, () => void>>({})

  const refresh = useCallback(async () => {
    const res = await getSttModelStatus()
    if (res.success && res.data) setEngines(res.data.engines)
  }, [])

  useEffect(() => {
    void refresh()
    return () => {
      Object.values(unsubsRef.current).forEach((unsub) => unsub())
      unsubsRef.current = {}
    }
  }, [refresh])

  const handleDownload = useCallback(async (engineId: string) => {
    setError((prev) => ({ ...prev, [engineId]: '' }))
    const res = await startSttModelDownload(engineId)
    if (!res.success) {
      setError((prev) => ({ ...prev, [engineId]: res.error || '启动下载失败' }))
      return
    }
    if (res.data?.alreadyReady) {
      void refresh()
      return
    }
    // 订阅进度（重复点击时先退订旧的，避免多条流）
    unsubsRef.current[engineId]?.()
    unsubsRef.current[engineId] = subscribeSttModelDownload(engineId, (p) => {
      setProgress((prev) => ({ ...prev, [engineId]: p }))
      if (p.phase === 'done') {
        unsubsRef.current[engineId]?.()
        delete unsubsRef.current[engineId]
        void refresh()
      }
      if (p.phase === 'error') {
        unsubsRef.current[engineId]?.()
        delete unsubsRef.current[engineId]
        setError((prev) => ({ ...prev, [engineId]: p.error || '下载失败' }))
      }
    })
  }, [refresh])

  const missing = engines.filter((e) => !e.ready)

  const downloadArea = missing.length > 0 && (
    <Card padding="md" className="bg-warning-50 border-warning-200">
      <div className="flex items-start gap-3">
        <Icon name="AlertTriangle" size={20} className="text-warning-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 space-y-3">
          <p className="text-sm font-medium text-warning-800">部分引擎缺少模型文件</p>
          {missing.map((engine) => {
            const p = progress[engine.engineId]
            const err = error[engine.engineId]
            const busy = p?.phase === 'downloading' || p?.phase === 'extracting'
            const manualOnly = engine.missingFiles.every((f) => !f.downloadable)
            return (
              <div key={engine.engineId} className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-[color:var(--fg)]">{engine.displayName}</span>
                  <span className="text-xs text-warning-700">
                    缺 {engine.missingFiles.length} 个文件（共 {formatBytes(engine.missingBytes)}）
                  </span>
                  {manualOnly ? (
                    <Badge variant="gray" size="sm">需手动放置</Badge>
                  ) : (
                    <Button
                      variant="outline"
                      size="xs"
                      disabled={busy}
                      leftIcon="Download"
                      onClick={() => void handleDownload(engine.engineId)}
                    >
                      {busy ? '下载中...' : '下载'}
                    </Button>
                  )}
                </div>
                <ul className="text-xs text-warning-700 space-y-0.5">
                  {engine.missingFiles.map((f) => (
                    <li key={f.relPath}>
                      {f.relPath}（{formatBytes(f.bytes)}）
                      {!f.downloadable && ' — 找管理员拷贝'}
                    </li>
                  ))}
                </ul>
                {busy && (
                  <div className="space-y-1">
                    <div className="h-1.5 w-full rounded-full bg-[color:var(--panel-2)] overflow-hidden">
                      <div
                        className="h-full bg-[color:var(--accent)] transition-all"
                        style={{ width: `${Math.min(100, p?.percent ?? 0)}%` }}
                      />
                    </div>
                    <p className="text-xs text-warning-600">
                      {p?.file ? `${p.file} — ` : ''}
                      {formatBytes(p?.bytesReceived ?? 0)} / {formatBytes(p?.totalBytes ?? 0)}
                      {p?.percent != null ? `（${p.percent}%）` : ''}
                    </p>
                  </div>
                )}
                {err && <p className="text-xs text-danger-600">下载失败：{err}</p>}
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )

  return (
    <>
      {capLoading ? (
        <div className="flex items-center gap-2 text-sm text-[color:var(--muted)]">
          <Icon name="Loader2" size={16} className="animate-spin" />
          <span>检测转写能力...</span>
        </div>
      ) : !canTranscribe ? (
        <Card padding="md" className="bg-warning-50 border-warning-200">
          <div className="flex items-start gap-3">
            <Icon name="AlertTriangle" size={20} className="text-warning-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-warning-800">语音转写当前不可用</p>
              <p className="text-xs text-warning-700 mt-1">
                {capability?.unavailableReason || '无可用引擎：MOSS/Paraformer 模型缺失，可在下载中心获取'}
              </p>
              <p className="text-xs text-warning-600 mt-1">云端转写尚未启用</p>
            </div>
          </div>
        </Card>
      ) : (
        <Card padding="sm" className="bg-success-50 border-success-200">
          <div className="flex items-center gap-2 text-sm">
            <Icon name="CheckCircle" size={16} className="text-success-500" />
            <span className="text-success-800 font-medium">本地转写已就绪</span>
            {!canDiarize && (
              <Badge variant="warning" size="sm">说话人分离模型未就绪</Badge>
            )}
          </div>
        </Card>
      )}
      {!capLoading && downloadArea}
    </>
  )
}

export default SttCapabilityCard
