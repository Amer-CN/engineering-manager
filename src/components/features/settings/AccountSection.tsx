import { useState, useEffect } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Button } from '../../ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { useMask } from '@/contexts/MaskContext'
import { useToastStore } from '@/store/toastStore'
import { getAPI } from '@/services/api-adapter'
import { PREF_KEYS, loadPref, savePref } from '@/utils/appPrefs'
import { useHasFeature } from '@/store/editionStore'
import { ChangePasswordCard } from './ChangePasswordCard'

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
  const hasUserManagement = useHasFeature('userManagement')

  // 自动锁屏
  const [autoLock, setAutoLock] = useState('0')

  // M-EDITION1: 个人资料新增字段
  const [companyName, setCompanyName] = useState('')
  const [position, setPosition] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [businessDesc, setBusinessDesc] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)

  useEffect(() => {
    let alive = true
    loadPref(PREF_KEYS.autoLockMinutes, '0').then(v => { if (alive) setAutoLock(v) })
    return () => { alive = false }
  }, [])

  // M-EDITION1: 加载个人资料（无 userManagement 能力时显示，即个人版）
  useEffect(() => {
    if (hasUserManagement) return
    let alive = true
    getAPI().then(api => api?.getUserProfile?.()).then(res => {
      if (!alive || !res) return
      setCompanyName(res.company_name || '')
      setPosition(res.position || '')
      setSpecialty(res.specialty || '')
      setBusinessDesc(res.business_description || '')
    }).catch(() => {})
    return () => { alive = false }
  }, [hasUserManagement])

  const handleSaveProfile = async () => {
    setProfileSaving(true)
    try {
      const api = await getAPI()
      await api.updateUserProfile({ companyName, position, specialty, businessDescription: businessDesc })
      showToast('个人资料已保存，AI 助手将读取这些信息', 'success')
    } catch (e) {
      showToast(String(e), 'error')
    } finally {
      setProfileSaving(false)
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

      {/* ── M-EDITION1: 公司与专业信息（无 userManagement 能力时显示） ── */}
      {!hasUserManagement && (
      <div id="company-profile" data-setting-anchor className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-[color:var(--fg)] flex items-center gap-2"><Icon name="Building2" size={20} /> 公司与专业信息</h2>
          <p className="text-xs text-[color:var(--muted)] mt-1">填写后 AI 助手将了解您的业务背景，提供更精准的建议</p>
        </div>
        <div className="card-body space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">公司名称</label>
              <input className="input" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="如：某某建筑工程有限公司" />
            </div>
            <div>
              <label className="label">职位</label>
              <input className="input" value={position} onChange={e => setPosition(e.target.value)} placeholder="如：项目经理 / 总经理" />
            </div>
            <div>
              <label className="label">工种 / 专业</label>
              <input className="input" value={specialty} onChange={e => setSpecialty(e.target.value)} placeholder="如：土建 / 装修 / 机电" />
            </div>
            <div>
              <label className="label">主要业务描述</label>
              <input className="input" value={businessDesc} onChange={e => setBusinessDesc(e.target.value)} placeholder="如：承接商业综合体土建总承包" />
            </div>
          </div>
          <div>
            <Button onClick={handleSaveProfile} disabled={profileSaving} variant="primary">
              {profileSaving ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> 保存中...</>
              ) : (
                <><Icon name="Save" size={16} /> 保存资料</>
              )}
            </Button>
          </div>
        </div>
      </div>
      )}

      {/* ── 修改密码 ── */}
      <ChangePasswordCard />

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
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
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
