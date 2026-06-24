import { Icon } from '@/components/ui/Icon'
import { useConfirm } from '@/hooks/useConfirm'
import { useDataPath } from '@/hooks/useDataPath'
import { Button } from '../../ui/Button'

/**
 * v0.76.0 累计待办 #7: Settings 剩余拆分 — 数据存储设置卡片
 * 包含: 当前路径显示 + 更改路径 + 恢复默认 + 提示 + 迁移状态消息
 */
export function DataPathSection({ refresh }: { refresh?: () => void }) {
  const dp = useDataPath(refresh)
  const { confirm, ConfirmDialog } = useConfirm()

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Icon name="FolderKanban" size={20} /> 数据存储设置</h2>
      </div>
      <div className="card-body space-y-4">
        <div>
          <label className="label">当前数据存储路径</label>
          <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700 font-mono break-all border border-slate-200">{dp.dataPath}</div>
        </div>
        <div className="flex flex-wrap gap-3 pt-2 items-center">
          <Button onClick={dp.handleChangeDataPath} disabled={dp.migrating}  variant="primary">
            <Icon name="FolderKanban" size={16} />更改数据存储位置
          </Button>
          {dp.dataPath !== dp.defaultPath && (
            <Button onClick={async () => {
              const ok = await confirm({
                title: '恢复默认路径',
                content: '确定要将数据路径恢复为默认位置吗？数据将被复制到新位置。',
                confirmText: '确定恢复',
                cancelText: '取消',
              })
              if (ok) dp.handleResetToDefault()
            }} disabled={dp.migrating}  variant="secondary"><Icon name="RotateCcw" size={16} /> 恢复默认路径</Button>
          )}
          {dp.migrating && (
            <div className="text-sm text-amber-600 flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-600 border-t-transparent"></div>
              正在迁移数据...
            </div>
          )}
        </div>
        <div className="bg-info-50 border border-info-200 rounded-xl p-4">
          <p className="text-sm text-info-800 font-medium"><Icon name="Lightbulb" size={16} className="inline" /> 提示</p>
          <ul className="text-sm text-info-700 mt-2 space-y-1">
            <li>•更改数据路径会将所有数据（包括上传的文件）复制到新位置</li>
            <li>•建议将数据存储在非系统盘（如 D:\工程管家数据），便于重装系统后恢复</li>
            <li>•换设备时，只需复制整个数据文件夹到新设备即可</li>
          </ul>
        </div>
        {dp.message && (
          <div className={`rounded-xl p-4 ${dp.message.type === 'success' ? 'bg-success-50 border border-success-200 text-success-700' : 'bg-danger-50 border border-danger-200 text-danger-700'}`}>
            <Icon name={dp.message.type === 'success' ? 'Edit3' : 'HelpCircle'} size={16} className="inline" />{dp.message.text}
          </div>
        )}
      </div>
      {ConfirmDialog}
    </div>
  )
}