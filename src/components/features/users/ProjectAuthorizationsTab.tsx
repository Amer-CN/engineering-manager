import { useState, useEffect, useMemo } from 'react'
import { getAPI } from '@/services/api-adapter'
import { useToastStore } from '@/store/toastStore'
import { Icon } from '@/components/ui/Icon'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { DataTable, type Column } from '@/components/DataTable'

/**
 * ProjectAuthorizationsTab — 项目授权管理 Tab
 *
 * v0.73.0 P0-4 闭环 UI: 让 admin 真正用上后端 /api/admin/project-authorizations API.
 * 非 admin user 在 Users.tsx 层就被 <RequireAdmin> 挡住, 这里不再做权限检查.
 *
 * 数据流:
 *   GET   /api/admin/project-authorizations                       → 列出全部授权
 *   GET   /api/admin/project-authorizations/by-user/{userId}      → 单 user 视角 (本组件未直接用, 预留)
 *   POST  /api/admin/project-authorizations { projectId, userId } → 幂等授权
 *   DELETE /api/admin/project-authorizations/{pid}/{uid}          → 撤销授权
 */

interface Authorization {
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

export function ProjectAuthorizationsTab() {
  const showToast = useToastStore(state => state.showToast)

  // 主数据
  const [auths, setAuths] = useState<Authorization[]>([])
  const [loading, setLoading] = useState(true)

  // 供下拉框选
  const [users, setUsers] = useState<UserOption[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])

  // 授权弹窗
  const [showGrantModal, setShowGrantModal] = useState(false)
  const [grantProjectId, setGrantProjectId] = useState<number | "">(0)
  const [grantUserId, setGrantUserId] = useState<string>("")
  const [grantSubmitting, setGrantSubmitting] = useState(false)

  // 撤销确认
  const [revokeTarget, setRevokeTarget] = useState<Authorization | null>(null)
  const [revokeSubmitting, setRevokeSubmitting] = useState(false)

  // 加载授权列表
  const loadAuths = async () => {
    setLoading(true)
    try {
      const api = await getAPI()
      if (!api?.getProjectAuthorizations) {
        throw new Error('API 未就绪')
      }
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

  // 加载下拉选项
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

  // 用户下拉框选项
  const userOptions = useMemo(
    () => users.map(u => ({
      value: u.id,
      label: u.display_name ? `${u.display_name} (${u.username})` : u.username,
    })),
    [users]
  )

  // 项目下拉框选项
  const projectOptions = useMemo(
    () => projects.map(p => ({ value: p.id, label: p.name })),
    [projects]
  )

  // 提交授权
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

  // 提交撤销
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

  // DataTable 列
  const columns: Column<Authorization>[] = [
    {
      key: 'project_name',
      title: '项目',
      sortable: true,
      render: (row, _idx) => (
        <span className="font-medium text-slate-800">
          {row.project_name || `#${row.project_id}`}
        </span>
      ),
    },
    {
      key: 'user_display_name',
      title: '用户',
      sortable: true,
      render: (row, _idx) => (
        <div>
          <div className="text-slate-800">{row.user_display_name || row.username || row.user_id}</div>
          {row.username && row.user_display_name && (
            <div className="text-caption text-slate-500">@{row.username}</div>
          )}
        </div>
      ),
    },
    {
      key: 'granted_at',
      title: '授权时间',
      sortable: true,
      render: (row, _idx) => (
        <span className="text-caption text-slate-600">{row.granted_at}</span>
      ),
    },
    {
      key: 'granted_by',
      title: '授权人',
      render: (row, _idx) => (
        <span className="text-caption text-slate-600">{row.granted_by}</span>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      align: 'right',
      render: (row, _idx) => (
        <Button variant="danger" size="sm" onClick={() => setRevokeTarget(row)}>
          撤销
        </Button>
      ),
    },
  ]

  return (
    <Card>
      {/* 头部: 标题 + 新增授权按钮 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Icon name="KeyRound" size={20} className="text-primary-600" />
          <div>
            <h3 className="text-base font-semibold text-slate-800">项目授权管理</h3>
            <p className="text-caption text-slate-500 mt-0.5">
              给非 admin 用户授予某个项目的查看权限 (P0-4 越权防护的恢复通道)
            </p>
          </div>
        </div>
        <Button variant="primary" size="md" onClick={() => setShowGrantModal(true)}>
          <Icon name="Plus" size={16} className="mr-1" />
          新增授权
        </Button>
      </div>

      {/* 列表 */}
      <DataTable
        data={auths}
        columns={columns}
        loading={loading}
        rowKey={(row) => `${row.project_id}-${row.user_id}`}
        emptyText="暂无授权 — 所有非 admin 用户只能看到自己创建的记录"
        useHoverScrollbar
      />

      {/* 授权弹窗 */}
      <Modal
        isOpen={showGrantModal}
        onClose={() => setShowGrantModal(false)}
        title="新增项目授权"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowGrantModal(false)} disabled={grantSubmitting}>
              取消
            </Button>
            <Button variant="primary" onClick={handleGrant} loading={grantSubmitting}>
              授权
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="项目"
            value={grantProjectId === 0 ? "" : String(grantProjectId)}
            onChange={value => setGrantProjectId(value ? Number(value) : 0)}
            options={projectOptions}
            placeholder="选择项目"
          />
          <Select
            label="用户"
            value={grantUserId}
            onChange={value => setGrantUserId(String(value))}
            options={userOptions}
            placeholder="选择用户"
          />
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <p className="text-micro text-slate-600">
              <Icon name="Info" size={12} className="inline mr-1 -mt-0.5" />
              授权后该用户可在该项目下看到所有记录 (admin 仍然能看全表,不受授权限制).
              重复授权返回幂等结果, 不会创建重复记录.
            </p>
          </div>
        </div>
      </Modal>

      {/* 撤销确认弹窗 */}
      <Modal
        isOpen={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        title="撤销授权"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRevokeTarget(null)} disabled={revokeSubmitting}>
              取消
            </Button>
            <Button variant="danger" onClick={handleRevoke} loading={revokeSubmitting}>
              撤销
            </Button>
          </>
        }
      >
        {revokeTarget && (
          <div className="space-y-3">
            <p className="text-sm text-slate-700">
              确定撤销以下授权?
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-slate-500">项目</span>
                <span className="font-medium text-slate-800">
                  {revokeTarget.project_name || `#${revokeTarget.project_id}`}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">用户</span>
                <span className="font-medium text-slate-800">
                  {revokeTarget.user_display_name || revokeTarget.username || revokeTarget.user_id}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">授权时间</span>
                <span className="text-slate-800">{revokeTarget.granted_at}</span>
              </div>
            </div>
            <p className="text-micro text-danger-600">
              <Icon name="AlertTriangle" size={12} className="inline mr-1 -mt-0.5" />
              撤销后该用户将无法看到该项目下非自己创建的记录.
            </p>
          </div>
        )}
      </Modal>
    </Card>
  )
}
