import { useProjectAuthorizations, type Authorization } from './useProjectAuthorizations'
import { Icon } from '@/components/ui/Icon'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Drawer } from '@/components/ui/Drawer'
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

export function ProjectAuthorizationsTab() {
  const {
    auths, loading,
    showGrantModal, grantProjectId, grantUserId, grantSubmitting,
    revokeTarget, revokeSubmitting,
    userOptions, projectOptions,
    setShowGrantModal, setGrantProjectId, setGrantUserId, setRevokeTarget,
    handleGrant, handleRevoke,
  } = useProjectAuthorizations()

  // DataTable 列
  const columns: Column<Authorization>[] = [
    {
      key: 'project_name',
      title: '项目',
      sortable: true,
      render: (row, _idx) => (
        <span className="font-medium text-[color:var(--fg)]">
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
          <div className="text-[color:var(--fg)]">{row.user_display_name || row.username || row.user_id}</div>
          {row.username && row.user_display_name && (
            <div className="text-caption text-[color:var(--muted)]">@{row.username}</div>
          )}
        </div>
      ),
    },
    {
      key: 'granted_at',
      title: '授权时间',
      sortable: true,
      render: (row, _idx) => (
        <span className="text-caption text-[color:var(--fg-2)]">{row.granted_at}</span>
      ),
    },
    {
      key: 'granted_by',
      title: '授权人',
      render: (row, _idx) => (
        <span className="text-caption text-[color:var(--fg-2)]">{row.granted_by}</span>
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
          <Icon name="KeyRound" size={20} className="text-[color:var(--accent)]" />
          <div>
            <h3 className="text-base font-semibold text-[color:var(--fg)]">项目授权管理</h3>
            <p className="text-caption text-[color:var(--muted)] mt-0.5">
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

      {/* 授权抽屉 */}
      <Drawer
        open={showGrantModal}
        onClose={() => setShowGrantModal(false)}
        dirty={grantProjectId !== 0 || !!grantUserId}
        icon="ShieldCheck"
        title="新增项目授权"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowGrantModal(false)} disabled={grantSubmitting}>
              取消
            </Button>
            <Button variant="primary" onClick={handleGrant} loading={grantSubmitting}>
              授权
            </Button>
          </div>
        }
      >
        <div className="space-y-4 px-6 py-4">
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
          <div className="bg-[color:var(--panel-2)] border border-[color:var(--border)] rounded-lg p-3">
            <p className="text-micro text-[color:var(--fg-2)]">
              <Icon name="Info" size={12} className="inline mr-1 -mt-0.5" />
              授权后该用户可在该项目下看到所有记录 (admin 仍然能看全表,不受授权限制).
              重复授权返回幂等结果, 不会创建重复记录.
            </p>
          </div>
        </div>
      </Drawer>

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
            <p className="text-sm text-[color:var(--fg-2)]">
              确定撤销以下授权?
            </p>
            <div className="bg-[color:var(--panel-2)] border border-[color:var(--border)] rounded-lg p-3 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-[color:var(--muted)]">项目</span>
                <span className="font-medium text-[color:var(--fg)]">
                  {revokeTarget.project_name || `#${revokeTarget.project_id}`}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[color:var(--muted)]">用户</span>
                <span className="font-medium text-[color:var(--fg)]">
                  {revokeTarget.user_display_name || revokeTarget.username || revokeTarget.user_id}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[color:var(--muted)]">授权时间</span>
                <span className="text-[color:var(--fg)]">{revokeTarget.granted_at}</span>
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
