import { useState, useEffect, useMemo } from 'react'
import { getAPI } from '@/services/api-adapter'
import { useToastStore } from '@/store/toastStore'

export interface Authorization {
  project_id: number
  user_id: string
  granted_by: string
  granted_at: string
  username?: string
  user_display_name?: string
  project_name?: string
}

interface UserOption {
  id: string
  username: string
  display_name?: string
}

interface ProjectOption {
  id: number
  name: string
}

export function useProjectAuthorizations() {
  const showToast = useToastStore(state => state.showToast)

  const [auths, setAuths] = useState<Authorization[]>([])
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserOption[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [showGrantModal, setShowGrantModal] = useState(false)
  const [grantProjectId, setGrantProjectId] = useState<number | "">(0)
  const [grantUserId, setGrantUserId] = useState<string>("")
  const [grantSubmitting, setGrantSubmitting] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<Authorization | null>(null)
  const [revokeSubmitting, setRevokeSubmitting] = useState(false)

  const loadAuths = async () => {
    setLoading(true)
    try {
      const api = await getAPI()
      if (!api?.getProjectAuthorizations) throw new Error('API 未就绪')
      const res = await api.getProjectAuthorizations()
      if (res.success && Array.isArray(res.data)) {
        setAuths(res.data)
      } else {
        throw new Error(res.error || '加载授权列表失败')
      }
    } catch (err: any) {
      showToast(err.message || '加载授权列表失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadOptions = async () => {
    try {
      const api = await getAPI()
      if (!api) return
      const [u, p] = await Promise.all([
        api.getAllUsers?.() ?? Promise.resolve({ success: false }),
        api.getProjects?.() ?? Promise.resolve({ success: false }),
      ])
      if (u.success) setUsers(u.data ?? [])
      if (p.success) setProjects(p.data ?? [])
    } catch {
      // 选项加载失败不阻断主流程
    }
  }

  useEffect(() => {
    loadAuths()
    loadOptions()
  }, [])

  const userOptions = useMemo(
    () => users.map(u => ({
      value: u.id,
      label: u.display_name ? `${u.display_name} (${u.username})` : u.username,
    })),
    [users]
  )

  const projectOptions = useMemo(
    () => projects.map(p => ({ value: p.id, label: p.name })),
    [projects]
  )

  const handleGrant = async () => {
    if (!grantProjectId || !grantUserId) {
      showToast('请选择项目和用户', 'warning')
      return
    }
    setGrantSubmitting(true)
    try {
      const api = await getAPI()
      const res = await api.grantProjectAuthorization(Number(grantProjectId), grantUserId)
      if (res.success) {
        showToast(res.data?.idempotent ? '该授权已存在 (幂等)' : '授权成功', 'success')
        setShowGrantModal(false)
        setGrantProjectId(0)
        setGrantUserId('')
        loadAuths()
      } else {
        throw new Error(res.error || '授权失败')
      }
    } catch (err: any) {
      showToast(err.message || '授权失败', 'error')
    } finally {
      setGrantSubmitting(false)
    }
  }

  const handleRevoke = async () => {
    if (!revokeTarget) return
    setRevokeSubmitting(true)
    try {
      const api = await getAPI()
      const res = await api.revokeProjectAuthorization(revokeTarget.project_id, revokeTarget.user_id)
      if (res.success) {
        showToast('撤销成功', 'success')
        setRevokeTarget(null)
        loadAuths()
      } else {
        throw new Error(res.error || '撤销失败')
      }
    } catch (err: any) {
      showToast(err.message || '撤销失败', 'error')
    } finally {
      setRevokeSubmitting(false)
    }
  }

  return {
    auths, loading, users, projects,
    showGrantModal, grantProjectId, grantUserId, grantSubmitting,
    revokeTarget, revokeSubmitting,
    userOptions, projectOptions,
    setShowGrantModal, setGrantProjectId, setGrantUserId, setRevokeTarget,
    loadAuths, handleGrant, handleRevoke,
  }
}
