import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Button } from '../../ui/Button'
import { useToastStore } from '@/store/toastStore'
import { getAPI } from '@/services/api-adapter'

/** 修改密码子卡（独立状态，减少父组件 useState） */
export function ChangePasswordCard() {
  const showToast = useToastStore(s => s.showToast)
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [changing, setChanging] = useState(false)

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

  return (
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
  )
}
