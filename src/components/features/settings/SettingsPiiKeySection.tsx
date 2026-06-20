import { useState, useEffect } from 'react'
import { useConfirm } from '@/hooks/useConfirm'
import { getAPI } from '@/services/api-adapter'
import { Icon } from '@/components/ui/Icon'
import { useToastStore } from '@/store/toastStore'

/**
 * v0.76.0 累计待办 #5: PII Key Rotation 卡片 (admin-only)
 * - 显示当前 active key + 总 keys
 * - "立即轮换" 按钮: confirm 后调 rotatePiiKey()
 * - 后端 admin-only + audit log, 这里不再做角色判断
 *
 * 轮换语义:
 *   - 生成新 key, 写 pii_keys 表 (is_active=1)
 *   - 旧 active key 标 retired_at, 仍可用于解密历史数据
 *   - 新数据用新 key 加密
 *   - 旧密文完全可读, 无数据迁移
 */
export function SettingsPiiKeySection() {
  const { confirm, ConfirmDialog } = useConfirm()
  const { showToast } = useToastStore()
  const [loading, setLoading] = useState(true)
  const [rotating, setRotating] = useState(false)
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

  useEffect(() => { loadInfo() }, [])

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

  return (
    <>
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Icon name="Shield" size={20} /> PII 数据加密密钥
          </h2>
        </div>
        <div className="card-body space-y-4">
          {loading && (
            <div className="text-sm text-slate-500">加载中...</div>
          )}
          {error && (
            <div className="bg-danger-50 border border-danger-200 rounded-xl p-3 text-sm text-danger-700">
              <Icon name="AlertCircle" size={14} className="inline" /> {error}
            </div>
          )}
          {info && !error && (
            <>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500">当前 active key</div>
                  <div className="font-mono text-base text-slate-800 mt-1">#{info.activeKeyId}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500">历史 key 总数</div>
                  <div className="font-mono text-base text-slate-800 mt-1">{info.totalKeys}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500">最近轮换</div>
                  <div className="text-base text-slate-800 mt-1">
                    {info.latestRetiredAt ?? '从未轮换'}
                  </div>
                </div>
              </div>

              <div className="bg-info-50 border border-info-200 rounded-xl p-3 text-sm text-info-800">
                <p className="font-medium"><Icon name="Lightbulb" size={14} className="inline" /> 轮换说明</p>
                <ul className="mt-1 space-y-1 text-info-700">
                  <li>• 轮换后, 新写入的 PII 字段 (身份证/手机/银行账号等) 用新 key 加密</li>
                  <li>• 旧 key 保留, 用于解密历史密文 (无数据迁移, 无停机)</li>
                  <li>• 建议定期 (90 天) 轮换; 怀疑 key 泄露时立即轮换</li>
                  <li>• 此操作会写 audit log (admin 可见)</li>
                </ul>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleRotate}
                  disabled={rotating}
                  className="btn btn-primary"
                >
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
                </button>
                <button
                  onClick={loadInfo}
                  disabled={loading}
                  className="btn btn-secondary"
                >
                  <Icon name="RefreshCw" size={14} /> 刷新
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {ConfirmDialog}
    </>
  )
}