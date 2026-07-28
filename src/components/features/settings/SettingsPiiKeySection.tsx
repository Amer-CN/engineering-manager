import { useState, useEffect, useRef, useCallback } from 'react'
import { useConfirm } from '@/hooks/useConfirm'
import { getAPI } from '@/services/api-adapter'
import { Icon } from '@/components/ui/Icon'
import { useToastStore } from '@/store/toastStore'
import { PiiReencryptSection, type ReencryptStatus } from './PiiReencryptSection'
import { Button } from '../../ui/Button'

export function SettingsPiiKeySection() {
  const { confirm, ConfirmDialog } = useConfirm()
  const { showToast } = useToastStore()
  const [loading, setLoading] = useState(true)
  const [rotating, setRotating] = useState(false)
  const [reencrypting, setReencrypting] = useState(false)
  const [reencryptStatus, setReencryptStatus] = useState<ReencryptStatus | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [info, setInfo] = useState<{ activeKeyId: number; totalKeys: number; latestRetiredAt: string | null; latestCreatedAt: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadInfo = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await (await getAPI()).getPiiKeys()
      if (!res.success) {
        setError(res.error || '获取失败')
      } else {
        const keys = (res.data?.keys || []) as Array<{ keyId: number; isActive: number; createdAt: string; retiredAt: string | null }>
        const active = keys.find(k => k.isActive === 1)
        const latestRetired = keys.filter(k => k.retiredAt).sort((a, b) => (b.retiredAt || '').localeCompare(a.retiredAt || ''))[0]
        setInfo({
          activeKeyId: res.data?.activeKeyId ?? active?.keyId ?? 0,
          totalKeys: res.data?.totalKeys ?? keys.length,
          latestRetiredAt: latestRetired?.retiredAt ?? null,
          latestCreatedAt: active?.createdAt ?? '',
        })
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const pollReencryptStatus = useCallback(async () => {
    try {
      const res = await (await getAPI()).getPiiReencryptStatus()
      if (res.success && res.data) {
        const s = res.data as ReencryptStatus
        setReencryptStatus(s)
        if (s.status === 'completed' || s.status === 'completed_with_errors' || s.status === 'idle') {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
          setReencrypting(false)
          if (s.status === 'completed') {
            showToast('PII re-encrypt 全部完成', 'success')
          } else if (s.status === 'completed_with_errors') {
            showToast(`PII re-encrypt 完成 (${s.failedRows} 行失败)`, 'warning')
          }
        }
      }
    } catch {
      // poll error, ignore
    }
  }, [showToast])

  useEffect(() => { loadInfo() }, [])

  // cleanup poll on unmount
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  const handleRotate = async () => {
    if (rotating) return
    const ok = await confirm({
      title: '轮换 PII 加密密钥',
      content: '将生成新的 AES-256 master key 用于加密新写入的 PII 数据。\n\n旧 key 仍保留用于解密历史数据, 不会影响现有数据读取。\n\n此操作不可撤销 (除非备份 pii_keys 表)。\n\n确定要继续吗?',
      confirmText: '确定轮换',
      cancelText: '取消',
    })
    if (!ok) return
    setRotating(true)
    try {
      const res = await (await getAPI()).rotatePiiKey()
      if (res.success) {
        showToast(`PII 密钥已轮换 (新 key_id=${res.data?.newKeyId})`, 'success')
        await loadInfo()
      } else {
        showToast(res.error || '轮换失败', 'error')
      }
    } catch (e) {
      showToast(String(e), 'error')
    } finally {
      setRotating(false)
    }
  }

  const handleReencrypt = async () => {
    if (reencrypting) return
    const ok = await confirm({
      title: '重新加密 PII 数据',
      content: '将使用当前 active key 重新加密所有 PII 字段 (13 列)。\n\n此操作在后台异步执行, 期间不影响正常使用。\n\n确定要继续吗?',
      confirmText: '开始 re-encrypt',
      cancelText: '取消',
    })
    if (!ok) return
    setReencrypting(true)
    try {
      const res = await (await getAPI()).startPiiReencrypt()
      if (res.success) {
        showToast('PII re-encrypt 已启动', 'success')
        // start polling
        pollRef.current = setInterval(pollReencryptStatus, 3000)
        pollReencryptStatus()
      } else {
        showToast(res.error || '启动失败', 'error')
        setReencrypting(false)
      }
    } catch (e) {
      showToast(String(e), 'error')
      setReencrypting(false)
    }
  }

  const progressPct = reencryptStatus && reencryptStatus.totalRows > 0
    ? Math.round((reencryptStatus.processedRows / reencryptStatus.totalRows) * 100)
    : 0

  return (
    <>
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-[color:var(--fg)] flex items-center gap-2">
            <Icon name="Shield" size={20} /> PII 数据加密密钥
          </h2>
        </div>
        <div className="card-body space-y-4">
          {loading && (
            <div className="text-sm text-[color:var(--muted)]">加载中...</div>
          )}
          {error && (
            <div className="bg-danger-50 border border-danger-200 rounded-xl p-3 text-sm text-danger-700">
              <Icon name="AlertCircle" size={14} className="inline" /> {error}
            </div>
          )}
          {info && !error && (
            <>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-[color:var(--panel-2)] rounded-lg p-3">
                  <div className="text-xs text-[color:var(--muted)]">当前 active key</div>
                  <div className="font-mono text-base text-[color:var(--fg)] mt-1">#{info.activeKeyId}</div>
                </div>
                <div className="bg-[color:var(--panel-2)] rounded-lg p-3">
                  <div className="text-xs text-[color:var(--muted)]">历史 key 总数</div>
                  <div className="font-mono text-base text-[color:var(--fg)] mt-1">{info.totalKeys}</div>
                </div>
                <div className="bg-[color:var(--panel-2)] rounded-lg p-3">
                  <div className="text-xs text-[color:var(--muted)]">最近轮换</div>
                  <div className="text-base text-[color:var(--fg)] mt-1">
                    {info.latestRetiredAt ?? '从未轮换'}
                  </div>
                </div>
              </div>

              <div className="bg-[color:var(--panel-2)] border border-[color:var(--border)] rounded-xl p-3 text-sm text-[color:var(--fg-2)]">
                <p className="font-medium"><Icon name="Lightbulb" size={14} className="inline" /> 轮换说明</p>
                <ul className="mt-1 space-y-1 text-[color:var(--fg-2)]">
                  <li>• 轮换后, 新写入的 PII 字段 (身份证/手机/银行账号等) 用新 key 加密</li>
                  <li>• 旧 key 保留, 用于解密历史密文 (无数据迁移, 无停机)</li>
                  <li>• 建议定期 (90 天) 轮换; 怀疑 key 泄露时立即轮换</li>
                  <li>• 此操作会写 audit log (admin 可见)</li>
                </ul>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={handleRotate}
                  disabled={rotating}
                  
                 variant="primary">
                  {rotating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      轮换中...
                    </>
                  ) : (
                    <>
                      <Icon name="RotateCw" size={16} /> 立即轮换
                    </>
                  )}
                </Button>
                <Button
                  onClick={loadInfo}
                  disabled={loading}
                  
                 variant="secondary">
                  <Icon name="RefreshCw" size={14} /> 刷新
                </Button>
              </div>

              <PiiReencryptSection
                reencryptStatus={reencryptStatus}
                progressPct={progressPct}
                reencrypting={reencrypting}
                handleReencrypt={handleReencrypt}
              />
            </>
          )}
        </div>
      </div>
      {ConfirmDialog}
    </>
  )
}
