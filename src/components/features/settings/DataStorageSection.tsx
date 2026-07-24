import { Icon } from '@/components/ui/Icon'
import { usePermission } from '@/hooks/usePermission'
import { useSqliteSettings } from '@/hooks/useSqliteSettings'
import { DataPathSection } from './DataPathSection'
import { SettingsSqliteSection } from '@/components/SettingsSqliteSection'
import { SettingsPiiKeySection } from './SettingsPiiKeySection'
import { SnapshotsTab } from '@/components/SnapshotsTab'

/**
 * 数据与存储面板 (v0.83.0 设置页重构)
 * 子区: 数据存储路径 / 数据库引擎 / 备份与恢复(快照) / PII 加密密钥
 *
 * 权限:
 * - 数据路径 / 数据库引擎 → 全部 settings:read 用户可见 (维持现状)
 * - 备份与恢复(快照) / PII 加密密钥 → 仅 admin (破坏性/安全敏感)
 *
 * 治卡顿: useSqliteSettings 下沉到本面板 — 仅进入「数据与存储」时才请求 SQLite 状态
 */
export function DataStorageSection({ refresh }: { refresh?: () => void }) {
  const { isAdmin } = usePermission()
  const sqlite = useSqliteSettings()
  const admin = isAdmin()

  return (
    <div className="space-y-6">
      <div id="data-path" data-setting-anchor>
        <DataPathSection refresh={refresh} />
      </div>

      <div id="db-engine" data-setting-anchor>
        <SettingsSqliteSection
          status={sqlite.status}
          loading={sqlite.loading}
          enabling={sqlite.enabling}
          migrating={sqlite.migrating}
          switching={sqlite.switching}
          message={sqlite.message}
          onEnable={sqlite.handleEnable}
          onMigrate={sqlite.handleMigrate}
          onRemigrate={sqlite.handleRemigrate}
          onSetReadMode={sqlite.handleSetReadMode}
        />
      </div>

      {/* 备份与恢复 — 仅 admin (从「用户管理」迁移而来) */}
      {admin && (
        <div id="backup-restore" data-setting-anchor className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Icon name="RotateCcw" size={20} /> 备份与恢复</h2>
          </div>
          <div className="card-body">
            <SnapshotsTab />
          </div>
        </div>
      )}

      {/* PII 加密密钥 — 仅 admin */}
      {admin && (
        <div id="pii-key" data-setting-anchor>
          <SettingsPiiKeySection />
        </div>
      )}
    </div>
  )
}
