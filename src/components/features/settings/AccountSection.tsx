import { useState, useEffect } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Button } from '../../ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { useMask } from '@/contexts/MaskContext'
import { useToastStore } from '@/store/toastStore'
import { getAPI } from '@/services/api-adapter'
import { PREF_KEYS, loadPref, savePref } from '@/utils/appPrefs'

/** 自动锁屏选项 (分钟, '0'=关闭) */
const AUTO_LOCK_OPTIONS = [
  { value: '0', label: '关闭' },
  { value: '5', label: '5 分钟' },
  { value: '10', label: '10 分钟' },
  { value: '30', label: '30 分钟' },
]

/**
 * 个人账户面板 (v0.83.0 设置页重构)
 * 子区: 我的信息 / 修改密码 / 隐私脱敏显示 / 自动锁屏
 * 全部用户可见 (无 admin 门控)
 */
export function AccountSection() {
  const { currentUser } = useAuth()
  const { masked, toggleMask, isSyncing } = useMask()
  const showToast = useToastStore(s => s.showToast)

  // 修改密码
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [changing, setChanging] = useState(false)

  // 自动锁屏
  const [autoLock, setAutoLock] = useState('0')

  useEffect(() => {
    let alive = true
    loadPref(PREF_KEYS.autoLockMinutes, '0').then(v => { if (alive) setAutoLock(v) })
    return () => { alive = false }
  }, [])

  const handleChangePassword = async () => {
    if (!oldPwd) { showToast('请输入原密码', 'warning'); return }
    if (newPwd.length < 6) { showToast('新密码至少 6 位', 'warning'); return }
    if (newPwd !== confirmPwd) { showToast('两次输入的新密码不一致', 'warning'); return }
    if (newPwd === oldPwd) { showToast('新密码不能与原密码相同', 'warning'); return }
    setChanging(true)
    try {
      const api = await getAPI()
      const res = await api.changeOwnPassword(oldPwd, newPwd)
      if (res.success) {
        showToast('密码修改成功', 'success')
        setOldPwd(''); setNewPwd(''); setConfirmPwd('')
      } else {
        showToast(res.error || '修改失败', 'error')
      }
    } catch (e) {
      showToast(String(e), 'error')
    } finally {
      setChanging(false)
    }
  }

  const handleAutoLockChange = (value: string) => {
    setAutoLock(value)
    void savePref(PREF_KEYS.autoLockMinutes, value)
  }

  return (
    <div className="space-y-6">
      {/* ── 我的信息 ── */}
      <div id="my-info" data-setting-anchor className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-[color:var(--fg)] flex items-center gap-2"><Icon name="User" size={20} /> 我的信息</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[color:var(--panel-2)] rounded-lg p-3">
              <div className="text-xs text-[color:var(--muted)]">用户名</div>
              <div className="text-base text-[color:var(--fg)] mt-1 font-medium">{currentUser?.username || '—'}</div>
            </div>
            <div className="bg-[color:var(--panel-2)] rounded-lg p-3">
              <div className="text-xs text-[color:var(--muted)]">显示名</div>
              <div className="text-base text-[color:var(--fg)] mt-1 font-medium">{currentUser?.displayName || '—'}</div>
            </div>
            <div className="bg-[color:var(--panel-2)] rounded-lg p-3">
              <div className="text-xs text-[color:var(--muted)]">角色</div>
              <div className="text-base text-[color:var(--fg)] mt-1 font-medium">{currentUser?.roleName || '—'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 修改密码 ── */}
      <div id="change-password" data-setting-anchor className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-[color:var(--fg)] flex items-center gap-2"><Icon name="Lock" size={20} /> 修改密码</h2>
        </div>
        <div className="card-body space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">原密码</label>
              <input type="password" className="input" value={oldPwd} onChange={e => setOldPwd(e.target.value)} placeholder="请输入原密码" autoComplete="current-password" />
            </div>
            <div>
              <label className="label">新密码</label>
              <input type="password" className="input" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="至少 6 位" autoComplete="new-password" />
            </div>
            <div>
              <label className="label">确认新密码</label>
              <input type="password" className="input" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="再次输入新密码" autoComplete="new-password" />
            </div>
          </div>
          <div>
            <Button onClick={handleChangePassword} disabled={changing} variant="primary">
              {changing ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> 保存中...</>
              ) : (
                <><Icon name="Save" size={16} /> 保存新密码</>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ── 隐私脱敏显示 ── */}
      <div id="pii-mask" data-setting-anchor className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-[color:var(--fg)] flex items-center gap-2"><Icon name="EyeOff" size={20} /> 隐私脱敏显示</h2>
        </div>
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div className="pr-4">
              <p className="text-sm font-medium text-[color:var(--fg-2)]">对隐私信息打码显示</p>
              <p className="text-xs text-[color:var(--muted)] mt-0.5">开启后，身份证 / 手机号 / 银行账号等以 <span className="font-mono">****</span> 部分显示，防止旁人窥屏</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={masked}
              disabled={isSyncing}
              onClick={toggleMask}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${masked ? 'bg-[color:var(--accent)]' : 'bg-[color:var(--panel-2)]'} ${isSyncing ? 'opacity-60' : ''}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-[color:var(--card)] shadow transition-transform ${masked ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 自动锁屏 ── */}
      <div id="auto-lock" data-setting-anchor className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-[color:var(--fg)] flex items-center gap-2"><Icon name="Clock" size={20} /> 自动锁屏</h2>
        </div>
        <div className="card-body">
          <p className="text-sm text-[color:var(--fg-2)] mb-3">无操作达到设定时间后自动锁定屏幕，需重新输入密码解锁。</p>
          <div className="flex gap-2">
            {AUTO_LOCK_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => handleAutoLockChange(opt.value)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                  autoLock === opt.value
                    ? 'border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--fg)]'
                    : 'border-[color:var(--border)] text-[color:var(--fg-2)] hover:border-[color:var(--border)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
